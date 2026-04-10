/* history.js — Research history sidebar (AgentMemory-backed) */

import { api }     from './api.js';
import { escHtml } from './utils.js';

export async function updateResearchHistory() {
  const historyList = document.getElementById('history-list');
  if (!historyList) return;

  try {
    const res     = await api.researchContext();
    const history = await res.json();

    if (!history.length) {
      historyList.innerHTML = '<p class="state-msg" style="font-size:0.7rem">No history yet.</p>';
      return;
    }

    historyList.innerHTML = history.map(h => `
      <div class="history-item">
        <span class="query">${escHtml(h.query)}</span>
        <span class="ts">${new Date(h.ts * 1000).toLocaleTimeString()}</span>
      </div>`).join('');

    historyList.querySelectorAll('.history-item').forEach((item, i) => {
      item.onclick = () => {
        document.getElementById('query-input').value = history[i].query;
        // Trigger search by dispatching submit on the form
        document.getElementById('search-form').dispatchEvent(new Event('submit'));
      };
    });
  } catch (e) {
    console.error('History update failed:', e);
  }
}
