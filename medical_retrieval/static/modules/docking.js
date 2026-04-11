/* docking.js — 3D Molecular similarity search (USRCAT fingerprints + PomaiDB Mesh) */

import { api } from './api.js';
import { escHtml } from './utils.js';

export function setupDocking() {
    const searchBtn = document.getElementById('docking-search-btn');
    if (searchBtn) {
        searchBtn.addEventListener('click', runDockingSearch);
    }
}

async function runDockingSearch() {
    const smiles = document.getElementById('docking-smiles').value.trim();
    const filterToxic = document.getElementById('docking-filter-toxic').checked;
    const resultsEl = document.getElementById('docking-results');

    if (!smiles) {
        alert('Please enter a SMILES string.');
        return;
    }

    const btn = document.getElementById('docking-search-btn');
    btn.disabled = true;
    const originalText = btn.textContent;
    btn.textContent = 'Computing...';
    resultsEl.innerHTML = '<div class="state-msg"><div class="spinner"></div><br>Performing 3D shape alignment and toxicity filtering...</div>';

    try {
        const res = await api.dockingSearch(smiles, 10, filterToxic);
        if (!res.ok) {
            const err = await res.json().catch(() => ({ detail: res.statusText }));
            throw new Error(err.detail || res.statusText);
        }

        const data = await res.json();
        const hits = data.results || [];

        if (!hits || !hits.length) {

            resultsEl.innerHTML = '<p class="state-msg">No similar compounds found in the docking database.</p>';
            return;
        }

        resultsEl.innerHTML = hits.map(h => `
      <div class="result-card">
        <div class="card-header">
          <span class="drug-name">${escHtml(h.name || 'Unknown Compound')}</span>
          <span class="similarity-badge">${Math.round(h.similarity * 100)}% 3D Shape Match</span>
        </div>
        <p class="card-indications"><strong>SMILES:</strong> <code style="font-size:0.7rem">${escHtml(h.smiles)}</code></p>
        <div class="card-footer">
          <span class="badge ${h.is_toxic ? 'badge-risk' : 'badge-active'}">
             ${h.is_toxic ? 'Toxic' : 'Non-Toxic'}
          </span>
          <span style="font-size:0.75rem; color:var(--muted)">ID: ${h.id}</span>
        </div>
      </div>`).join('');

    } catch (e) {
        resultsEl.innerHTML = `<p class="state-msg">Search failed: ${e.message}</p>`;
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
}
