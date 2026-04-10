/* guidelines.js — Clinical guidelines: ingest and semantic search (RAG membrane) */

import { api }     from './api.js';
import { escHtml } from './utils.js';

export function setupGuidelines() {
  document.getElementById('guideline-ingest-btn').addEventListener('click', ingestGuideline);
  document.getElementById('guideline-search-btn').addEventListener('click', searchGuidelines);
}

async function ingestGuideline() {
  const title   = document.getElementById('guideline-title').value.trim();
  const content = document.getElementById('guideline-content').value.trim();
  const source  = document.getElementById('guideline-source').value.trim() || null;

  if (!title || !content) { alert('Title and content are required.'); return; }

  const btn = document.getElementById('guideline-ingest-btn');
  btn.disabled    = true;
  btn.textContent = 'Ingesting…';

  try {
    const res  = await api.guidelineIngest({ title, content, source });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || res.statusText);

    ['guideline-title', 'guideline-content', 'guideline-source'].forEach(id => {
      document.getElementById(id).value = '';
    });
    alert(`Ingested: "${data.title}" (doc_id=${data.doc_id})`);
  } catch (e) {
    alert('Ingest failed: ' + e.message);
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Ingest Guideline';
  }
}

async function searchGuidelines() {
  const q  = document.getElementById('guideline-query').value.trim();
  const el = document.getElementById('guidelines-results');
  if (!q) return;

  el.innerHTML = '<p class="state-msg">Searching guidelines…</p>';
  try {
    const hits = await api.guidelineSearch(q).then(r => r.json());

    if (!hits.length) {
      el.innerHTML = '<p class="state-msg">No matching guidelines found.</p>';
      return;
    }

    el.innerHTML = hits.map(h => `
      <div class="result-card">
        <div class="card-header">
          <span class="drug-name">${escHtml(h.title)}</span>
          <span class="similarity-badge">${Math.round(h.score * 100)}% match</span>
        </div>
        ${h.source ? `<p style="font-size:0.75rem;color:var(--muted)">${escHtml(h.source)}</p>` : ''}
        <p class="card-indications">${escHtml(h.excerpt || '(no excerpt available)')}</p>
      </div>`).join('');
  } catch (e) {
    el.innerHTML = `<p class="state-msg">Error: ${e.message}</p>`;
  }
}
