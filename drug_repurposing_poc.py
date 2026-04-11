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
import ctypes as _ct

# ── Low-level search_one wrapper (avoids search_batch segfault) ──
class _PomaiQuery(_ct.Structure):
    _fields_ = [
        ("struct_size",           _ct.c_uint32), ("vector", _ct.POINTER(_ct.c_float)),
        ("dim", _ct.c_uint32), ("topk", _ct.c_uint32), ("filter_expression", _ct.c_char_p),
        ("partition_device_id", _ct.c_char_p), ("partition_location_id", _ct.c_char_p),
        ("as_of_ts", _ct.c_uint64), ("as_of_lsn", _ct.c_uint64), ("aggregate_op", _ct.c_uint32),
        ("aggregate_field", _ct.c_char_p), ("aggregate_topk", _ct.c_uint32),
        ("mesh_detail_preference", _ct.c_uint32), ("alpha", _ct.c_float),
        ("deadline_ms", _ct.c_uint32), ("flags", _ct.c_uint32),
    ]

class _PomaiSemanticPointer(_ct.Structure):
    _fields_ = [("struct_size", _ct.c_uint32), ("raw_data_ptr", _ct.c_void_p), ("dim", _ct.c_uint32),
                ("quant_min", _ct.c_float), ("quant_inv_scale", _ct.c_float), ("session_id", _ct.c_uint64)]

class _PomaiSearchResults(_ct.Structure):
    _fields_ = [
        ("struct_size", _ct.c_uint32), ("count", _ct.c_size_t),
        ("ids", _ct.POINTER(_ct.c_uint64)), ("scores", _ct.POINTER(_ct.c_float)),
        ("shard_ids", _ct.POINTER(_ct.c_uint32)), ("total_shards_count", _ct.c_uint32),
        ("pruned_shards_count", _ct.c_uint32), ("aggregate_value", _ct.c_double),
        ("aggregate_op", _ct.c_uint32), ("mesh_lod_level", _ct.c_uint32),
        ("zero_copy_pointers", _ct.POINTER(_PomaiSemanticPointer)),
    ]

def search_one(db, vector: list, topk: int = 10):
    lib = pomaidb._lib
    if not hasattr(lib.pomai_search, 'argtypes'):
        lib.pomai_search.argtypes = [_ct.c_void_p, _ct.POINTER(_PomaiQuery), _ct.POINTER(_ct.POINTER(_PomaiSearchResults))]
        lib.pomai_search.restype = _ct.c_void_p
        lib.pomai_search_results_free.argtypes = [_ct.POINTER(_PomaiSearchResults)]
        lib.pomai_search_results_free.restype = None

    dim = len(vector)
    c_vec = (_ct.c_float * dim)(*vector)
    q = _PomaiQuery(struct_size=_ct.sizeof(_PomaiQuery), vector=_ct.cast(c_vec, _ct.POINTER(_ct.c_float)), 
                    dim=dim, topk=topk, alpha=1.0)
    out_ptr = _ct.POINTER(_PomaiSearchResults)()
    status = lib.pomai_search(db, _ct.byref(q), _ct.byref(out_ptr))
    if status:
        msg = lib.pomai_status_message(status).decode("utf-8", errors="replace")
        lib.pomai_status_free(status)
        raise pomaidb.PomaiDBError(msg)
    res = out_ptr.contents
    cnt = min(topk, res.count)
    ids, scores = [int(res.ids[i]) for i in range(cnt)], [float(res.scores[i]) for i in range(cnt)]
    lib.pomai_search_results_free(out_ptr)
    return ids, scores


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
    candidate_ids, candidate_scores = search_one(db, query_vec.tolist(), topk=candidate_k)

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
# Phase 5 — 3D Molecular Docking Search (USRCAT shape fingerprints)
# ===========================================================================

DOCKING_DB_PATH    = "./pomaidb_docking"
DOCKING_META       = "compound_meta_3d"
USRCAT_DIM         = 60   # RDKit USRCAT descriptor dimension
_EMBED_WORKERS     = 4    # Thread-pool workers for 3D conformer generation


def get_3d_fingerprint(smiles: str) -> "Optional[np.ndarray]":
    """
    Convert a SMILES string to a L2-normalised 60-dim USRCAT fingerprint.

    USRCAT (Ultrafast Shape Recognition with CREDO Atom Types) encodes
    the 3-D shape and pharmacophoric features of a molecule.

    Returns None if:
      - RDKit is not installed
      - SMILES is invalid
      - 3D conformer generation fails (rare for drug-like molecules)
    """
    try:
        from rdkit import Chem
        from rdkit.Chem import AllChem, rdMolDescriptors
    except ImportError:
        log.error("rdkit-pypi not installed. Run: pip install rdkit-pypi")
        return None

    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return None

    mol = Chem.AddHs(mol)
    params = AllChem.ETKDGv3()
    params.randomSeed = 42
    if AllChem.EmbedMolecule(mol, params) != 0:
        return None  # conformer generation failed

    try:
        AllChem.MMFFOptimizeMolecule(mol)
    except Exception:
        pass  # optimisation is best-effort

    try:
        usrcat = rdMolDescriptors.GetUSRCAT(mol)   # returns tuple of 60 floats
    except Exception:
        return None

    vec = np.array(usrcat, dtype=np.float32)
    norm = np.linalg.norm(vec)
    return vec / norm if norm > 0 else vec


def _fp_worker(compound: Dict) -> Dict:
    """Generate 3D fingerprint for a single compound (used in ThreadPoolExecutor)."""
    fp = get_3d_fingerprint(compound["smiles"])
    if fp is not None:
        compound["vector_3d"] = fp
    return compound


def ingest_to_pomaidb_3d(compounds: List[Dict]):
    """
    Build a separate PomaiDB at DOCKING_DB_PATH (60-dim USRCAT vectors).
    Compounds without a valid 3D conformer are skipped.

    Returns the open db handle — caller is responsible for pomaidb.close(db).
    """
    from concurrent.futures import ThreadPoolExecutor, as_completed

    log.info("Generating 3D USRCAT fingerprints (workers=%d)…", _EMBED_WORKERS)
    enriched: List[Dict] = []
    failed = 0
    with ThreadPoolExecutor(max_workers=_EMBED_WORKERS) as pool:
        futures = {pool.submit(_fp_worker, dict(c)): c for c in compounds}
        for fut in as_completed(futures):
            result = fut.result()
            if "vector_3d" in result:
                enriched.append(result)
            else:
                failed += 1

    log.info(
        "3D fingerprints: %d generated, %d failed (bad SMILES / no conformer)",
        len(enriched), failed,
    )
    if not enriched:
        raise RuntimeError("No valid 3D conformers generated — check RDKit installation.")

    log.info("Opening docking PomaiDB at '%s' (dim=%d)…", DOCKING_DB_PATH, USRCAT_DIM)
    db = pomaidb.open_db(DOCKING_DB_PATH, dim=USRCAT_DIM, metric="ip", shards=1)

    try:
        pomaidb.create_membrane_kind(db, DOCKING_META, 0, 1, pomaidb.MEMBRANE_KIND_META)
    except pomaidb.PomaiDBError as e:
        if "already exists" not in str(e).lower():
            raise

    log.info("Inserting %d 3D vectors…", len(enriched))
    for batch_start in range(0, len(enriched), INSERT_BATCH_SIZE):
        batch = enriched[batch_start: batch_start + INSERT_BATCH_SIZE]
        pomaidb.put_batch(db, [c["id"] for c in batch],
                          [c["vector_3d"].tolist() for c in batch])
        for c in batch:
            pomaidb.meta_put(db, DOCKING_META, str(c["id"]), json.dumps({
                "smiles":   c["smiles"],
                "is_toxic": c["is_toxic"],
            }))
        log.info("  Inserted %d / %d", min(batch_start + INSERT_BATCH_SIZE, len(enriched)),
                 len(enriched))

    pomaidb.freeze(db)
    log.info("3D docking DB ready — %d compounds indexed.", len(enriched))
    return db


def find_shape_similar(db, query_smiles: str, top_k: int = 5,
                       oversample: int = 10) -> List[Dict]:
    """
    Find top_k non-toxic compounds whose 3D shape best matches query_smiles.
    Uses USRCAT shape similarity (L2-normalised inner-product ≈ cosine).
    """
    fp = get_3d_fingerprint(query_smiles)
    if fp is None:
        log.warning("Could not generate 3D fingerprint for: %s", query_smiles)
        return []

    candidate_ids, candidate_scores = search_one(db, fp.tolist(), topk=top_k * oversample)

    safe = []
    for rid, score in zip(candidate_ids, candidate_scores):
        raw = pomaidb.meta_get(db, DOCKING_META, str(rid))
        if not raw:
            continue
        meta = json.loads(raw)
        if meta["is_toxic"] != 0:
            continue
        safe.append({"id": rid, "smiles": meta["smiles"],
                     "is_toxic": 0, "similarity": float(score)})
        if len(safe) >= top_k:
            break

    log.info("3D search: %d safe hits from %d candidates", len(safe), len(candidate_ids))
    return safe


def docking_search_poc():
    """
    End-to-end 3D docking PoC:
      1. Load Tox21 compounds (same dataset as ChemBERTa pipeline).
      2. Generate USRCAT 3D fingerprints in parallel.
      3. Ingest into a separate PomaiDB (60-dim).
      4. Query with Aspirin — compare 3D USRCAT vs 1D ChemBERTa results.
    """
    compounds = load_and_preprocess()

    db_3d = ingest_to_pomaidb_3d(compounds)

    aspirin_smiles = "CC(=O)OC1=CC=CC=C1C(=O)O"
    log.info("=" * 60)
    log.info("3D Query (Aspirin): %s", aspirin_smiles)
    log.info("=" * 60)

    hits_3d = find_shape_similar(db_3d, aspirin_smiles, top_k=5)
    if hits_3d:
        log.info("Top-5 3D shape-similar safe compounds (USRCAT):")
        for rank, h in enumerate(hits_3d, 1):
            log.info("  #%d  sim=%.4f  smiles=%s", rank, h["similarity"], h["smiles"])
    else:
        log.warning("No 3D safe alternatives found.")

    # Side-by-side comparison: re-run ChemBERTa on same query
    log.info("-" * 60)
    log.info("1D ChemBERTa comparison (same query):")
    db_1d = ingest_to_pomaidb(generate_embeddings(compounds))
    hits_1d = find_safe_alternatives(db_1d, aspirin_smiles, top_k=5)
    for rank, h in enumerate(hits_1d, 1):
        log.info("  #%d  sim=%.4f  smiles=%s", rank, h["similarity"], h["smiles"])

    pomaidb.close(db_3d)
    pomaidb.close(db_1d)
    log.info("Docking PoC complete.")


# ===========================================================================
# Entry point
# ===========================================================================

def main():
    import argparse as _argparse
    parser = _argparse.ArgumentParser(
        description="Drug repurposing / 3D docking PoC"
    )
    parser.add_argument(
        "--mode",
        choices=["chemberta", "docking", "both"],
        default="chemberta",
        help="chemberta (default 1D pipeline), docking (3D USRCAT), both",
    )
    args = parser.parse_args()

    if args.mode in ("chemberta", "both"):
        # -- Phase 1-4: ChemBERTa pipeline --
        compounds = load_and_preprocess()
        compounds = generate_embeddings(compounds)
        db = ingest_to_pomaidb(compounds)
        try:
            aspirin_smiles = "CC(=O)OC1=CC=CC=C1C(=O)O"
            log.info("=" * 60)
            log.info("ChemBERTa query (Aspirin): %s", aspirin_smiles)
            log.info("=" * 60)
            alternatives = find_safe_alternatives(db, aspirin_smiles, top_k=5)
            if not alternatives:
                log.warning("No safe alternatives found.")
            else:
                log.info("Top-%d safe alternatives:", len(alternatives))
                for rank, hit in enumerate(alternatives, start=1):
                    log.info("  #%d  id=%-6d  sim=%.4f  smiles=%s",
                             rank, hit["id"], hit["similarity"], hit["smiles"])
        finally:
            pomaidb.close(db)
            log.info("ChemBERTa database closed.")

    if args.mode in ("docking", "both"):
        # -- Phase 5: 3D USRCAT docking pipeline --
        docking_search_poc()


if __name__ == "__main__":
    main()
