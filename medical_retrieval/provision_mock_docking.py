import os
import json
import numpy as np
import sys

# Add pomaidb to path
# Locate repo root
_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
_REPO_ROOT = os.path.dirname(_THIS_DIR)
_POMAIDB_PYTHON = os.path.join(_REPO_ROOT, "pomaidb", "python")
if _POMAIDB_PYTHON not in sys.path:
    sys.path.insert(0, _POMAIDB_PYTHON)

import pomaidb

DB_PATH = os.path.join(_THIS_DIR, "test_docking_db")
META_MEMBRANE = "compound_meta_3d"
DIM = 60

def provision_mock_docking():
    if not os.path.exists(DB_PATH):
        os.makedirs(DB_PATH, exist_ok=True)
    
    db = pomaidb.open_db(DB_PATH, dim=DIM, shards=1, metric="ip")
    try:
        pomaidb.create_membrane_kind(db, META_MEMBRANE, 0, 1, pomaidb.MEMBRANE_KIND_META)
    except Exception as e:
        print(f"Membrane init: {e}")

    
    compounds = [
        {"id": 1, "name": "Compound-A", "smiles": "CC(=O)OC1=CC=CC=C1C(=O)O", "is_toxic": 0},
        {"id": 2, "name": "Compound-B", "smiles": "CN1C=NC2=C1C(=O)N(C(=O)N2C)C", "is_toxic": 0},
        {"id": 3, "name": "Target-Receptor-Modulator", "smiles": "O=C(O)C1=CC=CC=C1O", "is_toxic": 0},
        {"id": 4, "name": "Toxic-Impurity-01", "smiles": "C1=CC=C(C=C1)[N+](=O)[O-]", "is_toxic": 1},
    ]
    
    for i in range(5, 101):
        compounds.append({
            "id": i,
            "name": f"Compound-{idx_to_name(i)}",
            "smiles": "C"*(i%10 + 1),
            "is_toxic": 1 if i % 10 == 0 else 0
        })

    log_info(f"Ingesting {len(compounds)} compounds into docking DB...")
    
    for c in compounds:
        vec = np.random.rand(DIM).astype(np.float32)
        # Normalize for inner product (cosine similarity proxy)
        vec /= np.linalg.norm(vec)
        
        pomaidb.put_batch(db, [c["id"]], [vec.tolist()])
        pomaidb.meta_put(db, META_MEMBRANE, str(c["id"]), json.dumps(c))

        
    pomaidb.close(db)
    print("Docking DB provisioned successfully.")

def idx_to_name(i):
    return hex(i)[2:].upper()

def log_info(msg):
    print(f"[INFO] {msg}")

if __name__ == "__main__":
    provision_mock_docking()
