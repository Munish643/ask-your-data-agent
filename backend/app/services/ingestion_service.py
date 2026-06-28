import mimetypes
from datetime import UTC, datetime
from pathlib import Path
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.entities import Document, DocumentChunk, SyncJob
from app.services.chunking_service import ChunkingService
from app.services.embedding_service import EmbeddingService


class IngestionService:
    def __init__(self) -> None:
        self.chunker = ChunkingService()
        self.embedder = EmbeddingService()

    def process_document(self, db: Session, *, document_id: UUID) -> None:
        document = db.get(Document, document_id)
        if not document:
            return

        job = db.scalar(
            select(SyncJob)
            .where(SyncJob.document_id == document_id, SyncJob.status.in_(["queued", "processing"]))
            .order_by(SyncJob.created_at.desc())
        )
        if not job:
            job = SyncJob(
                tenant_id=document.tenant_id,
                document_id=document.id,
                job_type="document_ingestion",
                status="queued",
            )
            db.add(job)

        try:
            document.status = "processing"
            job.status = "processing"
            job.started_at = datetime.now(UTC)
            db.commit()

            text = self.extract_text(Path(document.storage_path), document.mime_type)
            chunks = self.chunker.chunk(text)
            if not chunks:
                raise ValueError("No extractable text was found in this document")

            embeddings = self.embedder.embed_documents([chunk.content for chunk in chunks])
            db.execute(delete(DocumentChunk).where(DocumentChunk.document_id == document.id))
            for index, chunk in enumerate(chunks):
                db.add(
                    DocumentChunk(
                        tenant_id=document.tenant_id,
                        document_id=document.id,
                        chunk_index=index,
                        content=chunk.content,
                        content_hash=chunk.content_hash,
                        token_count=chunk.token_count,
                        page_number=chunk.page_number,
                        chunk_metadata={
                            "title": document.title,
                            "source_uri": document.source_uri,
                            "embedding_model": settings.gemini_embedding_model,
                            "embedding_dimension": settings.gemini_embedding_dimension,
                        },
                        embedding=embeddings[index],
                    )
                )

            document.status = "indexed"
            document.indexed_at = datetime.now(UTC)
            job.status = "completed"
            job.completed_at = datetime.now(UTC)
            db.commit()
        except Exception as exc:  # noqa: BLE001 - extraction dependencies can fail in different ways.
            document.status = "failed"
            job.status = "failed"
            job.error_message = str(exc)
            job.completed_at = datetime.now(UTC)
            db.commit()
            raise

    def extract_text(self, path: Path, mime_type: str | None = None) -> str:
        extension = path.suffix.lower()
        guessed_type = mime_type or mimetypes.guess_type(path.name)[0]

        if extension in {".txt", ".md"} or guessed_type in {"text/plain", "text/markdown"}:
            return path.read_text(encoding="utf-8", errors="replace")
        if extension == ".pdf":
            return self._extract_pdf(path)
        if extension == ".docx":
            return self._extract_docx(path)
        raise ValueError(f"Unsupported file type for ingestion: {extension}")

    def _extract_pdf(self, path: Path) -> str:
        try:
            from pypdf import PdfReader
        except ImportError as exc:
            raise RuntimeError("PDF extraction requires the pypdf dependency") from exc

        reader = PdfReader(str(path))
        pages: list[str] = []
        for page in reader.pages:
            pages.append(page.extract_text() or "")
        return "\n\n".join(pages)

    def _extract_docx(self, path: Path) -> str:
        try:
            import docx
        except ImportError as exc:
            raise RuntimeError("DOCX extraction requires the python-docx dependency") from exc

        document = docx.Document(str(path))
        return "\n\n".join(paragraph.text for paragraph in document.paragraphs if paragraph.text.strip())
