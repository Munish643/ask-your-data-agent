from uuid import UUID

from app.core.database import SessionLocal
from app.services.ingestion_service import IngestionService
from app.workers.celery_app import celery_app


@celery_app.task(name="documents.ingest", autoretry_for=(RuntimeError,), retry_backoff=True, retry_kwargs={"max_retries": 2})
def ingest_document(document_id: str) -> None:
    db = SessionLocal()
    try:
        IngestionService().process_document(db, document_id=UUID(document_id))
    finally:
        db.close()
