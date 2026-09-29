// Synthetic service policy: final routing is determined here, never by model prose.
const serviceArea = ['Bridgend', 'Pontypridd'];
const urgentPattern = /\b(gas smell|smell of gas|sparks?|sparking|flood(?:ing|ed)?|burst pipe|live wire|electric shock|carbon monoxide)\b/i;
const consentPattern = /\b(please (?:call|email|reply|contact) me|you can (?:call|email|reply|contact) me|(?:okay|ok) to (?:call|email|contact) me)\b/i;

const text = (value, max = 180) => String(value ?? '').trim().slice(0, max);
const cleanList = (value) => Array.isArray(value) ? value.map((item) => text(item, 120)).filter(Boolean).slice(0, 5) : [];

export function parseModelOutput(content) {
  const candidate = String(content ?? '').trim();
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('The model did not return a JSON object.');
  let payload;
  try { payload = JSON.parse(candidate.slice(start, end + 1)); }
  catch { throw new Error('The model returned invalid JSON.'); }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('The model returned an invalid object.');
  return {
    request: text(payload.request),
    location: text(payload.location, 80),
    urgency: ['routine', 'urgent', 'unknown'].includes(payload.urgency) ? payload.urgency : 'unknown',
    missingFacts: cleanList(payload.missingFacts),
    evidence: cleanList(payload.evidence),
    suggestedReply: text(payload.suggestedReply, 600),
  };
}

export function assess(note, extracted) {
  const message = String(note ?? '').slice(0, 1200);
  const source = message.toLocaleLowerCase('en-GB');
  const verifiedLocation = extracted.location && source.includes(extracted.location.toLocaleLowerCase('en-GB'))
    ? extracted.location
    : null;
  const verifiedEvidence = extracted.evidence.filter((quote) => source.includes(quote.toLocaleLowerCase('en-GB')));
  const location = serviceArea.find((area) => new RegExp(`\\b${area}\\b`, 'i').test(message));
  const urgent = urgentPattern.test(message) || extracted.urgency === 'urgent';
  const consent = consentPattern.test(message);
  const checks = [
    { label: 'Service area', result: location ? 'pass' : 'needs review', detail: location ? `${location} is in the fictional service area.` : 'No supported service town confirmed in the source note.' },
    { label: 'Urgent safety signal', result: urgent ? 'escalate' : 'pass', detail: urgent ? 'A possible urgent issue needs a human response.' : 'No urgent signal detected by the model or safety keywords.' },
    { label: 'Contact consent', result: consent ? 'pass' : 'needs review', detail: consent ? 'The note explicitly invites contact.' : 'The note does not explicitly invite outbound contact.' },
  ];

  const blockers = [];
  if (urgent) blockers.push('Human safety triage before any routine booking or drafted promise.');
  if (!location) blockers.push('Confirm the service location and coverage.');
  if (!consent) blockers.push('Confirm contact permission before any outbound message.');
  for (const fact of extracted.missingFacts) {
    if (!blockers.some((item) => item.toLowerCase().includes(fact.toLowerCase()))) blockers.push(fact);
  }

  const route = urgent ? 'ESCALATE' : blockers.length ? 'CLARIFY' : 'READY FOR REVIEW';
  const reply = urgent
    ? 'Human-only note: prioritise this possible safety issue. Do not promise an appointment or send an automated reply.'
    : !location
      ? 'Draft for human review: Thanks for getting in touch. Could you confirm the town and postcode for the job? We will check coverage before suggesting a next step.'
      : 'Draft for human review: Thanks for the details. We can review the request and come back with the next available options. No appointment has been booked.';

  return {
    route, checks, blockers: blockers.slice(0, 8), reply,
    modelSuggestion: extracted.suggestedReply || 'No suggestion returned.',
    evidence: verifiedEvidence,
    verifiedLocation,
    supportedTown: location ?? null,
    messageSent: false,
    bookingCreated: false,
  };
}
