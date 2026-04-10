/* notes.js — Clinical SOAP notes (KV membrane + AgentMemory semantic search) */

import { api }     from './api.js';
import { escHtml } from './utils.js';
import { onTab }   from './tabs.js';

export function setupNotes() {
  onTab('notes', populatePatientSelect);

  document.getElementById('save-note-btn').addEventListener('click',   saveNote);
  document.getElementById('notes-search-btn').addEventListener('click', searchNotesHandler);
  document.getElementById('notes-patient-select').addEventListener('change', e => {
    if (e.target.value) loadNotes(e.target.value);
  });
}

async function populatePatientSelect() {
  const patients = await api.listPatients().then(r => r.json()).catch(() => []);
  document.getElementById('notes-patient-select').innerHTML =
    '<option value="">-- Select Patient --</option>' +
    patients.map(p =>
      `<option value="${escHtml(p.patient_id)}">${escHtml(p.name)} (${escHtml(p.patient_id)})</option>`
    ).join('');
}

async function saveNote() {
  const patient_id = document.getElementById('notes-patient-select').value;
  if (!patient_id) { alert('Select a patient first.'); return; }

  const body = {
    patient_id,
    subject:    document.getElementById('note-subject').value.trim()    || null,
    objective:  document.getElementById('note-objective').value.trim()  || null,
    assessment: document.getElementById('note-assessment').value.trim() || null,
    plan:       document.getElementById('note-plan').value.trim()       || null,
  };

  const res = await api.createNote(body);
  if (res.ok) {
    ['note-subject', 'note-objective', 'note-assessment', 'note-plan'].forEach(id => {
      document.getElementById(id).value = '';
    });
    loadNotes(patient_id);
  } else {
    alert('Failed to save note.');
  }
}

async function searchNotesHandler() {
  const q = document.getElementById('notes-search-q').value.trim();
  if (!q) return;
  const notes = await api.searchNotes(q).then(r => r.json()).catch(() => []);
  renderNotesList(notes, true);
}

async function loadNotes(patient_id) {
  const notes = await api.getNotes(patient_id).then(r => r.json()).catch(() => []);
  renderNotesList(notes, false);
}

function renderNotesList(notes, isSearch) {
  const el = document.getElementById('notes-list');

  if (!notes.length) {
    el.innerHTML = `<p class="state-msg">${isSearch ? 'No matching notes found.' : 'No notes recorded for this patient.'}</p>`;
    return;
  }

  el.innerHTML = notes.map(n => {
    const ts  = n.ts || n.logical_ts;
    const pid = n.patient_id || n.text?.substring(0, 30) || '';
    return `
      <div class="result-card">
        <div class="card-header">
          <span class="drug-name">Patient: ${escHtml(pid)}</span>
          <span class="similarity-badge">${ts ? new Date(ts * 1000).toLocaleString() : ''}</span>
        </div>
        ${n.subject    ? `<p><strong>S:</strong> ${escHtml(n.subject)}</p>`    : ''}
        ${n.objective  ? `<p><strong>O:</strong> ${escHtml(n.objective)}</p>`  : ''}
        ${n.assessment ? `<p><strong>A:</strong> ${escHtml(n.assessment)}</p>` : ''}
        ${n.plan       ? `<p><strong>P:</strong> ${escHtml(n.plan)}</p>`       : ''}
        ${!n.subject && !n.objective && !n.assessment && !n.plan && n.text
          ? `<p>${escHtml(n.text)}</p>` : ''}
      </div>`;
  }).join('');
}
