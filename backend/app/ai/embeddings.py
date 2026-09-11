"""Local, offline semantic embeddings for duplicate/similarity detection.

Uses `fastembed` (ONNX runtime, no torch, no API key) so duplicate detection
works out of the box on any machine -- including a judge's laptop with no
internet and no API budget. The model is downloaded once (~130MB) and cached
locally afterwards.
"""
import logging
import threading

logger = logging.getLogger("campuspulse.ai.embeddings")

EMBEDDING_DIM = 384
_MODEL_NAME = "BAAI/bge-small-en-v1.5"

_model = None
_model_lock = threading.Lock()


def _get_model():
    global _model
    if _model is None:
        with _model_lock:
            if _model is None:
                from fastembed import TextEmbedding

                logger.info("Loading local embedding model (%s)...", _MODEL_NAME)
                _model = TextEmbedding(model_name=_MODEL_NAME)
                logger.info("Embedding model ready.")
    return _model


def embed_text(text: str) -> list[float]:
    """Embed a single piece of text into a fixed-length vector."""
    model = _get_model()
    vector = next(model.embed([text]))
    return vector.tolist()
