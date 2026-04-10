/* cards.js — Drug result card template, shared by search and bookmarks */

import { state }   from './state.js';
import { escHtml } from './utils.js';

function getBookmarks() {
  return JSON.parse(localStorage.getItem('po_health_bookmarks') || '[]');
}

export function drugCard(d) {
  const dict        = state.translations[state.currentLang] || {};
  const sim         = Math.round((d.similarity || 1.0) * 100);
  const statusClass = d.status === 'active' ? 'badge-active' : 'badge-other';
  const indText     = d.indications?.[0] || 'No indications listed';
  const bookmarked  = getBookmarks().includes(d.id);

  return `
    <div class="result-card" data-id="${d.id}">
      <div class="card-header">
        <span class="drug-name">${escHtml(d.name)}</span>
        <span class="similarity-badge">${sim}% ${dict.match || 'match'}</span>
      </div>
      <div class="card-meta">
        ${d.is_high_risk ? `<span class="badge badge-risk">${dict.high_risk || 'High Risk'}</span>` : ''}
        ${d.dose_form    ? `<span class="badge badge-form">${escHtml(d.dose_form)}</span>` : ''}
        ${d.status       ? `<span class="badge ${statusClass}">${escHtml(d.status)}</span>` : ''}
        <button class="bookmark-btn ${bookmarked ? 'active' : ''}" data-id="${d.id}">
          ${bookmarked ? '★' : '☆'}
        </button>
      </div>
      <p class="card-indications">${escHtml(indText)}</p>
      ${d.patient_note ? `<p class="patient-note">${escHtml(d.patient_note)}</p>` : ''}
    </div>`;
}

/** Attach click listeners to cards inside a container element. */
export function attachCardListeners(container, { onOpen, onBookmark }) {
  container.querySelectorAll('.result-card').forEach(card => {
    card.addEventListener('click', () => onOpen(card.dataset.id));
  });
  container.querySelectorAll('.bookmark-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      onBookmark(btn.dataset.id, btn);
    });
  });
}
