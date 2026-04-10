/* search.js — Drug search, result rendering, and JSON export */

import { state }                         from './state.js';
import { api }                           from './api.js';
import { drugCard, attachCardListeners } from './cards.js';
import { toggleBookmark }                from './bookmarks.js';
import { updateResearchHistory }         from './history.js';

export function setupSearch() {
  document.getElementById('search-form').addEventListener('submit', e => {
    e.preventDefault();
    doSearch();
  });

  const exportBtn = document.getElementById('export-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => exportResults());
  }
}

export async function doSearch() {
  const queryInput = document.getElementById('query-input');
  const query      = queryInput.value.trim();
  if (!query) return;

  const searchBtn = document.getElementById('search-btn');
  searchBtn.disabled = true;
  setLoading();

  try {
    const res = await api.search({
      query,
      filters:          { ...state.activeFilters },
      top_k:            12,
      patient_friendly: document.getElementById('patient-friendly-toggle')?.checked ?? false,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || res.statusText);
    }

    const drugs = await res.json();
    state.resultsArea.length = 0;
    state.resultsArea.push(...drugs);

    const dict       = state.translations[state.currentLang];
    const resultsGrid = document.getElementById('results-grid');
    const statusBar   = document.getElementById('status-bar');

    if (!drugs.length) {
      resultsGrid.innerHTML = `<p class="state-msg">${dict?.no_results ?? 'No results.'}</p>`;
    } else {
      statusBar.textContent  = `${drugs.length} ${dict?.results_for ?? 'results for'} "${query}"`;
      resultsGrid.innerHTML  = drugs.map(d => drugCard(d)).join('');
      attachCardListeners(resultsGrid, {
        onOpen:     id => window.openDetail(id),
        onBookmark: (id, btn) => toggleBookmark(id, btn),
      });
    }

    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) exportBtn.style.display = drugs.length ? 'block' : 'none';

    updateResearchHistory();
  } catch (e) {
    document.getElementById('status-bar').textContent   = `Error: ${e.message}`;
    document.getElementById('results-grid').innerHTML   = '<p class="state-msg">Something went wrong. Check the server logs.</p>';
  } finally {
    searchBtn.disabled = false;
  }
}

function setLoading() {
  document.getElementById('status-bar').textContent = 'Searching…';
  document.getElementById('results-grid').innerHTML = `
    <div class="state-msg" style="grid-column:1/-1">
      <div class="spinner"></div><br>Retrieving matching drugs…
    </div>`;
}

async function exportResults() {
  const query = document.getElementById('query-input').value.trim();
  if (!query) return;

  try {
    const res  = await api.export({
      query,
      filters:          { ...state.activeFilters },
      top_k:            50,
      patient_friendly: document.getElementById('patient-friendly-toggle')?.checked ?? false,
    });
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), {
      href: url, download: `po_health_search_${Date.now()}.json`,
    });
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (e) {
    alert('Export failed: ' + e.message);
  }
}
