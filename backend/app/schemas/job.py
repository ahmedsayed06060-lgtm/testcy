import uuid
from datetime import datetime
from typing import Any, Self

from pydantic import Field, model_validator

from app.models.job import JobStatus, JobType, ScanProfile
from app.schemas.common import InputSchema, ResponseSchema


class JobCreate(InputSchema):
    engagement_id: uuid.UUID
    job_type: JobType
    targets: list[str] = Field(min_length=1, max_length=100)
    profile: ScanProfile = ScanProfile.STANDARD
    parameters: dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="after")
    def safe_parameters(self) -> Self:
        blocked = {"command", "args", "image", "entrypoint", "network_mode", "privileged"}
        if blocked.intersection(self.parameters):
            raise ValueError("Execution parameters are controlled by the server")
        if any(not target.strip() or len(target) > 500 for target in self.targets):
            raise ValueError("Each target must contain 1–500 characters")
        if len(set(self.targets)) != len(self.targets):
            raise ValueError("Duplicate targets are not allowed")
        return self


class JobResponse(ResponseSchema):
    id: uuid.UUID
    engagement_id: uuid.UUID
    job_type: JobType
    targets: list[str]
    tool: str
    profile: ScanProfile
    parameters: dict[str, Any]
    status: JobStatus
    started_at: datetime | None
    completed_at: datetime | None
    duration_seconds: int | None
    error_message: str | None
    triggered_by: uuid.UUID
    created_at: datetime
    updated_at: datetime
