import os
import json
import pytest
from fastapi.testclient import TestClient

# Use absolute paths for the test database - MUST BE SET BEFORE IMPORTING APP
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
os.environ["DB_PATH"] = os.path.join(BASE_DIR, "test_db")
os.environ["DOCKING_DB_PATH"] = os.path.join(BASE_DIR, "test_docking_db")

from server import app

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c

def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database"] == "connected"

def test_search(client):
    query = "pain relief"
    response = client.post("/api/search", json={
        "query": query,
        "filters": {},
        "top_k": 5
    })
    assert response.status_code == 200
    results = response.json()
    assert isinstance(results, list)
    if results:
        assert "name" in results[0]
        assert "similarity" in results[0]

def test_check_interactions(client):
    response = client.post("/api/check-interactions", json={
        "drug_ids": [0, 1]
    })
    assert response.status_code == 200
    data = response.json()
    assert "interactions" in data
    assert "summary" in data

def test_filters(client):
    response = client.get("/api/filters")
    assert response.status_code == 200
    data = response.json()
    assert "dose_forms" in data
    assert "statuses" in data
    assert "routes" in data

def test_drug_detail(client):
    response = client.get("/api/drug/0")
    assert response.status_code == 200
    data = response.json()
    assert "name" in data
    assert "ai_analysis" in data

def test_notes(client):
    # Add a note using the SOAP fields
    patient_id = "PAT123"
    note_content = "Patient presents with mild hypertension. Considering Lisinopril."
    response = client.post("/api/notes", json={
        "patient_id": patient_id,
        "free_text": note_content
    })
    assert response.status_code == 200
    
    # Get notes
    response = client.get(f"/api/notes/{patient_id}")
    assert response.status_code == 200
    notes = response.json()
    assert len(notes) > 0
    assert notes[0]["free_text"] == note_content

def test_vitals_and_alerts(client):
    patient_id = "PAT456"
    # Register patient
    client.post("/api/patients/register", json={
        "patient_id": patient_id,
        "name": "Jane Doe",
        "dob": "1985-05-15"
    })
    
    # Set alert config: BP > 140
    client.post(f"/api/patients/{patient_id}/alert-config", json={
        "vital_name": "systolic_bp",
        "max_value": 140.0
    })
    
    # Log normal vital
    response = client.post(f"/api/patients/{patient_id}/vitals", json={
        "vital_name": "systolic_bp",
        "value": 120.0
    })
    assert "alert" not in response.json()
    
    # Log abnormal vital
    response = client.post(f"/api/patients/{patient_id}/vitals", json={
        "vital_name": "systolic_bp",
        "value": 150.0
    })
    data = response.json()
    assert "alert" in data
    assert data["alert"]["severity"] == "warning"
    
    # Check active alerts
    response = client.get("/api/alerts/active")
    active = response.json()
    assert any(a["patient_id"] == patient_id for a in active)

def test_ddi_seed_and_graph(client):
    # Seed DDI
    response = client.post("/api/ddi/seed")
    assert response.status_code == 200
    assert response.json()["curated_pairs"] > 0
    
    # Check interactions for a known drug from curated list (e.g. Warfarin)
    response = client.get("/api/ddi/interactions/Warfarin")
    assert response.status_code == 200
    data = response.json()
    assert len(data["interactions"]) > 0

def test_guideline_rag(client):
    # Ingest guideline
    response = client.post("/api/guidelines/ingest", json={
        "title": "Hypertension Guidelines 2026",
        "content": "Stage 1 hypertension is defined as systolic BP 130-139 mmHg.",
        "source": "AHA"
    })
    assert response.status_code == 200
    
    # Search guideline - use a query that matches the content exactly for best chance
    response = client.get("/api/guidelines/search", params={"q": "systolic BP 130-139", "top_k": 5})
    assert response.status_code == 200
    results = response.json()
    assert len(results) > 0
    assert "systolic BP" in results[0]["excerpt"]

def test_docking_search(client):
    # Search for similar 3D compounds using SMILES via query parameters
    aspirin_smiles = "CC(=O)OC1=CC=CC=C1C(=O)O"
    response = client.post("/api/docking/search", params={
        "smiles": aspirin_smiles,
        "top_k": 5,
        "filter_toxic": True
    })
    assert response.status_code == 200
    data = response.json()
    assert "results" in data
    assert len(data["results"]) > 0

