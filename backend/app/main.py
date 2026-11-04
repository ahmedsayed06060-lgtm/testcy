"""FastAPI application, restrictive middleware, health, and error envelopes."""

import asyncio
from collections.abc import Awaitable, Callable

import structlog
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from prometheus_fastapi_instrumentator import Instrumentator
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from sqlalchemy import text

from app.config import settings
from app.database import engine
from app.redis import redis_client
from app.security.authorization_gate import AuthorizationDenied

structlog.configure(
    processors=[
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(20),
)
limiter = Limiter(key_func=get_remote_address, default_limits=["300/minute"])
app = FastAPI(
    title="CyberOps Hub API",
    version="1.0.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
    redoc_url=None,
)
app.state.limiter = limiter
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-CSRF-Token"],
)


@app.middleware("http")
async def security_headers(
    request: Request, call_next: Callable[[Request], Awaitable[Response]]
) -> Response:
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"
    if settings.environment == "production":
        response.headers["Strict-Transport-Security"] = (
            "max-age=63072000; includeSubDomains; preload"
        )
    return response


def error_body(code: str, message: str) -> dict[str, object]:
    return {
        "success": False,
        "data": None,
        "error": {"code": code, "message": message},
        "pagination": None,
    }


@app.exception_handler(AuthorizationDenied)
async def authorization_denied_handler(_: Request, exc: AuthorizationDenied) -> JSONResponse:
    return JSONResponse(
        error_body(exc.result.code, exc.result.message),
        status_code=status.HTTP_403_FORBIDDEN,
    )


@app.exception_handler(RequestValidationError)
async def validation_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        error_body("VALIDATION_ERROR", "Request validation failed"),
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
    )


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(_: Request, __: RateLimitExceeded) -> JSONResponse:
    return JSONResponse(
        error_body("RATE_LIMITED", "Too many requests"),
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
    )


@app.get("/healthz", include_in_schema=False)
async def healthz() -> JSONResponse:
    checks: dict[str, str] = {}
    try:
        async with engine.connect() as connection:
            await connection.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception:
        checks["database"] = "unavailable"
    try:
        checks["redis"] = "ok" if await redis_client.ping() else "unavailable"
    except Exception:
        checks["redis"] = "unavailable"
    try:
        from app.minio_client import minio_client

        await asyncio.to_thread(minio_client.list_buckets)
        checks["object_storage"] = "ok"
    except Exception:
        checks["object_storage"] = "unavailable"
    healthy = all(value == "ok" for value in checks.values())
    return JSONResponse(
        {"status": "ok" if healthy else "degraded", "checks": checks},
        status_code=200 if healthy else 503,
    )


from app.api.v1.router import api_router  # noqa: E402

app.include_router(api_router, prefix=settings.api_prefix)
Instrumentator(excluded_handlers=["/metrics", "/healthz"]).instrument(app).expose(
    app, endpoint="/metrics", include_in_schema=False
)
