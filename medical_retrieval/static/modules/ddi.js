/* ddi.js — Drug-Drug Interaction checker tab */

import { api }                  from './api.js';
import { escHtml }              from './utils.js';
import { closeModal }           from './modal.js';
import { updateResearchHistory } from './history.js';

let slots = [null, null];

export function addToDDI(id, name) {
  const emptyIdx = slots.findIndex(s => s === null);
  slots[emptyIdx === -1 ? 0 : emptyIdx] = { id, name };
  renderSlots();
  closeModal();
}

function renderSlots() {
  document.querySelectorAll('.ddi-slot').forEach((el, i) => {
    const drug = slots[i];
    el.textContent = drug ? drug.name : 'Click to add drug...';
    el.classList.toggle('filled', !!drug);
    el.onclick = () => { slots[i] = null; renderSlots(); };
  });
  document.getElementById('check-btn').disabled = slots.filter(Boolean).length < 2;
}

export function setupDDI() {
  document.getElementById('check-btn').addEventListener('click', async () => {
    const ids        = slots.filter(Boolean).map(s => s.id);
    const resultsDiv = document.getElementById('ddi-results');
    resultsDiv.innerHTML = '<p class="state-msg">Checking interactions...</p>';

    try {
      const res  = await api.checkInteractions(ids);
      const data = await res.json();

      resultsDiv.innerHTML = data.interactions.length
        ? `<div class="ai-box">${escHtml(data.summary)}</div>
           <div class="ddi-list">
             ${data.interactions.map(item => `
               <div class="ddi-item severity-${item.severity.toLowerCase()}">
                 <strong>${escHtml(item.type)} (${escHtml(item.severity)}):</strong>
                 ${escHtml(item.description)}
               </div>`).join('')}
           </div>`
        : `<div class="ai-box">${escHtml(data.summary)}</div>`;

      updateResearchHistory();
    } catch (e) {
      resultsDiv.innerHTML = `<p class="state-msg">Error: ${e.message}</p>`;
    }
  });
}
