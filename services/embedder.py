"""
embedder.py — Singleton text embedding wrapper.

Uses sentence-transformers/all-MiniLM-L6-v2:
  - 384-dimensional output
  - Vectors are L2-normalised by the library (normalize_embeddings=True)
  - Runs on CPU; no GPU required
  - ~80 MB model download on first use
"""

import logging
from typing import List, Union

import numpy as np

log = logging.getLogger(__name__)

_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
_model = None


def _get_model():
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        log.info("Loading embedding model '%s'…", _MODEL_NAME)
        _model = SentenceTransformer(_MODEL_NAME)
        log.info("Embedding model ready (dim=384).")
    return _model


def embed(texts: Union[str, List[str]], batch_size: int = 32) -> np.ndarray:
    """
    Embed one or more text strings.

    Args:
        texts:      A single string or a list of strings.
        batch_size: Inference batch size (controls memory usage).

    Returns:
        np.ndarray of shape (384,) for a single string,
        or (N, 384) for a list of N strings.
        All vectors are L2-normalised (ready for inner-product similarity).
    """
    single = isinstance(texts, str)
    inputs = [texts] if single else texts

    model = _get_model()
    vectors = model.encode(
        inputs,
        batch_size=batch_size,
        normalize_embeddings=True,
        show_progress_bar=False,
    )
    return vectors[0] if single else vectors
