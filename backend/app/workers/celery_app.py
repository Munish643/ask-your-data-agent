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
    broker_connection_timeout=5,
    broker_transport_options={"socket_timeout": 5, "socket_connect_timeout": 5},
    task_publish_retry=False,
    task_acks_late=True,
    task_soft_time_limit=240,
    task_time_limit=300,
    worker_prefetch_multiplier=1,
)
