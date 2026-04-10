/* bookmarks.js — Bookmark persistence (localStorage + server KV membrane) */

import { api }                          from './api.js';
import { drugCard, attachCardListeners } from './cards.js';
import { onTab }                         from './tabs.js';

export function getBookmarks() {
  return JSON.parse(localStorage.getItem('po_health_bookmarks') || '[]');
}

export async function toggleBookmark(drugId, btn) {
  try {
    const res  = await api.toggleBookmark(drugId);
    const data = await res.json();
    const added = data.status === 'added';

    btn.classList.toggle('active', added);
    btn.textContent = added ? '★' : '☆';

    // Update local cache
    const ids = getBookmarks();
    if (added) { if (!ids.includes(drugId)) ids.push(drugId); }
    else        { const i = ids.indexOf(drugId); if (i !== -1) ids.splice(i, 1); }
    localStorage.setItem('po_health_bookmarks', JSON.stringify(ids));

    if (document.querySelector('.nav-btn[data-tab="bookmarks"]')?.classList.contains('active')) {
      renderBookmarks();
    }
  } catch (e) {
    console.error('Bookmark toggle failed:', e);
  }
}

export async function renderBookmarks() {
  const grid = document.getElementById('bookmarks-grid');
  const ids  = getBookmarks();

  if (!ids.length) {
    grid.innerHTML = '<p class="state-msg">You have no bookmarked drugs.</p>';
    return;
  }

  grid.innerHTML = '<p class="state-msg">Loading bookmarks...</p>';
  try {
    const drugs = await Promise.all(ids.map(id => api.drugDetail(id).then(r => r.json())));
    grid.innerHTML = drugs.map(d => drugCard(d)).join('');
    attachCardListeners(grid, {
      onOpen:     id => window.openDetail(id),
      onBookmark: (id, btn) => toggleBookmark(id, btn),
    });
  } catch (e) {
    grid.innerHTML = `<p class="state-msg">Error loading bookmarks: ${e.message}</p>`;
  }
}

export function setupBookmarks() {
  onTab('bookmarks', renderBookmarks);
}
