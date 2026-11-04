from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class InputSchema(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid", str_strip_whitespace=True)


class ResponseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class Pagination(BaseModel):
    page: int = Field(ge=1)
    limit: int = Field(ge=1, le=100)
    total: int = Field(ge=0)
    pages: int = Field(ge=0)


class Envelope(BaseModel, Generic[T]):
    success: bool = True
    data: T | None = None
    error: dict[str, str] | None = None
    pagination: Pagination | None = None


def success(data: T, pagination: Pagination | None = None) -> dict[str, object]:
    return {"success": True, "data": data, "error": None, "pagination": pagination}
