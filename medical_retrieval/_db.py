"""
_db.py — Embedded PomaiDB bootstrap for medical_retrieval.

Locates and loads libpomai_c.so from the pomaidb submodule that lives
alongside this package.  All other modules import pomaidb through here
so there is exactly one place that knows about the path layout.

Usage (in every other module):
    from _db import pomaidb
"""

import os
import sys

# ── Locate repo root (parent of medical_retrieval/) ───────────────────────
_THIS_DIR  = os.path.dirname(os.path.abspath(__file__))
_REPO_ROOT = os.path.dirname(_THIS_DIR)

# ── Add pomaidb Python client to sys.path ─────────────────────────────────
_POMAIDB_PYTHON = os.path.join(_REPO_ROOT, "pomaidb", "python")
if _POMAIDB_PYTHON not in sys.path:
    sys.path.insert(0, _POMAIDB_PYTHON)

# ── Point the ctypes loader at the compiled .so ──────────────────────────
# The pomaidb client reads POMAI_C_LIB env-var before its own default path.
# We set it here (only if not already set by the user) so the import works
# without any manual env setup.
if not os.environ.get("POMAI_C_LIB"):
    _so = os.path.join(_REPO_ROOT, "pomaidb", "build", "libpomai_c.so")
    _dylib = os.path.join(_REPO_ROOT, "pomaidb", "build", "libpomai_c.dylib")
    _found = _so if os.path.isfile(_so) else (_dylib if os.path.isfile(_dylib) else None)
    if _found is None:
        raise RuntimeError(
            "libpomai_c.so not found. Build the native library first:\n"
            f"  cd {os.path.join(_REPO_ROOT, 'pomaidb')}\n"
            "  cmake -B build -DCMAKE_BUILD_TYPE=Release "
            "-DPOMAI_BUILD_TESTS=OFF && cmake --build build --target pomai_c -j$(nproc)"
        )
    os.environ["POMAI_C_LIB"] = _found

import pomaidb  # noqa: E402 — must come after env var is set

# ── Low-level single-query search (mirrors official python_basic.py example) ─
# The high-level pomaidb.search_batch() segfaults; use pomai_search directly.
import ctypes as _ct

# _raw is resolved lazily in search_one() because pomaidb._lib is populated
# only after the first pomaidb.open_db() call (_ensure_lib runs then).
_raw = None


class _PomaiQuery(_ct.Structure):
    _fields_ = [
        ("struct_size",           _ct.c_uint32),
        ("vector",                _ct.POINTER(_ct.c_float)),
        ("dim",                   _ct.c_uint32),
        ("topk",                  _ct.c_uint32),
        ("filter_expression",     _ct.c_char_p),
        ("partition_device_id",   _ct.c_char_p),
        ("partition_location_id", _ct.c_char_p),
        ("as_of_ts",              _ct.c_uint64),
        ("as_of_lsn",             _ct.c_uint64),
        ("aggregate_op",          _ct.c_uint32),
        ("aggregate_field",       _ct.c_char_p),
        ("aggregate_topk",        _ct.c_uint32),
        ("mesh_detail_preference",_ct.c_uint32),
        ("alpha",                 _ct.c_float),
        ("deadline_ms",           _ct.c_uint32),
        ("flags",                 _ct.c_uint32),
    ]


class _PomaiSemanticPointer(_ct.Structure):
    _fields_ = [
        ("struct_size",      _ct.c_uint32),
        ("raw_data_ptr",     _ct.c_void_p),
        ("dim",              _ct.c_uint32),
        ("quant_min",        _ct.c_float),
        ("quant_inv_scale",  _ct.c_float),
        ("session_id",       _ct.c_uint64),
    ]


class _PomaiSearchResults(_ct.Structure):
    _fields_ = [
        ("struct_size",          _ct.c_uint32),
        ("count",                _ct.c_size_t),
        ("ids",                  _ct.POINTER(_ct.c_uint64)),
        ("scores",               _ct.POINTER(_ct.c_float)),
        ("shard_ids",            _ct.POINTER(_ct.c_uint32)),
        ("total_shards_count",   _ct.c_uint32),
        ("pruned_shards_count",  _ct.c_uint32),
        ("aggregate_value",      _ct.c_double),
        ("aggregate_op",         _ct.c_uint32),
        ("mesh_lod_level",       _ct.c_uint32),
        ("zero_copy_pointers",   _ct.POINTER(_PomaiSemanticPointer)),
    ]


def _init_raw():
    """Bind pomai_search signatures — called once after the lib is loaded."""
    global _raw
    if _raw is not None:
        return
    _raw = pomaidb._lib
    _raw.pomai_search.argtypes = [
        _ct.c_void_p,
        _ct.POINTER(_PomaiQuery),
        _ct.POINTER(_ct.POINTER(_PomaiSearchResults)),
    ]
    _raw.pomai_search.restype = _ct.c_void_p
    _raw.pomai_search_results_free.argtypes = [_ct.POINTER(_PomaiSearchResults)]
    _raw.pomai_search_results_free.restype = None


def search_one(db, vector: list, topk: int = 10):
    """
    Search for the top-k nearest vectors to `vector`.

    Uses pomai_search (single-query C API) instead of search_batch,
    which has a known segfault in the Python client wrapper.

    Args:
        db:     Open PomaiDB handle.
        vector: List of floats (must match DB dim).
        topk:   Number of results.

    Returns:
        (ids: list[int], scores: list[float])
    """
    _init_raw()
    dim = len(vector)
    c_vec = (_ct.c_float * dim)(*vector)

    q = _PomaiQuery()
    q.struct_size           = _ct.sizeof(_PomaiQuery)
    q.vector                = _ct.cast(c_vec, _ct.POINTER(_ct.c_float))
    q.dim                   = dim
    q.topk                  = topk
    q.filter_expression     = None
    q.partition_device_id   = None
    q.partition_location_id = None
    q.as_of_ts              = 0
    q.as_of_lsn             = 0
    q.aggregate_op          = 0
    q.aggregate_field       = None
    q.aggregate_topk        = 0
    q.mesh_detail_preference= 0
    q.alpha                 = 1.0
    q.deadline_ms           = 0
    q.flags                 = 0

    out_ptr = _ct.POINTER(_PomaiSearchResults)()
    status  = _raw.pomai_search(db, _ct.byref(q), _ct.byref(out_ptr))
    if status:
        msg = pomaidb._lib.pomai_status_message(status).decode("utf-8", errors="replace")
        pomaidb._lib.pomai_status_free(status)
        raise pomaidb.PomaiDBError(msg)

    res   = out_ptr.contents
    count = min(topk, res.count)
    ids    = [int(res.ids[i])    for i in range(count)]
    scores = [float(res.scores[i]) for i in range(count)]
    _raw.pomai_search_results_free(out_ptr)
    return ids, scores


__all__ = ["pomaidb", "search_one"]
