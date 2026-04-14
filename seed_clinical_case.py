import httpx
import json
import time

API_BASE = "http://localhost:8000/api"

def seed():
    # 1. Add Patient
    httpx.post(f"{API_BASE}/patients", json={
        "patient_id": "P-001",
        "name": "John Doe",
        "dob": "1980-05-15",
        "gender": "Male"
    })
    
    # 2. Add Meds (DDI Risk)
    httpx.post(f"{API_BASE}/patients/P-001/medications", json={
        "drug_id": "DB00945", # Aspirin
        "drug_name": "Aspirin",
        "dose": "81mg daily"
    })
    httpx.post(f"{API_BASE}/patients/P-001/medications", json={
        "drug_id": "DB01050", # Ibuprofen
        "drug_name": "Ibuprofen",
        "dose": "400mg PRN"
    })
    
    # 3. Log Vitals (Hypertension)
    httpx.post(f"{API_BASE}/patients/P-001/vitals", json={
        "vital_name": "Blood Pressure",
        "value": 160.0
    })
    
    # 4. Ingest Guideline
    httpx.post(f"{API_BASE}/guidelines/ingest", json={
        "text": "Hypertension Protocol: For patients with BP > 140/90, initiate ACE-inhibitor or Calcium Channel Blocker. Avoid NSAIDs (like Ibuprofen) if patient is on Aspirin to prevent GI risk.",
        "source": "Institutional Guideline 2024"
    })
    
    print("Seeding Complete: P-001 ready for reasoning.")

if __name__ == "__main__":
    seed()
