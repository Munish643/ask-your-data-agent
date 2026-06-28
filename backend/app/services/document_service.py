import re
from pathlib import Path
from uuid import UUID

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.services.ingestion_service import IngestionService
from app.models.entities import Document, DocumentACL, SyncJob
from app.services.audit_service import write_audit_log
from app.services.storage_service import StorageService


SAFE_NAME_PATTERN = re.compile(r"[^A-Za-z0-9._-]+")


class DocumentService:
    def __init__(self) -> None:
        self.storage = StorageService()

    def list_documents(self, db: Session, *, tenant_id: UUID) -> list[Document]:
        return list(
            db.scalars(
                select(Document).where(Document.tenant_id == tenant_id).order_by(Document.created_at.desc())
            )
        )

    def get_document(self, db: Session, *, tenant_id: UUID, document_id: UUID) -> Document:
        document = db.get(Document, document_id)
        if not document or document.tenant_id != tenant_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
        return document

    async def upload_document(
        self,
        db: Session,
        *,
        tenant_id: UUID,
        user_id: UUID,
        upload: UploadFile,
    ) -> Document:
        file_name = upload.filename or "upload.txt"
        safe_name = self._safe_file_name(file_name)
        extension = Path(safe_name).suffix.lower()
        if extension not in settings.allowed_extensions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file type. Allowed: {', '.join(sorted(settings.allowed_extensions))}",
            )

        content = await upload.read()
        if len(content) > settings.max_upload_bytes:
            raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File is too large")
        if not content:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty")

        storage_path = self.storage.save_upload(str(tenant_id), upload, content, safe_name)
        document = Document(
            tenant_id=tenant_id,
            title=Path(safe_name).stem,
            source_type="upload",
            source_uri=f"local://{safe_name}",
            file_name=safe_name,
            mime_type=upload.content_type,
            storage_path=storage_path,
            status="uploaded",
            created_by=user_id,
        )
        db.add(document)
        db.flush()

        for role in ["owner", "admin", "member", "viewer"]:
            db.add(
                DocumentACL(
                    tenant_id=tenant_id,
                    document_id=document.id,
                    principal_type="role",
                    principal_id=role,
                    permission="read",
                )
            )

        db.add(
            SyncJob(
                tenant_id=tenant_id,
                document_id=document.id,
                job_type="document_ingestion",
                status="queued",
            )
        )
        write_audit_log(
            db,
            tenant_id=tenant_id,
            user_id=user_id,
            action="document.upload",
            resource_type="document",
            resource_id=str(document.id),
            metadata={"file_name": safe_name, "mime_type": upload.content_type},
        )
        db.commit()
        db.refresh(document)
        self._enqueue_ingestion(db, document.id)
        return document

    def delete_document(self, db: Session, *, tenant_id: UUID, user_id: UUID, document_id: UUID) -> None:
        document = self.get_document(db, tenant_id=tenant_id, document_id=document_id)
        storage_path = document.storage_path
        db.delete(document)
        write_audit_log(
            db,
            tenant_id=tenant_id,
            user_id=user_id,
            action="document.delete",
            resource_type="document",
            resource_id=str(document_id),
            metadata={"file_name": document.file_name},
        )
        db.commit()
        self.storage.delete(storage_path)

    def reindex_document(self, db: Session, *, tenant_id: UUID, user_id: UUID, document_id: UUID) -> Document:
        document = self.get_document(db, tenant_id=tenant_id, document_id=document_id)
        document.status = "uploaded"
        document.indexed_at = None
        db.add(
            SyncJob(
                tenant_id=tenant_id,
                document_id=document.id,
                job_type="document_reindex",
                status="queued",
            )
        )
        write_audit_log(
            db,
            tenant_id=tenant_id,
            user_id=user_id,
            action="document.reindex",
            resource_type="document",
            resource_id=str(document.id),
            metadata={"file_name": document.file_name},
        )
        db.commit()
        db.refresh(document)
        self._enqueue_ingestion(db, document.id)
        return document

    def _enqueue_ingestion(self, db: Session, document_id: UUID) -> None:
        if settings.ingestion_mode == "inline":
            IngestionService().process_document(db, document_id=document_id)
            return

        try:
            from app.workers.ingestion_tasks import ingest_document

            ingest_document.delay(str(document_id))
        except Exception:
            # The worker is optional during API-only local development. The queued job remains visible.
            pass

    @staticmethod
    def _safe_file_name(file_name: str) -> str:
        sanitized = SAFE_NAME_PATTERN.sub("-", Path(file_name).name).strip(".-")
        return sanitized or "upload.txt"
