/* state.js — Shared mutable application state */

export const state = {
  translations: {},
  currentLang: 'en',
  activeFilters: { dose_form: '', status: '', route: '', ingredient: '' },
  resultsArea: [],   // cache for JSON export
};
