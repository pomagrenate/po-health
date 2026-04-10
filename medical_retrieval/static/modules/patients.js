/* patients.js — Patient registry and vitals tracker (TimeSeries + KV membranes) */

import { api }     from './api.js';
import { escHtml } from './utils.js';
import { onTab }   from './tabs.js';

export function setupPatients() {
  onTab('patients', loadPatientSelectors);

  document.getElementById('register-patient-btn').addEventListener('click', registerPatient);
  document.getElementById('log-vitals-btn').addEventListener('click',       logVital);

  document.getElementById('patient-select').addEventListener('change', e => {
    if (e.target.value) loadVitals(e.target.value);
  });
  document.getElementById('vital-name-select').addEventListener('change', () => {
    const pid = document.getElementById('patient-select').value;
    if (pid) loadVitals(pid);
  });
}

export async function loadPatientSelectors() {
  const patients = await api.listPatients().then(r => r.json()).catch(() => []);
  const opts = '<option value="">-- Select Patient --</option>' +
    patients.map(p =>
      `<option value="${escHtml(p.patient_id)}">${escHtml(p.name)} (${escHtml(p.patient_id)})</option>`
    ).join('');

  document.getElementById('patient-select').innerHTML = opts;
  // Mirror to the Notes tab selector if it exists
  const notesSelect = document.getElementById('notes-patient-select');
  if (notesSelect) notesSelect.innerHTML = opts;
}

async function registerPatient() {
  const patient_id = document.getElementById('new-patient-id').value.trim();
  const name       = document.getElementById('new-patient-name').value.trim();
  if (!patient_id || !name) { alert('Patient ID and name are required.'); return; }

  const res = await api.registerPatient({ patient_id, name });
  if (res.ok) {
    document.getElementById('new-patient-id').value   = '';
    document.getElementById('new-patient-name').value = '';
    loadPatientSelectors();
  } else {
    alert('Registration failed.');
  }
}

async function logVital() {
  const patient_id = document.getElementById('patient-select').value;
  const vital_name = document.getElementById('vital-name-select').value;
  const value      = parseFloat(document.getElementById('vital-value').value);
  if (!patient_id)  { alert('Select a patient first.'); return; }
  if (isNaN(value)) { alert('Enter a numeric vital value.'); return; }

  await api.logVitals(patient_id, { vital_name, value });
  document.getElementById('vital-value').value = '';
  loadVitals(patient_id);
}

async function loadVitals(patient_id) {
  const vital   = document.getElementById('vital-name-select').value;
  const records = await api.getVitals(patient_id, vital).then(r => r.json()).catch(() => []);
  const table   = document.getElementById('vitals-table');

  if (!records.length) {
    table.innerHTML = '<p class="state-msg">No vitals recorded yet for this vital sign.</p>';
    const canvas = document.getElementById('vitals-chart');
    if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    return;
  }

  table.innerHTML =
    '<table style="width:100%;border-collapse:collapse">' +
    '<tr>' +
      '<th style="text-align:left;padding:4px">Time</th>' +
      '<th style="text-align:left;padding:4px">Vital</th>' +
      '<th style="text-align:right;padding:4px">Value</th>' +
    '</tr>' +
    records.map(r => `
      <tr>
        <td style="padding:4px">${new Date(r.ts * 1000).toLocaleString()}</td>
        <td style="padding:4px">${escHtml(r.vital)}</td>
        <td style="padding:4px;text-align:right"><strong>${r.value}</strong></td>
      </tr>`).join('') +
    '</table>';

  drawVitalsChart(records);
}

function drawVitalsChart(records) {
  const canvas = document.getElementById('vitals-chart');
  if (!canvas || records.length < 2) return;

  const w   = canvas.width  = canvas.parentElement.offsetWidth || 600;
  const h   = canvas.height = 180;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);

  const vals  = records.map(r => r.value);
  const min   = Math.min(...vals);
  const max   = Math.max(...vals);
  const range = max - min || 1;
  const pad   = 30;

  // Grid lines + y-axis labels
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth   = 1;
  [0, 0.25, 0.5, 0.75, 1].forEach(frac => {
    const y = pad + (1 - frac) * (h - 2 * pad);
    ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(w - pad, y); ctx.stroke();
    ctx.fillStyle = '#888';
    ctx.font      = '10px sans-serif';
    ctx.fillText((min + frac * range).toFixed(1), 2, y + 4);
  });

  // Data line
  ctx.strokeStyle = '#4f8ef7';
  ctx.lineWidth   = 2;
  ctx.beginPath();
  records.forEach((r, i) => {
    const x = pad + (i / (records.length - 1)) * (w - 2 * pad);
    const y = pad + (1 - (r.value - min) / range) * (h - 2 * pad);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Data point dots
  ctx.fillStyle = '#4f8ef7';
  records.forEach((r, i) => {
    const x = pad + (i / (records.length - 1)) * (w - 2 * pad);
    const y = pad + (1 - (r.value - min) / range) * (h - 2 * pad);
    ctx.beginPath(); ctx.arc(x, y, 3, 0, 2 * Math.PI); ctx.fill();
  });
}
