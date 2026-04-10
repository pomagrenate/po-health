/* graph.js — Drug-Disease knowledge graph (KV adjacency list) */

import { api }     from './api.js';
import { escHtml } from './utils.js';

export function setupGraph() {
  document.getElementById('graph-lookup-btn').addEventListener('click', lookupDrug);
  document.getElementById('graph-seed-btn').addEventListener('click',   seedGraph);
}

async function lookupDrug() {
  const drug = document.getElementById('graph-drug-input').value.trim();
  const el   = document.getElementById('graph-results');
  if (!drug) return;

  const data = await api.graphLookup(drug).then(r => r.json()).catch(() => null);
  if (!data) { el.innerHTML = '<p class="state-msg">Request failed.</p>'; return; }

  if (!data.edges?.length) {
    el.innerHTML = `<p class="state-msg">No graph edges found for "<strong>${escHtml(data.drug)}</strong>". Try seeding first.</p>`;
    return;
  }

  // Group edges by relation type
  const grouped = {};
  data.edges.forEach(e => { (grouped[e.relation] ??= []).push(e.target); });

  el.innerHTML = `
    <div class="dashboard-card">
      <h3>${escHtml(data.drug)}</h3>
      ${Object.entries(grouped).map(([rel, targets]) => `
        <div style="margin-bottom:0.5rem">
          <span class="badge badge-form">${escHtml(rel)}</span>
          <ul style="margin:0.25rem 0 0 1rem">
            ${targets.map(t => `<li>${escHtml(t)}</li>`).join('')}
          </ul>
        </div>`).join('')}
    </div>`;
}

async function seedGraph() {
  const btn = document.getElementById('graph-seed-btn');
  btn.disabled    = true;
  btn.textContent = 'Seeding…';

  try {
    const data = await api.graphSeed().then(r => r.json());
    alert(`Seeded ${data.drugs_processed} drugs into the knowledge graph.`);
  } catch (e) {
    alert('Seed failed: ' + e.message);
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Seed from Drug DB';
  }
}
