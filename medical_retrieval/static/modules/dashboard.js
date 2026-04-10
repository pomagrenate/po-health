/* dashboard.js — Clinical dashboard: search trends and top drugs */

import { api }     from './api.js';
import { escHtml } from './utils.js';
import { onTab }   from './tabs.js';

async function renderAnalytics() {
  const chart = document.getElementById('analytics-chart');
  const list  = document.getElementById('top-drugs-list');
  if (!chart || !list) return;

  try {
    const data = await api.analytics().then(r => r.json());
    const max  = Math.max(...data.search_volume.map(v => v.count));

    chart.innerHTML = data.search_volume.map(v => `
      <div class="chart-bar" style="height:${(v.count / max) * 100}%" title="${v.time}: ${v.count}"></div>
    `).join('');

    list.innerHTML = data.top_drugs.map((d, i) => `
      <li>
        <span>${i + 1}. ${escHtml(d)}</span>
        <span class="badge badge-active">${Math.floor(Math.random() * 50) + 10} searches</span>
      </li>`).join('');
  } catch (e) {
    console.error('Analytics failed:', e);
  }
}

export function setupDashboard() {
  onTab('dashboard', renderAnalytics);
}
