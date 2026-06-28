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
        seen_chunk_ids: set[UUID] = set()
        query_tokens = _meaningful_tokens(query)
        for chunk, document, raw_distance in rows:
            score = max(0.0, min(1.0, 1.0 - float(raw_distance or 0)))
            if score < settings.retrieval_min_score:
                continue
            if not settings.gemini_api_key and not _has_keyword_overlap(
                query_tokens=query_tokens,
                title=document.title,
                content=chunk.content,
            ):
                continue
            sources.append(_to_retrieved_source(chunk, document, score=score))
            seen_chunk_ids.add(chunk.id)

        if len(sources) < effective_limit:
            sources.extend(
                self._keyword_fallback(
                    db,
                    context=context,
                    query_tokens=query_tokens,
                    limit=effective_limit - len(sources),
                    seen_chunk_ids=seen_chunk_ids,
                )
            )
        return sources

    def _keyword_fallback(
        self,
        db: Session,
        *,
        context: RetrievalContext,
        query_tokens: set[str],
        limit: int,
        seen_chunk_ids: set[UUID],
    ) -> list[RetrievedSource]:
        if not query_tokens or limit <= 0:
            return []

        stmt = (
            select(DocumentChunk, Document)
            .join(Document, Document.id == DocumentChunk.document_id)
            .where(
                DocumentChunk.tenant_id == context.tenant_id,
                Document.tenant_id == context.tenant_id,
                Document.status == "indexed",
            )
            .order_by(Document.indexed_at.desc().nullslast(), DocumentChunk.chunk_index.asc())
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

        ranked: list[tuple[int, RetrievedSource]] = []
        for chunk, document in db.execute(stmt).all():
            if chunk.id in seen_chunk_ids:
                continue
            overlap = _keyword_overlap_score(query_tokens=query_tokens, title=document.title, content=chunk.content)
            if overlap <= 0:
                continue
            ranked.append((overlap, _to_retrieved_source(chunk, document, score=min(0.95, 0.55 + overlap * 0.08))))

        ranked.sort(key=lambda item: item[0], reverse=True)
        return [source for _, source in ranked[:limit]]


def _meaningful_tokens(text: str) -> set[str]:
    tokens = re.findall(r"[a-z0-9][a-z0-9_-]+", text.lower())
    return {token for token in tokens if token not in STOPWORDS}


def _has_keyword_overlap(*, query_tokens: set[str], title: str, content: str) -> bool:
    return _keyword_overlap_score(query_tokens=query_tokens, title=title, content=content) >= settings.fallback_keyword_overlap_min


def _keyword_overlap_score(*, query_tokens: set[str], title: str, content: str) -> int:
    if not query_tokens:
        return 0

    source_tokens = _meaningful_tokens(f"{title} {content[:2000]}")
    return len(query_tokens & source_tokens)


def _to_retrieved_source(chunk: DocumentChunk, document: Document, *, score: float) -> RetrievedSource:
    snippet = chunk.content[:380].replace("\n", " ").strip()
    return RetrievedSource(
        document_id=str(document.id),
        title=document.title,
        source_uri=document.source_uri,
        score=round(score, 4),
        snippet=snippet,
        content=chunk.content,
    )
