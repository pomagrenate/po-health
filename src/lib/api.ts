/**
 * api.ts — Centralized API service for the Po-Health Next.js frontend.
 * Communicates with the FastAPI backend (default: http://localhost:8000).
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface SearchFilters {
  dose_form?: string;
  status?: string;
  route?: string;
  ingredient?: string;
}

export interface SearchRequest {
  query: string;
  filters?: SearchFilters;
  top_k?: number;
  patient_friendly?: boolean;
  patient_id?: string;
}

export interface DrugSummary {
  id: number;
  name: string;
  dose_form: string;
  status: string;
  indications: string[];
  ingredients: string[];
  similarity: number;
  patient_note?: string;
  is_high_risk: boolean;
}

async function handleResponse(res: Response) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || res.statusText);
  }
  return res.json();
}

export const api = {
  // ── Drug Search & Detail ──────────────────────────────────────────────
  search: (req: SearchRequest): Promise<DrugSummary[]> =>
    fetch(`${API_BASE}/api/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    }).then(handleResponse),

  drugDetail: (id: number): Promise<any> =>
    fetch(`${API_BASE}/api/drug/${id}`).then(handleResponse),

  filters: (): Promise<{ dose_forms: string[]; statuses: string[]; routes: string[] }> =>
    fetch(`${API_BASE}/api/filters`).then(handleResponse),

  // ── Clinical Guidelines ───────────────────────────────────────────
  guidelineSearch: (q: string, top_k: number = 5): Promise<any[]> =>
    fetch(`${API_BASE}/api/guidelines/search?q=${encodeURIComponent(q)}&top_k=${top_k}`).then(handleResponse),

  ingestGuideline: (text: string, source: string = 'User Upload'): Promise<any> =>
    fetch(`${API_BASE}/api/guidelines/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, source }),
    }).then(handleResponse),

  // ── Patient Registry & Vitals ─────────────────────────────────────
  listPatients: (): Promise<any[]> =>
    fetch(`${API_BASE}/api/patients`).then(handleResponse),

  getPatientVitals: (pid: string, vital?: string): Promise<any[]> => {
    const url = `${API_BASE}/api/patients/${encodeURIComponent(pid)}/vitals${vital ? `?vital=${encodeURIComponent(vital)}` : ''}`;
    return fetch(url).then(handleResponse);
  },

  logVitals: (pid: string, body: any): Promise<any> =>
    fetch(`${API_BASE}/api/patients/${encodeURIComponent(pid)}/vitals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(handleResponse),

  // ── 3D Molecular Search ──────────────────────────────────────────────
  dockingSearch: (smiles: string, top_k: number = 10, filter_toxic: boolean = false): Promise<any> =>
    fetch(`${API_BASE}/api/docking/search?smiles=${encodeURIComponent(smiles)}&top_k=${top_k}&filter_toxic=${filter_toxic}`, {
      method: 'POST'
    }).then(handleResponse),

  // ── Knowledge Graph ──────────────────────────────────────────────────
  graphLookup: (drug: string): Promise<any[]> =>
    fetch(`${API_BASE}/api/graph/drug/${encodeURIComponent(drug)}`).then(handleResponse),

  // ── Clinical Reasoning Agent ──────────────────────────────────────────
  reasonPatientCase: (patientId: string, focusArea?: string, language: string = "english"): Promise<any> =>
    fetch(`${API_BASE}/api/agent/reason`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient_id: patientId, focus_area: focusArea, language }),
    }).then(handleResponse),

  labInsight: (text: string): Promise<any> =>
    fetch(`${API_BASE}/api/agent/lab-insight`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    }).then(handleResponse),

  generateDDx: (patientId: string): Promise<any> =>
    fetch(`${API_BASE}/api/agent/ddx`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient_id: patientId }),
    }).then(handleResponse),

  getProactiveInsights: (patientId: string): Promise<any[]> =>
    fetch(`${API_BASE}/api/patients/${patientId}/proactive-insights`).then(handleResponse),

  saveClinicalSummary: (patientId: string, summary: string): Promise<any> =>
    fetch(`${API_BASE}/api/patients/${patientId}/clinical-summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ summary }),
    }).then(handleResponse),

  generateSOAPDraft: (patientId: string, subjective: string, objective: string, language: string = "english"): Promise<any> =>
    fetch(`${API_BASE}/api/agent/soap-draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient_id: patientId, subjective, objective, language }),
    }).then(handleResponse),

  runSafetyAudit: (patientId: string, subjective: string, objective: string, assessment: string, plan: string, language: string = "english"): Promise<any> =>
    fetch(`${API_BASE}/api/agent/safety-audit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient_id: patientId, subjective, objective, assessment, plan, language }),
    }).then(handleResponse),

  generateDischargeSummary: (patientId: string, hospital_course: string, discharge_plan: string, language: string = "english"): Promise<any> =>
    fetch(`${API_BASE}/api/agent/discharge-summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient_id: patientId, hospital_course, discharge_plan, language }),
    }).then(handleResponse),

  analyzeImagingReport: (patientId: string, reportText: string, language: string = "english"): Promise<any> =>
    fetch(`${API_BASE}/api/agent/imaging-insight`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient_id: patientId, report_text: reportText, language }),
    }).then(handleResponse),

  searchClinicalGuidelines: (query: string): Promise<any[]> =>
    fetch(`${API_BASE}/api/rag/search?query=${encodeURIComponent(query)}`)
      .then(handleResponse),
};
