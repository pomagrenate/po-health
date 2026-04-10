/* app.js — Entry point: wires all modules together and boots the app */

import { loadTranslations, translateUI, setupI18n } from './modules/i18n.js';
import { loadFilters, setupFilters }                from './modules/filters.js';
import { setupTabs }                                from './modules/tabs.js';
import { setupSearch, doSearch }                    from './modules/search.js';
import { setupModal, openDetail }                   from './modules/modal.js';
import { setupBookmarks, renderBookmarks }          from './modules/bookmarks.js';
import { setupDDI, addToDDI }                       from './modules/ddi.js';
import { updateResearchHistory }                    from './modules/history.js';
import { setupDashboard }                           from './modules/dashboard.js';
import { setupGuidelines }                          from './modules/guidelines.js';
import { setupPatients }   from './modules/patients.js';
import { setupGraph }                               from './modules/graph.js';
import { setupNotes }                               from './modules/notes.js';

// Expose to window for inline onclick handlers in dynamically-generated HTML
window.openDetail = openDetail;
window.addToDDI   = addToDDI;

async function init() {
  await loadTranslations();
  await loadFilters();

  setupTabs();
  setupFilters(doSearch);
  setupSearch();
  setupModal();
  setupBookmarks();
  setupDDI();
  setupDashboard();
  setupGuidelines();
  setupPatients();
  setupGraph();
  setupNotes();
  setupI18n(() => {
    if (document.getElementById('query-input').value.trim()) doSearch();
  });

  translateUI();
  updateResearchHistory();
  renderBookmarks();
}

init();
