import { extractRequest } from './nebius.mjs';
import { assess } from './policy.mjs';

const allowedAssets = new Set(['/', '/index.html', '/app.js', '/styles.css']);
const maxBodyBytes = 4_096;
// A durable ceiling prevents an unattended public demo from using pay-as-you-go
// inference after the trial credit expires. Failed attempts count too.
const lifetimeLimit = 20;

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

async function readSmallBody(request) {
  if (!request.body) return '';
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let body = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBodyBytes) {
      await reader.cancel();
      throw new Error('too-large');
    }
    body += decoder.decode(value, { stream: true });
  }
  return body + decoder.decode();
}

export async function handleRequest(request, env, { fetcher = fetch, now = Date.now } = {}) {
  const url = new URL(request.url);
  if (request.method === 'GET' && allowedAssets.has(url.pathname)) {
    // HTML handling is disabled so this explicit root rewrite returns the asset,
    // rather than redirecting /index.html back to /.
    const assetUrl = new URL(url);
    if (assetUrl.pathname === '/') assetUrl.pathname = '/index.html';
    const asset = await env.ASSETS.fetch(new Request(assetUrl, request));
    const response = new Response(asset.body, asset);
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Content-Security-Policy', "default-src 'self'; style-src 'self'; script-src 'self'; base-uri 'none'; form-action 'none'");
    return response;
  }
  if (request.method !== 'POST' || url.pathname !== '/api/analyse') return json(404, { error: 'Not found.' });
  if (!env.NEBIUS_API_KEY || !env.NEBIUS_MODEL) return json(503, { error: 'Live Nebius inference is not configured yet.' });

  let input;
  try { input = JSON.parse(await readSmallBody(request)); }
  catch (error) { return json(error?.message === 'too-large' ? 413 : 400, { error: error?.message === 'too-large' ? 'The note is too long.' : 'Invalid request.' }); }
  const note = typeof input?.note === 'string' ? input.note.trim() : '';
  if (note.length < 20 || note.length > 1_200) return json(400, { error: 'Use a fictional note between 20 and 1,200 characters.' });

  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  const limited = await env.PER_IP.limit({ key: ip });
  if (!limited.success) return json(429, { error: 'Please wait before analysing another case.' });

  const counted = await env.USAGE.prepare('INSERT INTO inference_usage(day, requests) VALUES (?1, 1) ON CONFLICT(day) DO UPDATE SET requests = requests + 1 WHERE requests < ?2 RETURNING requests')
    .bind('__lifetime__', lifetimeLimit).first();
  if (!counted) return json(429, { error: 'The live demo inference budget is exhausted.' });

  try {
    const result = await extractRequest(note, { apiKey: env.NEBIUS_API_KEY, model: env.NEBIUS_MODEL, fetcher });
    return json(200, { ...result, assessment: assess(note, result.extracted), live: true });
  } catch (error) {
    // Do not include third-party response bodies, customer notes, or secrets in public errors.
    return json(502, { error: error instanceof Error ? error.message : 'Live inference failed.' });
  }
}

export default { fetch: handleRequest };
