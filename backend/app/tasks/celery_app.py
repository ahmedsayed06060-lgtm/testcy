from celery import Celery
from celery.schedules import crontab

from app.config import settings

celery_app = Celery(
    "cyberops",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=[
        "app.tasks.scan_tasks",
        "app.tasks.mobile_tasks",
        "app.tasks.social_tasks",
        "app.tasks.report_tasks",
        "app.tasks.verification_tasks",
        "app.tasks.notification_tasks",
        "app.tasks.retention_tasks",
    ],
)
celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,
    broker_connection_retry_on_startup=True,
    task_soft_time_limit=settings.default_job_timeout_minutes * 60,
    task_time_limit=settings.max_job_timeout_minutes * 60,
    task_default_retry_delay=30,
    result_expires=86400,
    task_routes={
        "app.tasks.scan_tasks.*": {"queue": "scans"},
        "app.tasks.mobile_tasks.*": {"queue": "scans"},
        "app.tasks.social_tasks.*": {"queue": "scans"},
        "app.tasks.report_tasks.*": {"queue": "reports"},
        "app.tasks.notification_tasks.*": {"queue": "notifications"},
        "app.tasks.verification_tasks.*": {"queue": "verification"},
        "app.tasks.retention_tasks.*": {"queue": "notifications"},
    },
    beat_schedule={
        "daily-data-retention": {
            "task": "app.tasks.retention_tasks.enforce_retention",
            "schedule": crontab(hour=2, minute=0),
        },
        "hourly-campaign-completion": {
            "task": "app.tasks.social_tasks.complete_expired_campaigns",
            "schedule": crontab(minute=10),
        },
    },
)
