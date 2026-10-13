// This page works as HTML + CSS first. JavaScript adds two small enhancements.
const tipButton = document.querySelector('#tip-button');
const tipText = document.querySelector('#tip-text');

tipButton.addEventListener('click', () => {
  const show = tipText.hidden;
  tipText.hidden = !show;
  tipButton.setAttribute('aria-expanded', String(show));
  tipButton.textContent = show ? 'Hide the kitchen tip' : 'Show a kitchen tip';
});

async function showChivesData() {
  const status = document.querySelector('#data-status');
  const details = document.querySelector('#json-details');

  try {
    const response = await fetch('data/herbs.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const herbs = await response.json();
    if (!Array.isArray(herbs)) throw new Error('Expected a JSON array');
    const chives = herbs.find(herb => herb.name?.toLowerCase() === 'chives');
    if (!chives) throw new Error('Chives was not found in herbs.json');

    // Use textContent rather than inserting raw HTML from JSON.
    for (const [label, key] of [
      ['Name', 'name'],
      ['Latin name', 'latin'],
      ['Use', 'use'],
      ['Life cycle', 'life']
    ]) {
      const row = document.createElement('div');
      const term = document.createElement('dt');
      const value = document.createElement('dd');
      term.textContent = label;
      value.textContent = String(chives[key] ?? 'Not specified');
      row.append(term, value);
      details.append(row);
    }
    details.hidden = false;
    status.textContent = 'Chives data loaded from data/herbs.json.';
  } catch (error) {
    status.textContent = `Could not load the original JSON data: ${error.message}`;
  }
}

showChivesData();
