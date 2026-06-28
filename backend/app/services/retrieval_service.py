import re
from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.permissions import can_access_all_documents
from app.models.entities import Document, DocumentACL, DocumentChunk
from app.services.gemini_service import RetrievedSource

STOPWORDS = {
    "about",
    "after",
    "also",
    "and",
    "are",
    "can",
    "could",
    "for",
    "from",
    "give",
    "has",
    "have",
    "how",
    "into",
    "is",
    "me",
    "of",
    "on",
    "or",
    "please",
    "show",
    "tell",
    "the",
    "this",
    "to",
    "what",
    "when",
    "where",
    "which",
    "who",
    "why",
    "with",
    "you",
}


@dataclass(frozen=True)
class RetrievalContext:
    tenant_id: UUID
    role: str


class RetrievalService:
    def search(
        self,
        db: Session,
        *,
        context: RetrievalContext,
        query: str,
        query_embedding: list[float],
        limit: int | None = None,
    ) -> list[RetrievedSource]:
        effective_limit = limit or settings.retrieval_limit
        distance = DocumentChunk.embedding.cosine_distance(query_embedding).label("distance")
        stmt = (
            select(DocumentChunk, Document, distance)
            .join(Document, Document.id == DocumentChunk.document_id)
            .where(
                DocumentChunk.tenant_id == context.tenant_id,
                Document.tenant_id == context.tenant_id,
                Document.status == "indexed",
                DocumentChunk.embedding.is_not(None),
            )
            .order_by(distance)
            .limit(effective_limit)
        )

        if not can_access_all_documents(context.role):
            stmt = stmt.join(
                DocumentACL,
                and_(
                    DocumentACL.document_id == Document.id,
                    DocumentACL.tenant_id == context.tenant_id,
                    DocumentACL.principal_type == "role",
                    DocumentACL.principal_id == context.role,
                    DocumentACL.permission == "read",
                ),
            )

        rows = db.execute(stmt).all()
        sources: list[RetrievedSource] = []
        query_tokens = _meaningful_tokens(query)
        for chunk, document, raw_distance in rows:
            score = max(0.0, min(1.0, 1.0 - float(raw_distance or 0)))
            if score < settings.retrieval_min_score:
                continue
            if not settings.gemini_api_key and not _has_fallback_keyword_overlap(
                query_tokens=query_tokens,
                title=document.title,
                content=chunk.content,
            ):
                continue
            snippet = chunk.content[:380].replace("\n", " ").strip()
            sources.append(
                RetrievedSource(
                    document_id=str(document.id),
                    title=document.title,
                    source_uri=document.source_uri,
                    score=round(score, 4),
                    snippet=snippet,
                    content=chunk.content,
                )
            )
        return sources


def _meaningful_tokens(text: str) -> set[str]:
    tokens = re.findall(r"[a-z0-9][a-z0-9_-]+", text.lower())
    return {token for token in tokens if token not in STOPWORDS}


def _has_fallback_keyword_overlap(*, query_tokens: set[str], title: str, content: str) -> bool:
    if not query_tokens:
        return False

    source_tokens = _meaningful_tokens(f"{title} {content[:2000]}")
    return len(query_tokens & source_tokens) >= settings.fallback_keyword_overlap_min
