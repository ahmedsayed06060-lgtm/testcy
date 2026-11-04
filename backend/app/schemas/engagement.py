import uuid
from datetime import date, datetime, time
from typing import Self

from pydantic import Field, model_validator

from app.models.engagement import EngagementRole, EngagementStatus, EngagementType
from app.schemas.common import InputSchema, ResponseSchema


class EngagementBase(InputSchema):
    client_id: uuid.UUID
    name: str = Field(min_length=3, max_length=255)
    type: EngagementType
    start_date: date
    end_date: date
    testing_window_start: time | None = None
    testing_window_end: time | None = None
    testing_window_timezone: str = Field(default="UTC", max_length=50)
    rules_of_engagement: str = Field(min_length=10)
    emergency_contact_name: str = Field(min_length=2, max_length=255)
    emergency_contact_phone: str = Field(min_length=5, max_length=50)
    emergency_contact_email: str | None = None

    @model_validator(mode="after")
    def valid_window(self) -> Self:
        if self.end_date < self.start_date:
            raise ValueError("end_date must not precede start_date")
        if (self.testing_window_start is None) != (self.testing_window_end is None):
            raise ValueError("Both testing-window times must be provided together")
        return self


class EngagementCreate(EngagementBase):
    pass


class EngagementUpdate(EngagementBase):
    pass


class EngagementResponse(ResponseSchema):
    id: uuid.UUID
    client_id: uuid.UUID
    name: str
    type: EngagementType
    status: EngagementStatus
    start_date: date
    end_date: date
    testing_window_start: time | None
    testing_window_end: time | None
    testing_window_timezone: str
    rules_of_engagement: str
    emergency_contact_name: str
    emergency_contact_phone: str
    emergency_contact_email: str | None
    created_by: uuid.UUID | None
    created_at: datetime
    updated_at: datetime


class StatusTransition(InputSchema):
    new_status: EngagementStatus


class AssignmentRequest(InputSchema):
    user_id: uuid.UUID
    role_in_engagement: EngagementRole = EngagementRole.MEMBER
