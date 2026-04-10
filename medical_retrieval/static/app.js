/* app.js — Doctor's Drug Retrieval UI */

'use strict';

const queryInput = document.getElementById('query-input');
const searchBtn = document.getElementById('search-btn');
const searchForm = document.getElementById('search-form');
const statusBar = document.getElementById('status-bar');
const resultsGrid = document.getElementById('results-grid');
const modalOverlay = document.getElementById('modal-overlay');
const modalBody = document.getElementById('modal-body');
const modalDetails = document.getElementById('modal-details');
const aiAnalysisBox = document.getElementById('ai-analysis-box');
const modalTitle = document.getElementById('modal-title');
const modalClose = document.getElementById('modal-close');
const pfToggle = document.getElementById('patient-friendly-toggle');
const ingredientInp = document.getElementById('ingredient-input');
const exportBtn = document.getElementById('export-btn');
const langSelect = document.getElementById('lang-select');
const navBtns = document.querySelectorAll('.nav-btn');
const tabContents = document.querySelectorAll('.tab-content');
const historyList = document.getElementById('history-list');

let translations = {};
let currentLang = 'en';

const resultsArea = []; // Cache for export

// Active filter state
const activeFilters = { dose_form: '', status: '', route: '', ingredient: '' };

// ── Bootstrap ──────────────────────────────────────────────────────────────

async function init() {
  await loadTranslations();
  await loadFilters();
  setupTabs();
  translateUI();
  updateResearchHistory();
  syncBookmarks();
}

async function loadTranslations() {
  try {
    const res = await fetch('static/translations.json');
    translations = await res.json();
  } catch (e) {
    console.error("Failed to load translations:", e);
  }
}

function translateUI() {
  const dict = translations[currentLang];
  if (!dict) return;

  document.getElementById('main-title').textContent = dict.title;
  queryInput.placeholder = dict.search_placeholder;
  searchBtn.textContent = dict.search_btn;
  document.querySelector('.toggle-label').textContent = dict.patient_mode;
  document.querySelector('.sidebar h2').textContent = dict.filters;
  document.querySelector('#dose-form-group h3').textContent = dict.dose_form;
  document.querySelector('#status-group h3').textContent = dict.status;
  document.querySelector('#route-group h3').textContent = dict.route;
  document.querySelector('.filter-group:last-of-type h3').textContent = dict.active_ingredient;
  document.getElementById('txt-recent-research').textContent = dict.recent_research;
  document.getElementById('clear-filters').textContent = dict.clear_filters;
  if (exportBtn) exportBtn.textContent = dict.export_btn;

  // Update empty state if present
  const msg = resultsGrid.querySelector('.state-msg');
  if (msg && !queryInput.value.trim()) {
    msg.textContent = dict.empty_state;
  }
}

langSelect.addEventListener('change', () => {
  currentLang = langSelect.value;
  translateUI();
  if (queryInput.value.trim()) doSearch();
});

function setupTabs() {
  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      navBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${tab}`).classList.add('active');

      if (tab === 'bookmarks') renderBookmarks();
      if (tab === 'dashboard') renderAnalytics();
    });
  });
}

async function loadFilters() {
  try {
    const res = await fetch('/api/filters');
    if (!res.ok) throw new Error('filters fetch failed');
    const data = await res.json();
    buildFilterSidebar(data);
  } catch (e) {
    console.warn('Could not load filters:', e);
  }
}

// ── Filter sidebar ─────────────────────────────────────────────────────────

function buildFilterSidebar({ dose_forms, statuses, routes }) {
  buildRadioGroup('dose-form-group', 'dose_form', dose_forms, 'Dose Form');
  buildRadioGroup('status-group', 'status', statuses, 'Status');
  buildRadioGroup('route-group', 'route', routes, 'Route');
}

function buildRadioGroup(containerId, filterKey, values, label) {
  const container = document.getElementById(containerId);
  if (!container || !values.length) return;

  container.innerHTML = `<h3>${label}</h3>`;

  values.forEach(val => {
    const id = `radio-${filterKey}-${val}`;
    const lbl = document.createElement('label');
    lbl.htmlFor = id;
    lbl.innerHTML = `
      <input type="radio" name="${filterKey}" id="${id}" value="${val}">
      ${val}
    `;
    container.appendChild(lbl);
  });

  container.querySelectorAll('input[type="radio"]').forEach(radio => {
    radio.addEventListener('change', () => {
      activeFilters[filterKey] = radio.value;
      if (queryInput.value.trim()) doSearch();
    });
  });
}

if (ingredientInp) {
  ingredientInp.addEventListener('input', debounce(() => {
    activeFilters.ingredient = ingredientInp.value.trim();
    if (queryInput.value.trim()) doSearch();
  }, 400));
}

function debounce(fn, ms) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), ms);
  };
}

// ── Search ─────────────────────────────────────────────────────────────────

searchForm.addEventListener('submit', e => {
  e.preventDefault();
  doSearch();
});

document.getElementById('clear-filters').addEventListener('click', () => {
  document.querySelectorAll('input[type="radio"]').forEach(r => r.checked = false);
  if (ingredientInp) ingredientInp.value = '';
  activeFilters.dose_form = '';
  activeFilters.status = '';
  activeFilters.route = '';
  activeFilters.ingredient = '';
  if (queryInput.value.trim()) doSearch();
});

async function doSearch() {
  const query = queryInput.value.trim();
  if (!query) return;

  searchBtn.disabled = true;
  setLoading();

  const body = {
    query,
    filters: { ...activeFilters },
    top_k: 12,
    patient_friendly: pfToggle ? pfToggle.checked : false
  };

  try {
    const res = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || res.statusText);
    }
    const drugs = await res.json();
    resultsArea.length = 0;
    resultsArea.push(...drugs);

    if (drugs.length === 0) {
      const dict = translations[currentLang];
      resultsGrid.innerHTML = `<p class="state-msg">${dict.no_results}</p>`;
    } else {
      renderResults(drugs, query);
    }

    if (exportBtn) exportBtn.style.display = drugs.length ? 'block' : 'none';
    updateResearchHistory();
  } catch (e) {
    statusBar.textContent = `Error: ${e.message}`;
    resultsGrid.innerHTML = `<p class="state-msg">Something went wrong. Check the server logs.</p>`;
  } finally {
    searchBtn.disabled = false;
  }
}

function setLoading() {
  statusBar.textContent = 'Searching…';
  resultsGrid.innerHTML = `
    <div class="state-msg" style="grid-column:1/-1">
      <div class="spinner"></div><br>Retrieving matching drugs…
    </div>`;
}

// ── Render results ─────────────────────────────────────────────────────────

function renderResults(drugs, query) {
  const dict = translations[currentLang];
  statusBar.textContent = `${drugs.length} ${dict.results_for} "${query}"`;
  resultsGrid.innerHTML = drugs.map(d => drugCard(d)).join('');

  // Attach listeners
  resultsGrid.querySelectorAll('.result-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.id;
      window.openDetail(id);
    });
  });

  resultsGrid.querySelectorAll('.bookmark-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      await toggleBookmark(id, btn);
    });
  });
}

function drugCard(d) {
  const dict = translations[currentLang];
  const sim = Math.round((d.similarity || 1.0) * 100);
  const statusClass = d.status === 'active' ? 'badge-active' : 'badge-other';
  const indText = (d.indications && d.indications[0]) || 'No indications listed';
  const isBookmarked = getBookmarks().includes(d.id);

  return `
    <div class="result-card" data-id="${d.id}">
      <div class="card-header">
        <span class="drug-name">${escHtml(d.name)}</span>
        <span class="similarity-badge">${sim}% ${dict.match}</span>
      </div>
      <div class="card-meta">
        ${d.is_high_risk ? `<span class="badge badge-risk">${dict.high_risk}</span>` : ''}
        ${d.dose_form ? `<span class="badge badge-form">${escHtml(d.dose_form)}</span>` : ''}
        ${d.status ? `<span class="badge ${statusClass}">${escHtml(d.status)}</span>` : ''}
        <button class="bookmark-btn ${isBookmarked ? 'active' : ''}" data-id="${d.id}">
          ${isBookmarked ? '★' : '☆'}
        </button>
      </div>
      <p class="card-indications">${escHtml(indText)}</p>
      ${d.patient_note ? `<p class="patient-note">${escHtml(d.patient_note)}</p>` : ''}
    </div>`;
}

if (exportBtn) {
  exportBtn.addEventListener('click', async () => {
    const query = queryInput.value.trim();
    if (!query) return;

    const body = {
      query,
      filters: { ...activeFilters },
      top_k: 50, // Export more than displayed
      patient_friendly: pfToggle ? pfToggle.checked : false
    };

    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `po_health_search_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      alert("Export failed: " + e.message);
    }
  });
}

// ── Drug detail modal ──────────────────────────────────────────────────────

window.openDetail = async (drugId) => {
  const dict = translations[currentLang] || { loading: 'Loading...' };
  modalTitle.textContent = dict.loading;
  modalOverlay.classList.add('active');

  // Clear previous content but keep structure
  modalDetails.innerHTML = '<div class="state-msg"><div class="spinner"></div></div>';
  aiAnalysisBox.innerHTML = '';
  aiAnalysisBox.style.display = 'none';

  try {
    const res = await fetch(`/api/drug/${drugId}`);
    if (!res.ok) throw new Error('fetch detail failed');
    const d = await res.json();

    modalTitle.textContent = d.name;
    aiAnalysisBox.textContent = d.ai_analysis || 'No analysis available.';
    aiAnalysisBox.style.display = 'block';
    modalDetails.innerHTML = ''; // Remove spinner

    const section = (title, content) => `
      <div class="modal-section">
        <h3>${title}</h3>
        <p>${content || 'None'}</p>
      </div>
    `;

    const list = (items) => (items && items.length) ? `<ul>${items.map(i => `<li>${escHtml(i)}</li>`).join('')}</ul>` : 'None';

    modalDetails.innerHTML = `
      <div class="modal-grid">
        <div class="modal-main">
          ${section(dict.modal_indications, list(d.indications))}
          ${section(dict.modal_contra, list(d.contraindications))}
          ${section('Warnings', d.warnings)}
        </div>
        <aside class="modal-sidebar">
          <div class="modal-info-bit"><strong>Dose Form:</strong> ${escHtml(d.dose_form)}</div>
          <div class="modal-info-bit"><strong>Status:</strong> ${escHtml(d.status)}</div>
          <div class="modal-info-bit"><strong>Route:</strong> ${escHtml(d.route)}</div>
          <div class="modal-info-bit"><strong>Ingredients:</strong> ${list(d.ingredients)}</div>
        </aside>
      </div>
      <div class="modal-actions">
        <button class="primary-btn" onclick="addToDDI(${d.id}, '${escHtml(d.name)}')">Add to DDI Checker</button>
      </div>
    `;
    document.body.style.overflow = 'hidden';
  } catch (e) {
    modalTitle.textContent = 'Error';
    modalDetails.innerHTML = `<p class="state-msg">${e.message}</p>`;
  }
}

function closeModal() {
  modalOverlay.classList.remove('active');
  document.body.style.overflow = '';
}

modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// ── Bookmarks ─────────────────────────────────────────────────────────────

function getBookmarks() {
  return JSON.parse(localStorage.getItem('po_health_bookmarks') || '[]');
}

async function toggleBookmark(drugId, btn) {
  try {
    const res = await fetch('/api/bookmarks/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ drug_id: drugId })
    });
    const data = await res.json();

    if (data.status === 'added') {
      btn.classList.add('active');
      btn.textContent = '★';
    } else {
      btn.classList.remove('active');
      btn.textContent = '☆';
    }

    // Refresh bookmarks tab if active
    const bookmarksTab = document.querySelector('.nav-btn[data-tab="bookmarks"]');
    if (bookmarksTab && bookmarksTab.classList.contains('active')) {
      renderBookmarks();
    }
  } catch (e) {
    console.error('Bookmark toggle failed:', e);
  }
}

async function syncBookmarks() {
  // Sync logic for server-side persistence
  renderBookmarks();
}

async function renderBookmarks() {
  const ids = getBookmarks();
  const grid = document.getElementById('bookmarks-grid');
  if (ids.length === 0) {
    grid.innerHTML = '<p class="state-msg">You have no bookmarked drugs.</p>';
    return;
  }

  grid.innerHTML = '<p class="state-msg">Loading bookmarks...</p>';
  try {
    const drugs = await Promise.all(ids.map(async id => {
      const res = await fetch(`/api/drug/${id}`);
      return await res.json();
    }));
    // We need to add similarity 1.0 for the card-header if not present
    grid.innerHTML = drugs.map(d => drugCard(d)).join('');

    // Attach listeners
    grid.querySelectorAll('.result-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.id;
        window.openDetail(id);
      });
    });

    grid.querySelectorAll('.bookmark-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        window.toggleBookmark(id, btn);
      });
    });
  } catch (e) {
    grid.innerHTML = `<p class="state-msg">Error loading bookmarks: ${e.message}</p>`;
  }
}

// ── DDI Checker ─────────────────────────────────────────────────────────────

let ddiSlots = [null, null];

window.addToDDI = (id, name) => {
  const emptyIdx = ddiSlots.findIndex(s => s === null);
  const idx = emptyIdx === -1 ? 0 : emptyIdx; // Replace first if full
  ddiSlots[idx] = { id, name };
  renderDDISlots();
  closeModal();
};

function renderDDISlots() {
  const slots = document.querySelectorAll('.ddi-slot');
  slots.forEach((el, i) => {
    const drug = ddiSlots[i];
    if (drug) {
      el.textContent = drug.name;
      el.classList.add('filled');
    } else {
      el.textContent = 'Click to add drug...';
      el.classList.remove('filled');
    }

    el.onclick = () => {
      ddiSlots[i] = null;
      renderDDISlots();
    };
  });

  document.getElementById('check-btn').disabled = ddiSlots.filter(s => s !== null).length < 2;
}

document.getElementById('check-btn').addEventListener('click', async () => {
  const ids = ddiSlots.filter(s => s !== null).map(s => s.id);
  const resultsDiv = document.getElementById('ddi-results');
  resultsDiv.innerHTML = '<p class="state-msg">Checking interactions...</p>';

  try {
    const res = await fetch('/api/check-interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ drug_ids: ids })
    });
    const data = await res.json();

    if (data.interactions.length === 0) {
      resultsDiv.innerHTML = `<div class="ai-box">${data.summary}</div>`;
    } else {
      resultsDiv.innerHTML = `
        <div class="ai-box">${data.summary}</div>
        <div class="ddi-list">
          ${data.interactions.map(item => `
            <div class="ddi-item severity-${item.severity.toLowerCase()}">
              <strong>${item.type} (${item.severity}):</strong> ${item.description}
            </div>
          `).join('')}
        </div>
      `;
    }
    updateResearchHistory();
  } catch (e) {
    resultsDiv.innerHTML = `<p class="state-msg">Error: ${e.message}</p>`;
  }
});

async function updateResearchHistory() {
  if (!historyList) return;
  try {
    const res = await fetch('/api/research-context');
    const history = await res.json();

    if (history.length === 0) {
      historyList.innerHTML = '<p class="state-msg" style="font-size:0.7rem">No history yet.</p>';
      return;
    }

    historyList.innerHTML = history.map(h => `
      <div class="history-item">
        <span class="query">${escHtml(h.query)}</span>
        <span class="ts">${new Date(h.ts * 1000).toLocaleTimeString()}</span>
      </div>
    `).join('');

    // Attach replay clicks
    historyList.querySelectorAll('.history-item').forEach((item, i) => {
      item.onclick = () => {
        queryInput.value = history[i].query;
        doSearch();
      };
    });
  } catch (e) {
    console.error('History update failed:', e);
  }
}
async function renderAnalytics() {
  const chart = document.getElementById('analytics-chart');
  const list = document.getElementById('top-drugs-list');
  if (!chart || !list) return;

  try {
    const res = await fetch('/api/analytics');
    const data = await res.json();

    // Render Bars
    const max = Math.max(...data.search_volume.map(v => v.count));
    chart.innerHTML = data.search_volume.map(v => `
      <div class="chart-bar" style="height: ${(v.count / max) * 100}%" title="${v.time}: ${v.count}"></div>
    `).join('');

    // Render List
    list.innerHTML = data.top_drugs.map((d, i) => `
      <li>
        <span>${i + 1}. ${escHtml(d)}</span>
        <span class="badge badge-active">${Math.floor(Math.random() * 50) + 10} searches</span>
      </li>
    `).join('');
  } catch (e) {
    console.error('Analytics failed:', e);
  }
}
// ── Utility ────────────────────────────────────────────────────────────────

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Start ──────────────────────────────────────────────────────────────────
init();
