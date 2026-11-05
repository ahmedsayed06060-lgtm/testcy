"""Validated process configuration. Secrets are supplied by the environment."""

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", case_sensitive=False, extra="ignore"
    )

    app_name: str = "CyberOps Hub"
    environment: str = "development"
    api_prefix: str = "/api/v1"
    frontend_url: str = "http://localhost:3000"
    public_api_url: str = "http://localhost:8000/api/v1"
    backend_cors_origins: str = "http://localhost:3000"
    database_url: str = "postgresql+asyncpg://cyberops:change-me@localhost:5432/cyberops"
    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str = "redis://localhost:6379/1"
    celery_result_backend: str = "redis://localhost:6379/2"

    jwt_private_key_path: Path = Path("keys/jwt_private_key.pem")
    jwt_public_key_path: Path = Path("keys/jwt_public_key.pem")
    jwt_issuer: str = "cyberops-hub"
    jwt_key_id: str = "development-1"
    access_token_minutes: int = Field(default=15, ge=5, le=30)
    refresh_token_days: int = Field(default=7, ge=1, le=30)
    temporary_token_minutes: int = Field(default=5, ge=2, le=10)
    field_encryption_key: str = "change-this-32-byte-base64-key"

    minio_endpoint: str = "localhost:9000"
    minio_access_key: str = "cyberops"
    minio_secret_key: str = "change-me-too"  # noqa: S105 - local development default only
    minio_bucket: str = "cyberops-evidence"
    minio_secure: bool = False
    clamav_host: str = "localhost"
    clamav_port: int = 3310
    mobsf_api_url: str = "http://mobsf:8000/api/v1"
    mobsf_api_key: str = ""

    smtp_host: str = "localhost"
    smtp_port: int = 1025
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from: str = "security@cyberops.local"
    smtp_tls: bool = False

    max_upload_mb: int = Field(default=100, ge=1, le=1024)
    default_job_timeout_minutes: int = Field(default=30, ge=1, le=240)
    max_job_timeout_minutes: int = Field(default=240, ge=30, le=240)
    max_concurrent_sessions: int = Field(default=5, ge=1, le=20)
    phishing_campaign_days: int = Field(default=7, ge=1, le=30)
    tool_output_volume: str = "cyberops-hub_scan-output"
    tool_output_dir: str = "/output"
    tool_docker_network: str = "cyberops-egress"

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.backend_cors_origins.split(",") if origin.strip()]

    @property
    def jwt_private_key(self) -> str:
        return self.jwt_private_key_path.read_text(encoding="utf-8")

    @property
    def jwt_public_key(self) -> str:
        return self.jwt_public_key_path.read_text(encoding="utf-8")


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
