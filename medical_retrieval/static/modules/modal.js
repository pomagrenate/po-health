/* modal.js — Drug detail modal */

import { state }   from './state.js';
import { api }     from './api.js';
import { escHtml } from './utils.js';

const overlay     = () => document.getElementById('modal-overlay');
const modalTitle  = () => document.getElementById('modal-title');
const modalDetails = () => document.getElementById('modal-details');
const aiBox       = () => document.getElementById('ai-analysis-box');

export function closeModal() {
  overlay().classList.remove('active');
  document.body.style.overflow = '';
}

export async function openDetail(drugId) {
  const dict = state.translations[state.currentLang] || { loading: 'Loading...' };

  modalTitle().textContent  = dict.loading;
  modalDetails().innerHTML  = '<div class="state-msg"><div class="spinner"></div></div>';
  aiBox().innerHTML         = '';
  aiBox().style.display     = 'none';
  overlay().classList.add('active');

  try {
    const res = await api.drugDetail(drugId);
    if (!res.ok) throw new Error('fetch detail failed');
    const d = await res.json();

    modalTitle().textContent = d.name;
    aiBox().textContent      = d.ai_analysis || 'No analysis available.';
    aiBox().style.display    = 'block';

    const section = (title, content) => `
      <div class="modal-section"><h3>${title}</h3><p>${content || 'None'}</p></div>`;
    const list = items =>
      items?.length ? `<ul>${items.map(i => `<li>${escHtml(i)}</li>`).join('')}</ul>` : 'None';

    modalDetails().innerHTML = `
      <div class="modal-grid">
        <div class="modal-main">
          ${section(dict.modal_indications, list(d.indications))}
          ${section(dict.modal_contra,      list(d.contraindications))}
          ${section('Warnings',             d.warnings)}
        </div>
        <aside class="modal-sidebar">
          <div class="modal-info-bit"><strong>Dose Form:</strong> ${escHtml(d.dose_form)}</div>
          <div class="modal-info-bit"><strong>Status:</strong>    ${escHtml(d.status)}</div>
          <div class="modal-info-bit"><strong>Route:</strong>     ${escHtml(d.route)}</div>
          <div class="modal-info-bit"><strong>Ingredients:</strong> ${list(d.ingredients)}</div>
        </aside>
      </div>
      <div class="modal-actions">
        <button class="primary-btn" onclick="addToDDI(${d.id}, '${escHtml(d.name)}')">
          Add to DDI Checker
        </button>
      </div>`;

    document.body.style.overflow = 'hidden';
  } catch (e) {
    modalTitle().textContent = 'Error';
    modalDetails().innerHTML = `<p class="state-msg">${e.message}</p>`;
  }
}

export function setupModal() {
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
}
