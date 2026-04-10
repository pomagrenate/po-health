"""
Safe Drug Repurposing System — Proof of Concept
================================================
Uses ChemBERTa embeddings + PomaiDB vector search to find
structurally similar, non-toxic alternatives to a query compound.

Pipeline:
  Phase 1 — Load & clean Tox21 dataset (DeepChem)
  Phase 2 — Generate ChemBERTa-77M-MLM embeddings
  Phase 3 — Ingest vectors + metadata into PomaiDB
  Phase 4 — Hybrid search: vector similarity + is_toxic==0 filter

PomaiDB note:
  The real pomaidb client uses ctypes bindings (not REST).
  - Cosine similarity is approximated via inner-product on L2-normalised vectors.
  - Metadata filtering is done client-side: over-fetch candidates, then
    filter by is_toxic retrieved from a kMeta membrane.
"""

import json
import logging
import os
import sys
from typing import Dict, List

import numpy as np

# ---------------------------------------------------------------------------
# Bootstrap: make the pomaidb submodule importable
# ---------------------------------------------------------------------------
_POMAIDB_PYTHON = os.path.join(os.path.dirname(__file__), "pomaidb", "python")
if _POMAIDB_PYTHON not in sys.path:
    sys.path.insert(0, _POMAIDB_PYTHON)

# Verify the native library is present before anything else loads it
_LIB_CANDIDATES = [
    os.environ.get("POMAI_C_LIB", ""),
    os.path.join(os.path.dirname(__file__), "pomaidb", "build", "libpomai_c.so"),
    os.path.join(os.path.dirname(__file__), "pomaidb", "build", "libpomai_c.dylib"),
]
_lib_found = any(os.path.isfile(p) for p in _LIB_CANDIDATES if p)
if not _lib_found:
    sys.exit(
        "[ERROR] PomaiDB native library not found.\n"
        "Build it first:\n"
        "  cd pomaidb && cmake -B build && cmake --build build\n"
        "Or set POMAI_C_LIB=/path/to/libpomai_c.so"
    )

import pomaidb  # noqa: E402 — must come after sys.path and lib check

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
DB_PATH = "./pomaidb_tox21"
META_MEMBRANE = "compound_meta"
DIM = 768                  # ChemBERTa-77M-MLM hidden size
TOX21_LABEL_COL = 0        # NR-AhR column used as hepatotoxicity proxy
SUBSET_SIZE = 1000
EMBED_BATCH_SIZE = 32
INSERT_BATCH_SIZE = 128
MODEL_NAME = "DeepChem/ChemBERTa-77M-MLM"


# ===========================================================================
# Phase 1 — Data Acquisition & Preprocessing
# ===========================================================================

def load_and_preprocess() -> List[Dict]:
    """Load Tox21, extract SMILES + binary hepatotoxicity label, return ≤1000 records."""
    import deepchem as dc

    log.info("Loading Tox21 dataset via DeepChem…")
    tasks, datasets, _ = dc.molnet.load_tox21(featurizer="Raw", splitter="random")
    train_dataset = datasets[0]

    label_task = tasks[TOX21_LABEL_COL]
    log.info("Using task '%s' (index %d) as hepatotoxicity proxy", label_task, TOX21_LABEL_COL)

    smiles_list = train_dataset.ids          # array of SMILES strings
    labels_matrix = train_dataset.y          # shape (n_samples, 12)

    compounds = []
    record_id = 0
    for smiles, label_row in zip(smiles_list, labels_matrix):
        label_val = label_row[TOX21_LABEL_COL]
        # Skip rows with NaN labels or empty SMILES
        if smiles is None or smiles == "" or np.isnan(label_val):
            continue
        compounds.append({
            "id": record_id,
            "smiles": str(smiles),
            "is_toxic": int(label_val),
        })
        record_id += 1
        if len(compounds) >= SUBSET_SIZE:
            break

    n_toxic = sum(c["is_toxic"] for c in compounds)
    log.info(
        "Preprocessed %d compounds — toxic: %d, safe: %d",
        len(compounds), n_toxic, len(compounds) - n_toxic,
    )
    return compounds


# ===========================================================================
# Phase 2 — ChemBERTa Embedding Generation
# ===========================================================================

_tokenizer = None
_model = None


def _load_model():
    """Lazy-load ChemBERTa tokenizer and model (shared across calls)."""
    global _tokenizer, _model
    if _tokenizer is None:
        from transformers import AutoModel, AutoTokenizer
        log.info("Loading ChemBERTa model '%s'…", MODEL_NAME)
        _tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
        _model = AutoModel.from_pretrained(MODEL_NAME)
        _model.eval()
        log.info("Model loaded.")
    return _tokenizer, _model


def _l2_normalize(vec: np.ndarray) -> np.ndarray:
    """L2-normalise a 1-D vector so that inner-product equals cosine similarity."""
    norm = np.linalg.norm(vec)
    return vec / norm if norm > 0 else vec


def get_embedding(smiles_string: str) -> np.ndarray:
    """
    Convert a SMILES string to a L2-normalised (768,) float32 numpy array.

    Uses ChemBERTa mean-pooling over the last hidden state.
    Runs inside torch.no_grad() to avoid OOM from gradient accumulation.
    """
    import torch

    tokenizer, model = _load_model()
    inputs = tokenizer(
        smiles_string,
        return_tensors="pt",
        padding=True,
        truncation=True,
        max_length=128,
    )
    with torch.no_grad():
        outputs = model(**inputs)
    # Mean-pool over token dimension → shape (1, 768) → squeeze → (768,)
    embedding = outputs.last_hidden_state.mean(dim=1).squeeze().numpy()
    return _l2_normalize(embedding.astype(np.float32))


def generate_embeddings(compounds: List[Dict]) -> List[Dict]:
    """
    Add a 'vector' key to each compound dict by running SMILES through ChemBERTa.

    Processes records in batches of EMBED_BATCH_SIZE to control memory usage.
    """
    import torch

    tokenizer, model = _load_model()
    log.info("Generating embeddings for %d compounds (batch_size=%d)…", len(compounds), EMBED_BATCH_SIZE)

    for batch_start in range(0, len(compounds), EMBED_BATCH_SIZE):
        batch = compounds[batch_start: batch_start + EMBED_BATCH_SIZE]
        smiles_batch = [c["smiles"] for c in batch]

        inputs = tokenizer(
            smiles_batch,
            return_tensors="pt",
            padding=True,
            truncation=True,
            max_length=128,
        )
        with torch.no_grad():
            outputs = model(**inputs)

        # outputs.last_hidden_state shape: (batch, seq_len, 768)
        embeddings = outputs.last_hidden_state.mean(dim=1).numpy()  # (batch, 768)

        for compound, vec in zip(batch, embeddings):
            compound["vector"] = _l2_normalize(vec.astype(np.float32))

        batch_end = min(batch_start + EMBED_BATCH_SIZE, len(compounds))
        log.info("  Embedded %d / %d", batch_end, len(compounds))

    log.info("Embedding generation complete.")
    return compounds


# ===========================================================================
# Phase 3 — PomaiDB Ingestion
# ===========================================================================

def ingest_to_pomaidb(compounds: List[Dict]):
    """
    Open (or create) a PomaiDB database, insert all compound vectors and
    metadata, then freeze the index so it's searchable.

    Returns the open db handle — caller is responsible for pomaidb.close(db).
    """
    log.info("Opening PomaiDB at '%s' (dim=%d, metric=ip)…", DB_PATH, DIM)
    db = pomaidb.open_db(DB_PATH, dim=DIM, metric="ip", shards=1)

    # Create kMeta membrane for compound metadata (SMILES, is_toxic)
    log.info("Creating metadata membrane '%s'…", META_MEMBRANE)
    pomaidb.create_membrane_kind(db, META_MEMBRANE, 0, 1, pomaidb.MEMBRANE_KIND_META)

    log.info("Inserting %d vectors in batches of %d…", len(compounds), INSERT_BATCH_SIZE)
    for batch_start in range(0, len(compounds), INSERT_BATCH_SIZE):
        batch = compounds[batch_start: batch_start + INSERT_BATCH_SIZE]

        batch_ids = [c["id"] for c in batch]
        batch_vectors = [c["vector"].tolist() for c in batch]

        # Insert vectors into the default vector membrane
        pomaidb.put_batch(db, batch_ids, batch_vectors)

        # Insert metadata into the kMeta membrane
        for c in batch:
            meta_payload = json.dumps({
                "smiles": c["smiles"],
                "is_toxic": c["is_toxic"],
            })
            pomaidb.meta_put(db, META_MEMBRANE, str(c["id"]), meta_payload)

        batch_end = min(batch_start + INSERT_BATCH_SIZE, len(compounds))
        log.info("  Inserted %d / %d", batch_end, len(compounds))

    log.info("Freezing index (flushing memtable + building ANN graph)…")
    pomaidb.freeze(db)
    log.info("Ingestion complete.")
    return db


# ===========================================================================
# Phase 4 — Hybrid Search Engine
# ===========================================================================

def find_safe_alternatives(
    db,
    query_smiles: str,
    top_k: int = 5,
    oversample: int = 20,
) -> List[Dict]:
    """
    Find the top_k most similar NON-TOXIC compounds to query_smiles.

    Strategy (hybrid search):
      1. Embed the query SMILES with ChemBERTa.
      2. Retrieve top_k * oversample ANN candidates from PomaiDB
         (inner-product on L2-normalised vectors ≈ cosine similarity).
      3. For each candidate, fetch metadata from the kMeta membrane and
         filter to is_toxic == 0 — this is the metadata-filter constraint.
      4. Return the first top_k passing candidates with their similarity score.

    Args:
        db:           Open PomaiDB handle.
        query_smiles: SMILES string of the query compound.
        top_k:        Number of safe alternatives to return.
        oversample:   Multiplier for ANN candidate pool to compensate for
                      toxic compounds being filtered out.

    Returns:
        List of dicts: {"id", "smiles", "is_toxic", "similarity"}
    """
    log.info("Embedding query SMILES: %s", query_smiles)
    query_vec = get_embedding(query_smiles)

    candidate_k = top_k * oversample
    log.info(
        "Searching for top-%d candidates (will filter to %d safe)…",
        candidate_k, top_k,
    )
    results = pomaidb.search_batch(db, [query_vec.tolist()], topk=candidate_k)
    candidate_ids, candidate_scores = results[0]

    safe_alternatives = []
    for rid, score in zip(candidate_ids, candidate_scores):
        raw = pomaidb.meta_get(db, META_MEMBRANE, str(rid))
        if not raw:
            continue
        meta = json.loads(raw)

        # Metadata filter: is_toxic == 0
        if meta["is_toxic"] != 0:
            continue

        safe_alternatives.append({
            "id": rid,
            "smiles": meta["smiles"],
            "is_toxic": 0,
            "similarity": float(score),
        })

        if len(safe_alternatives) >= top_k:
            break

    log.info(
        "Found %d safe alternative(s) out of %d candidates inspected.",
        len(safe_alternatives), len(candidate_ids),
    )
    return safe_alternatives


# ===========================================================================
# Entry point
# ===========================================================================

def main():
    # -- Phase 1: Load & preprocess Tox21 --
    compounds = load_and_preprocess()

    # -- Phase 2: Generate ChemBERTa embeddings --
    compounds = generate_embeddings(compounds)

    # -- Phase 3: Ingest into PomaiDB --
    db = ingest_to_pomaidb(compounds)

    try:
        # -- Phase 4: Query with Aspirin as example --
        aspirin_smiles = "CC(=O)OC1=CC=CC=C1C(=O)O"
        log.info("=" * 60)
        log.info("Query compound (Aspirin): %s", aspirin_smiles)
        log.info("=" * 60)

        alternatives = find_safe_alternatives(db, aspirin_smiles, top_k=5)

        if not alternatives:
            log.warning("No safe alternatives found. Try increasing oversample parameter.")
        else:
            log.info("Top-%d safe alternatives:", len(alternatives))
            for rank, hit in enumerate(alternatives, start=1):
                log.info(
                    "  #%d  id=%-6d  similarity=%.4f  smiles=%s",
                    rank, hit["id"], hit["similarity"], hit["smiles"],
                )
    finally:
        pomaidb.close(db)
        log.info("Database closed.")


if __name__ == "__main__":
    main()
