"""
search_engine.py — Hybrid drug search: ANN vector similarity + metadata filters.

PomaiDB runs embedded inside this process — no server, no network socket.

Strategy:
  1. Embed the natural-language query with MiniLM (384-dim, L2-normalised).
  2. Retrieve top_k * OVERSAMPLE candidates via inner-product ANN (search_batch).
  3. For each candidate, load full drug JSON from the kMeta membrane.
  4. Apply structured filters (dose_form, status) client-side.
  5. Return the first top_k passing candidates with similarity scores.
"""

import json
import logging
from typing import Any, Dict, List, Optional

from _db import pomaidb, search_one
from embedder import embed
from ingest import META_MEMBRANE, FILTER_VALUES_MEMBRANE

log = logging.getLogger(__name__)

OVERSAMPLE = 30


def find_drugs(
    db,
    query: str,
    filters: Optional[Dict[str, str]] = None,
    top_k: int = 10,
    patient_friendly: bool = False,
) -> List[Dict[str, Any]]:
    """
    Hybrid search: semantic ANN similarity + structured metadata filter.

    Args:
        db:      Open embedded PomaiDB handle.
        query:   Plain-English clinical question or drug name.
        filters: Optional {"dose_form": str, "status": str} — ANDed together.
        top_k:   Number of results to return.
        patient_friendly: If True, include simplified summaries.

    Returns:
        List of drug dicts with an added "similarity" float (0–1).
    """
    filters = filters or {}
    query_vec = embed(query)

    candidate_k = max(top_k * OVERSAMPLE, 100)
    
    # Phase 6: Try RAG search first for highly relevant snippets
    candidate_ids, candidate_scores = [], []
    try:
        rag_hits = pomaidb.search_rag(db, "drug_rag", vector=query_vec.tolist(), topk=candidate_k)
        seen = set()
        for hit in rag_hits:
            doc_id = hit[1]
            if doc_id not in seen:
                candidate_ids.append(doc_id)
                candidate_scores.append(1.0) # High confidence for RAG match
                seen.add(doc_id)
    except Exception as e:
        log.warning("RAG search failed: %s", e)

    # Fallback/Augment with ANN if needed
    if len(candidate_ids) < top_k:
        ann_ids, ann_scores = search_one(db, query_vec.tolist(), topk=candidate_k)
        seen = set(candidate_ids)
        for rid, score in zip(ann_ids, ann_scores):
            if rid not in seen:
                candidate_ids.append(rid)
                candidate_scores.append(score)
                seen.add(rid)

    results: List[Dict[str, Any]] = []
    for rid, score in zip(candidate_ids, candidate_scores):
        raw_meta = pomaidb.meta_get(db, META_MEMBRANE, str(rid))
        if not raw_meta:
            continue
        drug = json.loads(raw_meta)
        if not _passes_filters(drug, filters):
            continue
        
        drug["similarity"] = round(float(score), 4)
        
        # High-risk detection (rule-based contraindication and warning analysis)
        cons = " ".join(drug.get("contraindications", [])).lower()
        warn = drug.get("warnings", "").lower()
        risk_text = cons + " " + warn
        
        risk_keywords = [
            "death", "fatal", "severe", "life-threatening", "suicidal", 
            "black box", "emergency", "cardiac arrest", "respiratory depression"
        ]
        drug["is_high_risk"] = any(w in risk_text for w in risk_keywords)

        if patient_friendly:
            drug["indications"] = [_simplify_medical_text(ind) for ind in drug.get("indications", [])]
            drug["patient_note"] = "Always consult with a healthcare professional before starting new medication."

        results.append(drug)
        if len(results) >= top_k:
            break

    log.info(
        "Query '%s' filters=%s pf=%s → %d results",
        query[:60], filters, patient_friendly, len(results)
    )
    return results


def _simplify_medical_text(text: str) -> str:
    """Simple rule-based simplification for 'patient-friendly' mode."""
    # This is a placeholder for real simplification logic or LLM call
    replacements = {
        "indications and usage": "What it's for",
        "contraindications": "Who should not use it",
        "adverse reactions": "Side effects",
        "hypertension": "High blood pressure",
        "analgesic": "Pain reliever",
        "antipyretic": "Fever reducer",
    }
    for old, new in replacements.items():
        text = text.replace(old, new).replace(old.capitalize(), new.capitalize())
    return text


def _passes_filters(drug: Dict, filters: Dict[str, str]) -> bool:
    for field, value in filters.items():
        if not value:
            continue
        if field == "dose_form" and drug.get("dose_form", "").lower() != value.lower():
            return False
        if field == "status" and drug.get("status", "").lower() != value.lower():
            return False
        if field == "route" and drug.get("route", "").lower() != value.lower():
            return False
        if field == "ingredient":
            # Partial match for active ingredients
            ings = [i.lower() for i in drug.get("ingredients", [])]
            if not any(value.lower() in i for i in ings):
                return False
    return True


def get_drug_by_id(db, drug_id: int) -> Optional[Dict[str, Any]]:
    raw = pomaidb.meta_get(db, META_MEMBRANE, str(drug_id))
    return json.loads(raw) if raw else None


def get_filter_values(db) -> Dict[str, List[str]]:
    dose_forms_raw = pomaidb.kv_get(db, FILTER_VALUES_MEMBRANE, "dose_forms")
    statuses_raw   = pomaidb.kv_get(db, FILTER_VALUES_MEMBRANE, "statuses")
    routes_raw     = pomaidb.kv_get(db, FILTER_VALUES_MEMBRANE, "routes")
    return {
        "dose_forms": json.loads(dose_forms_raw) if dose_forms_raw else [],
        "statuses":   json.loads(statuses_raw)   if statuses_raw   else [],
        "routes":     json.loads(routes_raw)     if routes_raw     else [],
    }
