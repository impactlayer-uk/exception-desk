const samples = {
  routine: 'Hi, this is Mara at the fictional Birch Lane workshop in Bridgend. Our back-room tap has been dripping for a week. The postcode is CF31 1AA. Could someone look at it next week? You can email me with the next available options.',
  missing: 'Hello, we need someone to look at a faulty boiler in our shop. It is not an emergency, but we would like a quote soon. I have not put the address or a contact method in this note.',
  urgent: 'There are sparks coming from a socket and we can smell gas in the fictional workshop in Pontypridd. The postcode is CF37 1AA. Please call me. Can you book someone right now?'
};

const note = document.querySelector('#note');
const count = document.querySelector('#count');
const status = document.querySelector('#status');
const analyse = document.querySelector('#analyse');
const $ = (selector) => document.querySelector(selector);

function setSample(key) {
  note.value = samples[key];
  count.textContent = `${note.value.length} / 1,200`;
  document.querySelectorAll('.scenario').forEach((button) => button.classList.toggle('active', button.dataset.scenario === key));
  status.textContent = 'Ready for a fictional case.';
}

function put(selector, value) { $(selector).textContent = String(value ?? 'Not established'); }
function list(selector, items, emptyText) {
  const parent = $(selector);
  parent.replaceChildren();
  for (const item of items?.length ? items : [emptyText]) {
    const li = document.createElement('li');
    li.textContent = item;
    parent.append(li);
  }
}

function render(data) {
  $('#empty').hidden = true;
  $('#result-content').hidden = false;
  const route = data.assessment.route;
  const routeNode = $('#route');
  routeNode.textContent = route;
  routeNode.dataset.route = route;
  put('#route-icon', route === 'ESCALATE' ? '!' : route === 'CLARIFY' ? '?' : '✓');
  put('#model-name', data.model);
  put('#fact-request', data.extracted.request);
  put('#fact-location', data.assessment.verifiedLocation || 'Not established in source');
  put('#fact-urgency', data.extracted.urgency);
  list('#evidence-list', data.assessment.evidence.map((item) => `“${item}”`), 'No exact source quote was returned.');
  const checks = $('#checks');
  checks.replaceChildren();
  for (const check of data.assessment.checks) {
    const row = document.createElement('div');
    row.className = `check ${check.result}`;
    const marker = document.createElement('span');
    marker.textContent = check.result === 'pass' ? '✓' : check.result === 'escalate' ? '!' : '?';
    const copy = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = check.label;
    const detail = document.createElement('p');
    detail.textContent = check.detail;
    copy.append(title, detail);
    row.append(marker, copy);
    checks.append(row);
  }
  list('#blockers', data.assessment.blockers, 'No blocker found by these fictional policy checks. A human still reviews the case.');
  put('#reply', data.assessment.reply);
  status.textContent = `Live inference complete. ${route.toLowerCase()} route shown for human review.`;
}

document.querySelectorAll('.scenario').forEach((button) => button.addEventListener('click', () => setSample(button.dataset.scenario)));
note.addEventListener('input', () => { count.textContent = `${note.value.length} / 1,200`; document.querySelectorAll('.scenario').forEach((button) => button.classList.remove('active')); });
analyse.addEventListener('click', async () => {
  const value = note.value.trim();
  if (value.length < 20) { status.textContent = 'Add at least 20 characters of fictional case detail.'; return; }
  analyse.disabled = true;
  analyse.textContent = 'Analysing…';
  status.textContent = 'Asking the live NVIDIA model, then applying fixed policy checks…';
  try {
    const response = await fetch('/api/analyse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ note: value }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Analysis failed.');
    render(data);
  } catch (error) { status.textContent = error instanceof Error ? error.message : 'Analysis failed.'; }
  finally { analyse.disabled = false; analyse.innerHTML = 'Analyse with live model <b>↗</b>'; }
});
setSample('routine');
