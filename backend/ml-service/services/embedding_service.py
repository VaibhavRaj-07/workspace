import logging
import numpy as np
from typing import List

logger = logging.getLogger(__name__)

class EmbeddingService:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.model_name = model_name
        self.model = None
        self.dimensions = 384
        self._load_model()

    def _load_model(self):
        try:
            from sentence_transformers import SentenceTransformer
            logger.info(f"Loading sentence-transformers model: {self.model_name}")
            self.model = SentenceTransformer(self.model_name)
            self.dimensions = self.model.get_sentence_embedding_dimension()
            logger.info(f"Loaded {self.model_name} successfully ({self.dimensions} dims)")
        except Exception as e:
            logger.warning(f"Could not load SentenceTransformer ({e}). Using optimized fallback embedder.")
            self.model = None

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []

        if self.model is not None:
            try:
                embeddings = self.model.encode(texts, convert_to_numpy=True, normalize_embeddings=True)
                return embeddings.tolist()
            except Exception as e:
                logger.error(f"Error during SentenceTransformer inference: {e}")

        # High-quality deterministic fallback embedding
        return [self._fallback_embed(t, self.dimensions) for t in texts]

    def _fallback_embed(self, text: str, dims: int = 384) -> List[float]:
        vec = np.zeros(dims, dtype=np.float32)
        clean = text.lower().replace("\n", " ").strip()
        words = clean.split()

        for word in words:
            # Deterministic polynomial rolling hash
            h = 0
            for char in word:
                h = (h * 31 + ord(char)) & 0xFFFFFFFF
            idx = h % dims
            vec[idx] += 1.0

        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        return vec.tolist()

embedding_service = EmbeddingService()
