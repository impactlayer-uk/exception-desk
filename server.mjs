import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractRequest } from './src/nebius.mjs';
import { assess } from './src/policy.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');
const port = Number(process.env.PORT || 4174);
const allowed = new Map([['/', ['index.html', 'text/html; charset=utf-8']], ['/app.js', ['app.js', 'text/javascript; charset=utf-8']], ['/styles.css', ['styles.css', 'text/css; charset=utf-8']]]);
const requestTimes = new Map();
const dailyCount = new Map();

const json = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(body));
};

function allowCall(ip) {
  const now = Date.now();
  const recent = (requestTimes.get(ip) ?? []).filter((time) => now - time < 3_600_000);
  const day = new Date(now).toISOString().slice(0, 10);
  const used = dailyCount.get(day) ?? 0;
  for (const key of dailyCount.keys()) if (key !== day) dailyCount.delete(key);
  if (recent.length >= 6 || used >= 100) return false;
  recent.push(now);
  requestTimes.set(ip, recent);
  dailyCount.set(day, used + 1);
  return true;
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && allowed.has(req.url)) {
    const [filename, contentType] = allowed.get(req.url);
    const data = await fs.readFile(path.join(root, filename));
    res.writeHead(200, { 'Content-Type': contentType, 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'self'; style-src 'self'; script-src 'self'; base-uri 'none'; form-action 'none'" });
    res.end(data);
    return;
  }
  if (req.method !== 'POST' || req.url !== '/api/analyse') { json(res, 404, { error: 'Not found.' }); return; }
  if (!process.env.NEBIUS_API_KEY || !process.env.NEBIUS_MODEL) { json(res, 503, { error: 'Live Nebius inference is not configured yet.' }); return; }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 4_096) { json(res, 413, { error: 'The note is too long.' }); return; }
    chunks.push(chunk);
  }
  let input;
  try { input = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { json(res, 400, { error: 'Invalid request.' }); return; }
  const note = typeof input?.note === 'string' ? input.note.trim() : '';
  if (note.length < 20 || note.length > 1_200) { json(res, 400, { error: 'Use a fictional note between 20 and 1,200 characters.' }); return; }
  if (!allowCall(req.socket.remoteAddress ?? 'unknown')) { json(res, 429, { error: 'Demo request limit reached. Please try later.' }); return; }
  try {
    const result = await extractRequest(note, { apiKey: process.env.NEBIUS_API_KEY, model: process.env.NEBIUS_MODEL });
    json(res, 200, { ...result, assessment: assess(note, result.extracted), live: true });
  } catch (error) {
    // Never log notes, model text or credentials in the public demo.
    json(res, 502, { error: error instanceof Error ? error.message : 'Live inference failed.' });
  }
});

server.listen(port, '127.0.0.1', () => console.log(`Exception Desk: http://127.0.0.1:${port}`));
