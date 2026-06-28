import hashlib
import re
from dataclasses import dataclass


@dataclass(frozen=True)
class TextChunk:
    content: str
    content_hash: str
    token_count: int
    page_number: int | None = None


class ChunkingService:
    def __init__(self, chunk_chars: int = 2800, overlap_chars: int = 400) -> None:
        self.chunk_chars = chunk_chars
        self.overlap_chars = overlap_chars

    def chunk(self, text: str) -> list[TextChunk]:
        normalized = re.sub(r"\n{3,}", "\n\n", text.strip())
        if not normalized:
            return []

        chunks: list[TextChunk] = []
        start = 0
        while start < len(normalized):
            end = min(start + self.chunk_chars, len(normalized))
            if end < len(normalized):
                paragraph_break = normalized.rfind("\n\n", start, end)
                sentence_break = normalized.rfind(". ", start, end)
                boundary = max(paragraph_break, sentence_break)
                if boundary > start + int(self.chunk_chars * 0.55):
                    end = boundary + 1

            content = normalized[start:end].strip()
            if content:
                chunks.append(
                    TextChunk(
                        content=content,
                        content_hash=hashlib.sha256(content.encode("utf-8")).hexdigest(),
                        token_count=max(1, len(content) // 4),
                    )
                )

            if end >= len(normalized):
                break
            start = max(0, end - self.overlap_chars)

        return chunks
