/* i18n.js — Translation loading and UI string updates */

import { state } from './state.js';

export async function loadTranslations() {
  try {
    const res = await fetch('static/translations.json');
    state.translations = await res.json();
  } catch (e) {
    console.error('Failed to load translations:', e);
  }
}

export function translateUI() {
  const dict = state.translations[state.currentLang];
  if (!dict) return;

  document.getElementById('main-title').textContent              = dict.title;
  document.getElementById('query-input').placeholder            = dict.search_placeholder;
  document.getElementById('search-btn').textContent             = dict.search_btn;
  document.querySelector('.toggle-label').textContent           = dict.patient_mode;
  document.querySelector('.sidebar h2').textContent             = dict.filters;
  document.querySelector('#dose-form-group h3').textContent     = dict.dose_form;
  document.querySelector('#status-group h3').textContent        = dict.status;
  document.querySelector('#route-group h3').textContent         = dict.route;
  document.querySelector('.filter-group:last-of-type h3').textContent = dict.active_ingredient;
  document.getElementById('txt-recent-research').textContent    = dict.recent_research;
  document.getElementById('clear-filters').textContent         = dict.clear_filters;

  const exportBtn = document.getElementById('export-btn');
  if (exportBtn) exportBtn.textContent = dict.export_btn;

  const msg = document.getElementById('results-grid')?.querySelector('.state-msg');
  if (msg && !document.getElementById('query-input').value.trim()) {
    msg.textContent = dict.empty_state;
  }
}

/** Wire up the language selector. Accepts a callback to re-run the active search. */
export function setupI18n(onLangChange) {
  const langSelect = document.getElementById('lang-select');
  langSelect.addEventListener('change', () => {
    state.currentLang = langSelect.value;
    translateUI();
    onLangChange();
  });
}
