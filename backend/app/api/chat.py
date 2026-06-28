import asyncio
import json
import time
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import delete, select
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.core.database import SessionLocal, get_db
from app.core.security import CurrentUser, get_current_user
from app.models.entities import ChatMessage, ChatSession
from app.schemas.common import ChatSessionDetail, ChatSessionRead
from app.services.audit_service import write_audit_log, write_usage_log
from app.services.embedding_service import EmbeddingService
from app.services.gemini_service import GeminiService, RetrievedSource
from app.services.retrieval_service import RetrievalContext, RetrievalService
from app.services.web_search_service import WebSearchService

router = APIRouter(prefix="/chat", tags=["chat"])


class CreateSessionRequest(BaseModel):
    title: str | None = None


class ChatStreamRequest(BaseModel):
    query: str = Field(min_length=1, max_length=4000)
    session_id: UUID | None = None
    edited_message_id: UUID | None = None
    web_search: bool = False


@router.post("/sessions", response_model=ChatSessionRead)
def create_session(
    payload: CreateSessionRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = ChatSession(
        tenant_id=current_user.tenant_id,
        user_id=current_user.user_id,
        title=(payload.title or "New chat")[:255],
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.get("/sessions", response_model=list[ChatSessionRead])
def list_sessions(current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    return list(
        db.scalars(
            select(ChatSession)
            .where(ChatSession.tenant_id == current_user.tenant_id, ChatSession.user_id == current_user.user_id)
            .order_by(ChatSession.updated_at.desc())
        )
    )


@router.get("/sessions/{session_id}", response_model=ChatSessionDetail)
def get_session(
    session_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = db.scalar(
        select(ChatSession)
        .options(selectinload(ChatSession.messages))
        .where(
            ChatSession.id == session_id,
            ChatSession.tenant_id == current_user.tenant_id,
            ChatSession.user_id == current_user.user_id,
        )
    )
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat session not found")
    session.messages.sort(key=lambda message: message.created_at)
    return session


@router.post("/stream")
async def stream_chat(payload: ChatStreamRequest, current_user: CurrentUser = Depends(get_current_user)):
    async def event_generator():
        db = SessionLocal()
        started = time.perf_counter()
        timings: dict[str, int] = {}
        answer_parts: list[str] = []
        emitted_sources: list[RetrievedSource] = []
        try:
            clean_query = payload.query.strip()
            is_general_message = _is_general_chat_message(clean_query)
            answer_mode = "general" if is_general_message else "knowledge"
            session = _resolve_session(db, payload, current_user)
            if payload.edited_message_id:
                user_message = _apply_message_edit(
                    db,
                    session=session,
                    payload=payload,
                    current_user=current_user,
                    clean_query=clean_query,
                )
            else:
                user_message = ChatMessage(
                    tenant_id=current_user.tenant_id,
                    session_id=session.id,
                    user_id=current_user.user_id,
                    role="user",
                    content=clean_query,
                    sources=[],
                )
                session.updated_at = datetime.now(UTC)
                db.add(user_message)
                db.commit()

            yield _sse("status", {"message": "Understanding your question..."})
            await asyncio.sleep(0)
            yield _sse("status", {"message": "Checking access..."})
            await asyncio.sleep(0)

            if is_general_message:
                yield _sse("status", {"message": "Preparing a friendly response..."})
                await asyncio.sleep(0)
            else:
                yield _sse("status", {"message": "Searching indexed knowledge..."})

                step_started = time.perf_counter()
                query_embedding = EmbeddingService().embed_query(clean_query)
                timings["embedding_ms"] = int((time.perf_counter() - step_started) * 1000)
                yield _sse("status", {"message": f"Embedded query in {timings['embedding_ms']} ms"})
                await asyncio.sleep(0)

                step_started = time.perf_counter()
                emitted_sources = RetrievalService().search(
                    db,
                    context=RetrievalContext(tenant_id=current_user.tenant_id, role=current_user.role),
                    query=clean_query,
                    query_embedding=query_embedding,
                )
                timings["retrieval_ms"] = int((time.perf_counter() - step_started) * 1000)
                yield _sse("status", {"message": f"Searched knowledge in {timings['retrieval_ms']} ms"})
                await asyncio.sleep(0)
                if not emitted_sources:
                    yield _sse("status", {"message": "No sufficiently relevant indexed sources found."})
                    await asyncio.sleep(0)

            if payload.web_search and not is_general_message:
                answer_mode = "web"
                yield _sse("status", {"message": "Searching the web..."})
                await asyncio.sleep(0)
                step_started = time.perf_counter()
                web_sources = await asyncio.to_thread(WebSearchService().search, clean_query)
                timings["web_search_ms"] = int((time.perf_counter() - step_started) * 1000)
                emitted_sources.extend(web_sources)
                yield _sse("status", {"message": f"Found {len(web_sources)} web source{'' if len(web_sources) == 1 else 's'}"})
                await asyncio.sleep(0)

            for source in emitted_sources:
                yield _sse("source", _source_payload(source))
                await asyncio.sleep(0)

            yield _sse("status", {"message": "Reranking sources..." if emitted_sources else "Preparing answer..."})
            await asyncio.sleep(0)
            yield _sse("status", {"message": "Generating answer with Gemini..."})

            step_started = time.perf_counter()
            for delta in GeminiService().stream_answer(query=clean_query, sources=emitted_sources, mode=answer_mode):
                answer_parts.append(delta)
                yield _sse("answer_delta", {"text": delta})
                await asyncio.sleep(0)
            timings["generation_ms"] = int((time.perf_counter() - step_started) * 1000)

            latency_ms = int((time.perf_counter() - started) * 1000)
            step_started = time.perf_counter()
            sources_payload = [_source_payload(source) for source in emitted_sources]
            assistant_message = ChatMessage(
                tenant_id=current_user.tenant_id,
                session_id=session.id,
                user_id=None,
                role="assistant",
                content="".join(answer_parts).strip(),
                sources=sources_payload,
                latency_ms=latency_ms,
                token_count=max(1, len("".join(answer_parts)) // 4),
            )
            session.updated_at = datetime.now(UTC)
            db.add(assistant_message)
            db.flush()
            write_audit_log(
                db,
                tenant_id=current_user.tenant_id,
                user_id=current_user.user_id,
                action="chat.query",
                resource_type="chat_session",
                resource_id=str(session.id),
                metadata={
                    "source_count": len(emitted_sources),
                    "answer_mode": answer_mode,
                    "web_search": payload.web_search,
                    "mode": "gemini" if settings.gemini_api_key else "mock",
                },
            )
            write_usage_log(
                db,
                tenant_id=current_user.tenant_id,
                user_id=current_user.user_id,
                event_type="chat.completion",
                input_tokens=max(1, len(clean_query) // 4),
                output_tokens=max(1, len(assistant_message.content) // 4),
                latency_ms=latency_ms,
                metadata={
                    "provider": "gemini",
                    "mock_mode": not bool(settings.gemini_api_key),
                    "source_count": len(emitted_sources),
                    "answer_mode": answer_mode,
                    "web_search": payload.web_search,
                    "timings": timings,
                },
            )
            db.commit()
            timings["persistence_ms"] = int((time.perf_counter() - step_started) * 1000)
            yield _sse(
                "done",
                {
                    "latency_ms": latency_ms,
                    "timings": timings,
                    "session_id": str(session.id),
                    "user_message_id": str(user_message.id),
                    "assistant_message_id": str(assistant_message.id),
                },
            )
        except Exception as exc:  # noqa: BLE001
            db.rollback()
            yield _sse("error", {"message": str(exc)})
        finally:
            db.close()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


def _resolve_session(db: Session, payload: ChatStreamRequest, current_user: CurrentUser) -> ChatSession:
    if payload.edited_message_id and not payload.session_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Session is required when editing a message")

    if payload.session_id:
        session = db.scalar(
            select(ChatSession).where(
                ChatSession.id == payload.session_id,
                ChatSession.tenant_id == current_user.tenant_id,
                ChatSession.user_id == current_user.user_id,
            )
        )
        if not session:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat session not found")
        return session

    title = payload.query.strip().replace("\n", " ")[:80] or "New chat"
    session = ChatSession(tenant_id=current_user.tenant_id, user_id=current_user.user_id, title=title)
    db.add(session)
    db.flush()
    return session


def _apply_message_edit(
    db: Session,
    *,
    session: ChatSession,
    payload: ChatStreamRequest,
    current_user: CurrentUser,
    clean_query: str,
) -> ChatMessage:
    user_message = db.scalar(
        select(ChatMessage).where(
            ChatMessage.id == payload.edited_message_id,
            ChatMessage.tenant_id == current_user.tenant_id,
            ChatMessage.session_id == session.id,
            ChatMessage.user_id == current_user.user_id,
            ChatMessage.role == "user",
        )
    )
    if not user_message:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Editable user message not found")

    db.execute(
        delete(ChatMessage).where(
            ChatMessage.tenant_id == current_user.tenant_id,
            ChatMessage.session_id == session.id,
            ChatMessage.created_at > user_message.created_at,
        )
    )
    user_message.content = clean_query
    user_message.sources = []
    session.updated_at = datetime.now(UTC)
    db.commit()
    return user_message


def _sse(event: str, data: dict[str, Any]) -> str:
    return f"event: {event}\ndata: {json.dumps(data, default=str)}\n\n"


def _source_payload(source: RetrievedSource) -> dict[str, Any]:
    return {
        "document_id": source.document_id,
        "title": source.title,
        "source_uri": source.source_uri,
        "score": source.score,
        "source_type": source.source_type,
        "snippet": source.snippet,
    }


def _is_general_chat_message(query: str) -> bool:
    normalized = " ".join(query.lower().strip(" .!?").split())
    if normalized in {"hi", "hello", "hey", "hii", "hiii", "yo", "thanks", "thank you"}:
        return True
    if normalized.startswith(("hi ", "hello ", "hey ")):
        return len(normalized.split()) <= 5
    return normalized in {
        "who are you",
        "what are you",
        "what can you do",
        "how can you help",
        "how can you help me",
        "what can you help me with",
    }
