import time
import json
import logging
import httpx
import threading
from typing import Dict, List, Optional
from _db import pomaidb

log = logging.getLogger(__name__)

# Constants (must match server.py)
PATIENT_REGISTRY_MEMBRANE = "patient_registry"
PATIENT_VITALS_MEMBRANE = "patient_vitals"
PATIENT_ALERTS_MEMBRANE = "patient_alerts"
PROACTIVE_INSIGHTS_MEMBRANE = "proactive_insights"

class ActiveGuard:
    def __init__(self, db, check_interval=60):
        self.db = db
        self.check_interval = check_interval
        self.running = False
        self.thread = None

    def start(self):
        if self.running: return
        self.running = True
        self.thread = threading.Thread(target=self._loop, daemon=True)
        self.thread.start()
        log.info("Active Guard Monitoring Service started.")

    def stop(self):
        self.running = False
        if self.thread:
            self.thread.join()

    def _loop(self):
        while self.running:
            try:
                self._audit_all_patients()
            except Exception as e:
                log.error("Active Guard loop error: %s", e)
            time.sleep(self.check_interval)

    def _audit_all_patients(self):
        # 1. Get all patient IDs
        # (Assuming patients are stored in a registry with keys 'patients')
        try:
            raw_patients = pomaidb.kv_get(self.db, PATIENT_REGISTRY_MEMBRANE, "all_patient_ids")
            patients = json.loads(raw_patients) if raw_patients else []
        except Exception:
            # Fallback: scan or handle empty
            patients = []

        for p_id in patients:
            self._check_patient(p_id)

    def _check_patient(self, patient_id: str):
        # 2. Fetch latest vitals
        # (We need to reach into the timeseries membrane for that patient)
        # Note: server.py uses a kv-index to track vital record keys per patient
        idx_key = f"vitals_idx:{patient_id}"
        try:
            raw_idx = pomaidb.kv_get(self.db, PATIENT_REGISTRY_MEMBRANE, idx_key)
            if not raw_idx: return
            keys = json.loads(raw_idx)
            if not keys: return
            
            # Get latest 3 records to see trends
            latest_keys = keys[-3:]
            records = []
            for k in latest_keys:
                r = pomaidb.kv_get(self.db, PATIENT_REGISTRY_MEMBRANE, k)
                records.append(json.loads(r))
            
            latest = records[-1]
            vital_name = latest.get("vital")
            val = latest.get("value")
            
            # 3. Check against thresholds
            cfg_raw = pomaidb.kv_get(self.db, PATIENT_ALERTS_MEMBRANE, f"alert_config:{patient_id}:{vital_name}")
            if cfg_raw:
                cfg = json.loads(cfg_raw)
                min_v = cfg.get("min_value")
                max_v = cfg.get("max_value")
                
                alert_triggered = False
                nudge_context = ""

                if min_v is not None and val < min_v: 
                    alert_triggered = True
                    nudge_context = "below target"
                if max_v is not None and val > max_v: 
                    alert_triggered = True
                    nudge_context = "above target"

                # Standard Clinical Rules (Fallback/Safety)
                if vital_name.lower() in ["blood pressure", "bp"]:
                    if val >= 180.0:
                        alert_triggered = True
                        nudge_context = "HYPERTENSIVE CRISIS"
                    elif val >= 160.0:
                        alert_triggered = True
                        nudge_context = "Stage 2 Hypertension"
                
                if vital_name.lower() in ["heart rate", "hr"]:
                    if val > 120:
                        alert_triggered = True
                        nudge_context = "Significant Tachycardia"
                    elif val < 50:
                        alert_triggered = True
                        nudge_context = "Significant Bradycardia"
                
                if vital_name.lower() in ["spo2", "oxygen saturation"]:
                    if val < 90:
                        alert_triggered = True
                        nudge_context = "CRITICAL HYPOXIA"
                    elif val < 94:
                        alert_triggered = True
                        nudge_context = "Mild Desaturation"
                
                if alert_triggered:
                    self._generate_proactive_insight(patient_id, vital_name, val, records, nudge_context)
        except Exception as e:
            log.debug("Skip patient %s check: %s", patient_id, e)

    def _generate_proactive_insight(self, patient_id, vital, value, history, context=""):
        # 4. Async call to Local LLM for a "Proactive Nudge"
        try:
            prompt = f"""[INST] SYSTEM: Proactive Clinical Monitor.
            PATIENT: {patient_id}
            ANOMALY: {vital} is {value} ({context}).
            TREND: {[r['value'] for r in history]}
            
            Provide a 1-sentence proactive 'Clinical Nudge' for the doctor.
            Keep it urgent but professional. Short.
            [/INST]"""
            
            with httpx.Client() as client:
                resp = client.post(
                    "http://localhost:8081/v1/chat/completions",
                    json={
                        "model": "reasoning_q4.gguf",
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.1,
                        "max_tokens": 64
                    },
                    timeout=10.0
                )
                nudge = resp.json()["choices"][0]["message"]["content"].strip()
                
                # 5. Log to Proactive Insights membrane
                insight = {
                    "patient_id": patient_id,
                    "vital": vital,
                    "value": value,
                    "nudge": nudge,
                    "ts": int(time.time()),
                    "severity": "High"
                }
                # Store under a list-key for the patient
                insight_key = f"proactive:{patient_id}"
                existing_raw = None
                try: 
                    existing_raw = pomaidb.kv_get(self.db, PROACTIVE_INSIGHTS_MEMBRANE, insight_key)
                except: pass
                
                existing = json.loads(existing_raw) if existing_raw else []
                existing.append(insight)
                # Keep last 10
                existing = existing[-10:]
                
                pomaidb.kv_put(self.db, PROACTIVE_INSIGHTS_MEMBRANE, insight_key, json.dumps(existing))
                log.info("Proactive Insight generated for %s: %s", patient_id, nudge)
                
        except Exception as e:
            log.error("Failed to generate proactive insight: %s", e)
