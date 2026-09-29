import test from 'node:test';
import assert from 'node:assert/strict';
import { assess, parseModelOutput } from '../src/policy.mjs';
import { extractRequest } from '../src/nebius.mjs';

const extracted = { request: 'Check a socket', location: 'Pontypridd', urgency: 'routine', missingFacts: [], evidence: ['socket'], suggestedReply: 'We can come today.' };

test('safety words in the source override a routine model classification and a risky model suggestion', () => {
  const result = assess('Sparks from a socket in Pontypridd. Please call me and book someone now.', extracted);
  assert.equal(result.route, 'ESCALATE');
  assert.equal(result.checks[1].result, 'escalate');
  assert.match(result.reply, /Human-only/);
  assert.equal(result.messageSent, false);
  assert.equal(result.bookingCreated, false);
  assert.equal(result.modelSuggestion, 'We can come today.');
});

test('a model cannot invent service area or contact permission', () => {
  const result = assess('My boiler is broken at our shop. Please send a quote soon.', { ...extracted, location: 'Pontypridd' });
  assert.equal(result.route, 'CLARIFY');
  assert.equal(result.supportedTown, null);
  assert.equal(result.verifiedLocation, null);
  assert.equal(result.checks[0].result, 'needs review');
  assert.equal(result.checks[2].result, 'needs review');
});

test('invented source quotations are removed from the judge-visible evidence trail', () => {
  const result = assess('Our tap leaks in Bridgend. You can email me with options.', {
    ...extracted,
    location: 'Bridgend',
    evidence: ['tap leaks', 'we guarantee a visit today'],
  });
  assert.deepEqual(result.evidence, ['tap leaks']);
  assert.equal(result.verifiedLocation, 'Bridgend');
});

test('a complete routine synthetic note reaches human review without creating a booking', () => {
  const result = assess('Our tap leaks in Bridgend. You can email me with options.', { ...extracted, urgency: 'routine' });
  assert.equal(result.route, 'READY FOR REVIEW');
  assert.equal(result.blockers.length, 0);
  assert.equal(result.bookingCreated, false);
});

test('the Nebius adapter makes a runtime chat call and parses fenced JSON without exposing the key in its return', async () => {
  let sent;
  const fetcher = async (url, options) => {
    sent = { url, headers: options.headers, body: JSON.parse(options.body) };
    return { ok: true, json: async () => ({ model: 'nvidia/example-verified-model', choices: [{ message: { content: '```json\n{"request":"Check a tap","location":"Bridgend","urgency":"routine","missingFacts":[],"evidence":["tap"],"suggestedReply":"Thanks"}\n```' } }], usage: { total_tokens: 72 } }) };
  };
  const result = await extractRequest('Our fictional tap is dripping in Bridgend. You can email me.', { apiKey: 'TEST_KEY_ONLY', model: 'nvidia/example-verified-model', fetcher });
  assert.equal(sent.url, 'https://api.tokenfactory.nebius.com/v1/chat/completions');
  assert.equal(sent.headers.Authorization, 'Bearer TEST_KEY_ONLY');
  assert.equal(sent.body.model, 'nvidia/example-verified-model');
  assert.equal(result.extracted.request, 'Check a tap');
  assert.doesNotMatch(JSON.stringify(result), /TEST_KEY_ONLY/);
});

test('invalid model output fails closed', () => assert.throws(() => parseModelOutput('Sure, I booked it for you.'), /JSON object/));
