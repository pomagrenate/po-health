/* filters.js — Sidebar filter sidebar: dose form, status, route, ingredient */

import { state } from './state.js';
import { api }   from './api.js';
import { debounce } from './utils.js';

/** Callback set by app.js to trigger a new search when filters change. */
let _onFilterChange = () => {};

export function setupFilters(onFilterChange) {
  _onFilterChange = onFilterChange;

  const ingredientInp = document.getElementById('ingredient-input');
  if (ingredientInp) {
    ingredientInp.addEventListener('input', debounce(() => {
      state.activeFilters.ingredient = ingredientInp.value.trim();
      if (document.getElementById('query-input').value.trim()) _onFilterChange();
    }, 400));
  }

  document.getElementById('clear-filters').addEventListener('click', () => {
    document.querySelectorAll('input[type="radio"]').forEach(r => r.checked = false);
    if (ingredientInp) ingredientInp.value = '';
    Object.keys(state.activeFilters).forEach(k => state.activeFilters[k] = '');
    if (document.getElementById('query-input').value.trim()) _onFilterChange();
  });
}

export async function loadFilters() {
  try {
    const res = await api.filters();
    if (!res.ok) throw new Error('filters fetch failed');
    const data = await res.json();
    buildFilterSidebar(data);
  } catch (e) {
    console.warn('Could not load filters:', e);
  }
}

function buildFilterSidebar({ dose_forms, statuses, routes }) {
  buildRadioGroup('dose-form-group', 'dose_form', dose_forms, 'Dose Form');
  buildRadioGroup('status-group',    'status',    statuses,   'Status');
  buildRadioGroup('route-group',     'route',     routes,     'Route');
}

function buildRadioGroup(containerId, filterKey, values, label) {
  const container = document.getElementById(containerId);
  if (!container || !values.length) return;

  container.innerHTML = `<h3>${label}</h3>`;
  values.forEach(val => {
    const id  = `radio-${filterKey}-${val}`;
    const lbl = document.createElement('label');
    lbl.htmlFor  = id;
    lbl.innerHTML = `<input type="radio" name="${filterKey}" id="${id}" value="${val}"> ${val}`;
    container.appendChild(lbl);
  });

  container.querySelectorAll('input[type="radio"]').forEach(radio => {
    radio.addEventListener('change', () => {
      state.activeFilters[filterKey] = radio.value;
      if (document.getElementById('query-input').value.trim()) _onFilterChange();
    });
  });
}
