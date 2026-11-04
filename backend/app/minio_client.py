"""S3-compatible private evidence storage."""

import io
from datetime import timedelta

from minio import Minio

from app.config import settings

minio_client = Minio(
    settings.minio_endpoint,
    access_key=settings.minio_access_key,
    secret_key=settings.minio_secret_key,
    secure=settings.minio_secure,
)


def ensure_bucket() -> None:
    if not minio_client.bucket_exists(settings.minio_bucket):
        minio_client.make_bucket(settings.minio_bucket)


def upload_bytes(path: str, payload: bytes, content_type: str) -> None:
    ensure_bucket()
    minio_client.put_object(
        settings.minio_bucket,
        path,
        io.BytesIO(payload),
        len(payload),
        content_type=content_type,
    )


def download_bytes(path: str) -> bytes:
    response = minio_client.get_object(settings.minio_bucket, path)
    try:
        return response.read()
    finally:
        response.close()
        response.release_conn()


def presigned_download(path: str) -> str:
    return minio_client.presigned_get_object(
        settings.minio_bucket, path, expires=timedelta(minutes=5)
    )
