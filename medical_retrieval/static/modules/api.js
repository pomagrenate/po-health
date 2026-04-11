/* api.js — Centralised fetch wrappers for all backend endpoints */

const JSON_HDR = { 'Content-Type': 'application/json' };
const post = (url, body) => fetch(url, { method: 'POST', headers: JSON_HDR, body: JSON.stringify(body) });

export const api = {
  // ── Drug search & detail ──────────────────────────────────────────────
  search: (body) => post('/api/search', body),
  drugDetail: (id) => fetch(`/api/drug/${id}`),
  filters: () => fetch('/api/filters'),
  export: (body) => post('/api/export', body),
  dockingSearch: (smiles, top_k = 10, filter_toxic = false) =>
    fetch(`/api/docking/search?smiles=${encodeURIComponent(smiles)}&top_k=${top_k}&filter_toxic=${filter_toxic}`, { method: 'POST' }),



  // ── Interactions & bookmarks ──────────────────────────────────────────
  checkInteractions: (drug_ids) => post('/api/check-interactions', { drug_ids }),
  toggleBookmark: (drug_id) => post('/api/bookmarks/toggle', { drug_id }),

  // ── Sidebar history & analytics ───────────────────────────────────────
  researchContext: () => fetch('/api/research-context'),
  analytics: () => fetch('/api/analytics'),

  // ── Clinical guidelines (Feature 1) ───────────────────────────────────
  guidelineIngest: (body) => post('/api/guidelines/ingest', body),
  guidelineSearch: (q, top_k = 5) => fetch(`/api/guidelines/search?q=${encodeURIComponent(q)}&top_k=${top_k}`),

  // ── Patient vitals (Feature 2) ────────────────────────────────────────
  registerPatient: (body) => post('/api/patients/register', body),
  listPatients: () => fetch('/api/patients'),
  logVitals: (pid, body) => post(`/api/patients/${encodeURIComponent(pid)}/vitals`, body),
  getVitals: (pid, vital) => fetch(`/api/patients/${encodeURIComponent(pid)}/vitals?vital=${encodeURIComponent(vital)}`),

  // ── Knowledge graph (Feature 3) ───────────────────────────────────────
  graphLookup: (drug) => fetch(`/api/graph/drug/${encodeURIComponent(drug)}`),
  graphSeed: () => post('/api/graph/seed', {}),
  graphAddEdge: (body) => post('/api/graph/edge', body),

  // ── Clinical notes (Feature 4) ────────────────────────────────────────
  createNote: (body) => post('/api/notes', body),
  getNotes: (pid) => fetch(`/api/notes/${encodeURIComponent(pid)}`),
  searchNotes: (q) => fetch(`/api/notes/search?q=${encodeURIComponent(q)}`),
};
