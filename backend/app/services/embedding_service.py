import hashlib
import math
import re
import time

from app.core.config import settings


class EmbeddingService:
    def __init__(self) -> None:
        self.dimension = settings.gemini_embedding_dimension
        self.batch_size = settings.embedding_batch_size

    def embed_query(self, text: str) -> list[float]:
        return self.embed_documents([text], task_type="RETRIEVAL_QUERY")[0]

    def embed_documents(self, texts: list[str], task_type: str = "RETRIEVAL_DOCUMENT") -> list[list[float]]:
        if not texts:
            return []
        if not settings.gemini_api_key:
            return [self._fallback_embedding(text) for text in texts]
        return self._embed_with_gemini(texts, task_type=task_type)

    def _embed_with_gemini(self, texts: list[str], *, task_type: str) -> list[list[float]]:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=settings.gemini_api_key)
        vectors: list[list[float]] = []
        for offset in range(0, len(texts), self.batch_size):
            batch = texts[offset : offset + self.batch_size]
            response = self._with_retry(
                lambda: client.models.embed_content(
                    model=settings.gemini_embedding_model,
                    contents=batch,
                    config=types.EmbedContentConfig(
                        output_dimensionality=self.dimension,
                        task_type=task_type,
                    ),
                )
            )
            embeddings = getattr(response, "embeddings", None) or []
            if len(embeddings) != len(batch):
                raise RuntimeError("Gemini returned an unexpected number of embeddings")
            for embedding in embeddings:
                values = list(getattr(embedding, "values", None) or [])
                if len(values) != self.dimension:
                    raise RuntimeError(
                        "Gemini embedding dimension mismatch. Re-index documents after aligning "
                        "GEMINI_EMBEDDING_DIMENSION with the configured model."
                    )
                vectors.append(self._normalize(values))
        close = getattr(client, "close", None)
        if callable(close):
            close()
        return vectors

    def _with_retry(self, operation):
        delay = 0.7
        last_error: Exception | None = None
        for _ in range(3):
            try:
                return operation()
            except Exception as exc:  # noqa: BLE001 - SDK exceptions vary by transport.
                last_error = exc
                time.sleep(delay)
                delay *= 2
        raise RuntimeError(f"Gemini embedding request failed: {last_error}") from last_error

    def _fallback_embedding(self, text: str) -> list[float]:
        tokens = re.findall(r"[a-z0-9][a-z0-9_-]{1,}", text.lower())
        if not tokens:
            tokens = [hashlib.sha256(text.encode("utf-8")).hexdigest()]

        values = [0.0] * self.dimension
        for token in tokens:
            digest = hashlib.sha256(token.encode("utf-8")).digest()
            index = int.from_bytes(digest[:4], "big") % self.dimension
            sign = 1.0 if digest[4] % 2 else -1.0
            values[index] += sign
        return self._normalize(values)

    @staticmethod
    def _normalize(values: list[float]) -> list[float]:
        norm = math.sqrt(sum(value * value for value in values)) or 1.0
        return [value / norm for value in values]
