"""
ingest.py — OpenFDA Drug Labels → PomaiDB ETL pipeline.

Usage:
    python ingest.py [--limit N] [--db-path PATH]

Defaults:
    --limit    1000
    --db-path  ./pomaidb_drugs

Data source: OpenFDA drug label API (api.fda.gov/drug/label.json)
  - Real FDA-approved drug labels, no auth required
  - Fields: brand name, generic name, indications, contraindications,
    dosage form, route, active ingredients, warnings

PomaiDB runs EMBEDDED inside this process — no server, no network socket.
Membranes:
    (default vector)    384-dim IP — ANN search
    drug_meta           kMeta  — full drug JSON keyed by numeric id
    drug_filters        kKV    — filter inverted index
    filter_values       kKV    — distinct values for each filter field
"""

import argparse
import json
import logging
import os
import sys
from typing import Any, Dict, List, Optional

import httpx

from _db import pomaidb
from embedder import embed

# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
DIM                    = 384
META_MEMBRANE          = "drug_meta"
FILTER_MEMBRANE        = "drug_filters"
FILTER_VALUES_MEMBRANE = "filter_values"
INSERT_BATCH           = 64
EMBED_BATCH            = 32
DEFAULT_DB_PATH        = "./pomaidb_drugs"
OPENFDA_URL            = "https://api.fda.gov/drug/label.json"
PAGE_SIZE              = 100   # OpenFDA max per request


# ---------------------------------------------------------------------------
# OpenFDA ingestion
# ---------------------------------------------------------------------------

def _first(lst: Optional[List], default: str = "") -> str:
    return lst[0].strip() if lst else default


def _join(lst: Optional[List], sep: str = "; ") -> str:
    return sep.join(s.strip() for s in lst) if lst else ""


def _extract_drug(record: Dict[str, Any], numeric_id: int) -> Optional[Dict]:
    """Flatten one OpenFDA drug label record into a structured drug dict."""
    openfda = record.get("openfda", {})

    brand_name   = _first(openfda.get("brand_name"))
    generic_name = _first(openfda.get("generic_name"))
    name         = brand_name or generic_name
    if not name:
        return None

    # Dose form — derive from route or product_type (cleaner than raw dosage text)
    route      = _first(openfda.get("route"))
    _pt        = _first(openfda.get("product_type"))
    if _pt == "HUMAN PRESCRIPTION DRUG":
        dose_form = "Prescription"
    elif _pt == "HUMAN OTC DRUG":
        dose_form = "OTC"
    elif _pt:
        dose_form = _pt.title()
    else:
        dose_form = ""
    status     = "active"   # FDA labels are current/active by definition

    substances: List[str] = openfda.get("substance_name", [])
    # Prefer active_ingredient free-text if substance list is missing
    if not substances:
        raw = _join(record.get("active_ingredient", []))
        if raw:
            substances = [raw[:200]]

    indications: List[str] = []
    for field in ("indications_and_usage", "purpose"):
        txt = _join(record.get(field, []))
        if txt:
            # Trim to 400 chars so embed text stays focused
            indications.append(txt[:400])
            break

    contraindications: List[str] = []
    for field in ("contraindications", "do_not_use"):
        txt = _join(record.get(field, []))
        if txt:
            contraindications.append(txt[:300])
            break

    warnings_txt = _join(record.get("warnings", []))[:300]

    # Text blob for embedding: rich clinical summary
    parts = [name]
    if generic_name and generic_name != name:
        parts.append(f"Generic: {generic_name}")
    if substances:
        parts.append("Active ingredients: " + ", ".join(substances[:5]))
    if indications:
        parts.append("Indications: " + indications[0])
    if contraindications:
        parts.append("Contraindicated in: " + contraindications[0])
    if route:
        parts.append(f"Route: {route}")
    if dose_form and dose_form not in ("Prescription", "OTC"):
        parts.append(f"Form: {dose_form}")

    return {
        "id":               numeric_id,
        "fda_id":           record.get("id", ""),
        "name":             name,
        "brand_name":       brand_name,
        "generic_name":     generic_name,
        "status":           status,
        "dose_form":        dose_form,
        "route":            route,
        "ingredients":      substances[:10],
        "indications":      indications,
        "contraindications":contraindications,
        "warnings":         warnings_txt,
        "embed_text":       ". ".join(parts),
    }


def fetch_openfda_drugs(limit: int) -> List[Dict]:
    """
    Page through OpenFDA drug label records using skip-based pagination.
    Returns up to `limit` parsed drug dicts.
    """
    drugs: List[Dict] = []
    numeric_id = 0
    skipped    = 0
    skip       = 0

    log.info("Fetching drug labels from OpenFDA (target=%d)…", limit)

    with httpx.Client(timeout=30.0, follow_redirects=True) as client:
        while len(drugs) < limit:
            params = {"limit": PAGE_SIZE, "skip": skip}
            log.info("  Fetching records %d–%d…", skip + 1, skip + PAGE_SIZE)
            try:
                resp = client.get(OPENFDA_URL, params=params)
                resp.raise_for_status()
            except httpx.HTTPStatusError as exc:
                if exc.response.status_code == 404:
                    log.info("  Reached end of OpenFDA dataset.")
                    break
                log.error("OpenFDA request failed: %s", exc)
                break
            except httpx.HTTPError as exc:
                log.error("Network error: %s", exc)
                break

            data = resp.json()
            results = data.get("results", [])
            if not results:
                log.info("  No more results.")
                break

            for record in results:
                if len(drugs) >= limit:
                    break
                drug = _extract_drug(record, numeric_id)
                if drug is None:
                    skipped += 1
                    continue
                drugs.append(drug)
                numeric_id += 1

            skip += PAGE_SIZE

    log.info(
        "Fetched %d drugs (%d skipped — no usable name).", len(drugs), skipped
    )
    return drugs


# ---------------------------------------------------------------------------
# PomaiDB
# ---------------------------------------------------------------------------

def _create_membrane(db, name: str, kind: int) -> None:
    """Create a membrane, silently ignoring 'already exists' errors."""
    try:
        pomaidb.create_membrane_kind(db, name, 0, 1, kind)
    except pomaidb.PomaiDBError as exc:
        if "already exists" not in str(exc).lower():
            raise


def open_db(db_path: str):
    log.info("Opening embedded PomaiDB at '%s' (dim=%d)…", db_path, DIM)
    db = pomaidb.open_db(db_path, dim=DIM, metric="ip", shards=1)
    _create_membrane(db, META_MEMBRANE,          pomaidb.MEMBRANE_KIND_META)
    _create_membrane(db, FILTER_MEMBRANE,        pomaidb.MEMBRANE_KIND_KEYVALUE)
    _create_membrane(db, FILTER_VALUES_MEMBRANE, pomaidb.MEMBRANE_KIND_KEYVALUE)
    try:
        if hasattr(pomaidb, "create_rag_membrane"):
            pomaidb.create_rag_membrane(db, "drug_rag", DIM)
    except Exception as e:
        if "already exists" not in str(e).lower():
            log.warning("drug_rag init failed: %s", e)
    log.info("Membranes ready.")
    return db


def ingest(db, drugs: List[Dict]) -> None:
    to_insert = [d for d in drugs if not pomaidb.exists(db, d["id"])]
    already   = len(drugs) - len(to_insert)
    if already:
        log.info("Skipping %d already-indexed records.", already)

    dose_forms: set = set()
    statuses:   set = set()
    routes:     set = set()

    if to_insert:
        log.info("Generating embeddings for %d drugs…", len(to_insert))
        texts   = [d["embed_text"] for d in to_insert]
        vectors = embed(texts, batch_size=EMBED_BATCH)
        log.info("Embeddings done.")

        log.info("Inserting into embedded PomaiDB (batch=%d)…", INSERT_BATCH)
        for batch_start in range(0, len(to_insert), INSERT_BATCH):
            batch = to_insert[batch_start: batch_start + INSERT_BATCH]
            vecs  = vectors[batch_start: batch_start + INSERT_BATCH]

            pomaidb.put_batch(db, [d["id"] for d in batch], [v.tolist() for v in vecs])

            for drug in batch:
                sid = str(drug["id"])
                pomaidb.meta_put(db, META_MEMBRANE, sid, json.dumps(drug))
                
                # Phase 6: RAG Ingestion
                try:
                    pomaidb.ingest_document(db, "drug_rag", drug["id"], drug["embed_text"])
                except Exception as e:
                    log.warning("RAG ingestion failed for %s: %s", drug["name"], e)

                if drug["dose_form"]:
                    pomaidb.kv_put(db, FILTER_MEMBRANE, f"doseForm:{drug['dose_form']}:{sid}", "1")
                    dose_forms.add(drug["dose_form"])
                if drug["status"]:
                    pomaidb.kv_put(db, FILTER_MEMBRANE, f"status:{drug['status']}:{sid}", "1")
                    statuses.add(drug["status"])
                if drug["route"]:
                    pomaidb.kv_put(db, FILTER_MEMBRANE, f"route:{drug['route']}:{sid}", "1")
                    routes.add(drug["route"])

            log.info("  Inserted %d / %d", min(batch_start + INSERT_BATCH, len(to_insert)), len(to_insert))
    else:
        # No new records — collect filter values from existing drug list for the merge step
        log.info("Scanning existing records to rebuild filter index…")
        for drug in drugs:
            if drug["dose_form"]:
                dose_forms.add(drug["dose_form"])
            if drug["status"]:
                statuses.add(drug["status"])
            if drug["route"]:
                routes.add(drug["route"])

    # Always write filter value summaries and freeze (idempotent)
    _merge_filter_set(db, "dose_forms", dose_forms)
    _merge_filter_set(db, "statuses",   statuses)
    _merge_filter_set(db, "routes",     routes)

    log.info("Freezing index…")
    pomaidb.freeze(db)
    log.info("Ingestion complete — %d new, %d total.", len(to_insert), len(drugs))


def _merge_filter_set(db, key: str, new_values: set) -> None:
    try:
        existing_raw = pomaidb.kv_get(db, FILTER_VALUES_MEMBRANE, key)
        existing     = set(json.loads(existing_raw)) if existing_raw else set()
    except pomaidb.PomaiDBError:
        existing = set()
    pomaidb.kv_put(db, FILTER_VALUES_MEMBRANE, key, json.dumps(sorted(existing | new_values)))


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Ingest FDA drug labels into embedded PomaiDB"
    )
    parser.add_argument("--limit",   type=int, default=1000,
                        help="Number of drug labels to ingest (default: 1000)")
    parser.add_argument("--db-path", default=DEFAULT_DB_PATH,
                        help="PomaiDB directory (default: ./pomaidb_drugs)")
    args = parser.parse_args()

    drugs = fetch_openfda_drugs(args.limit)
    if not drugs:
        log.error("No drugs fetched — check network connectivity.")
        sys.exit(1)

    db = open_db(args.db_path)
    try:
        ingest(db, drugs)
    finally:
        pomaidb.close(db)
        log.info("Embedded database closed.")


if __name__ == "__main__":
    main()
