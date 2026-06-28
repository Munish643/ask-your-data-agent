from celery import Celery

from app.core.config import settings

celery_app = Celery(
    "ask_your_data_agent",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.workers.ingestion_tasks"],
)

celery_app.conf.update(
    task_track_started=True,
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    worker_prefetch_multiplier=1,
)
