"""
Backend Engineer ownership — app entrypoint.

Day 1: FastAPI app, CORS (Next.js dev origin), router registration, /docs.
Day 3: request-logging middleware capturing method/path/status/latency and
       (for /evaluate) risk_tier + automation_triggered — the "proof of
       automation" evidence the PM needs for the demo (audit.request_log,
       see app/core/db.py). Standardized error responses.

Run locally:
    cd backend
    pip install -r requirements.txt
    uvicorn main:app --reload

Docs at http://localhost:8000/docs once the app is running.
"""

from __future__ import annotations

import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.db import init_audit_schema, log_request

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("inuka.backend")

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await init_audit_schema()
        logger.info("Audit schema ready (audit.request_log)")
    except Exception:
        logger.exception("Could not initialize audit schema — is Postgres running on %s?", settings.database_url)
    yield
    from app.services.kafka_producer import close_producer

    await close_producer()


app = FastAPI(
    title=settings.app_name,
    description=(
        "Inuka Risk Radar — beneficiary risk scoring (POST /evaluate), "
        "near-real-time telemetry (GET /telemetry/stream, SSE), and "
        "regional demand forecast (GET /demand)."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — allow the Next.js dev origin (and any others from CORS_ORIGINS).
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def audit_logging_middleware(request: Request, call_next):
    """Every request: log + persist method/path/status/latency. /evaluate
    additionally carries risk_tier + automation_triggered (set on
    request.state by the route) for the demo-day automation proof."""
    start = time.perf_counter()
    response = await call_next(request)
    latency_ms = (time.perf_counter() - start) * 1000

    beneficiary_id = getattr(request.state, "beneficiary_id", None)
    risk_tier = getattr(request.state, "risk_tier", None)
    automation_triggered = getattr(request.state, "automation_triggered", None)

    logger.info(
        "audit method=%s path=%s status=%s latency_ms=%.2f beneficiary_id=%s risk_tier=%s automation_triggered=%s",
        request.method,
        request.url.path,
        response.status_code,
        latency_ms,
        beneficiary_id,
        risk_tier,
        automation_triggered,
    )
    try:
        await log_request(
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            latency_ms=latency_ms,
            beneficiary_id=beneficiary_id,
            risk_tier=risk_tier,
            automation_triggered=automation_triggered,
        )
    except Exception:
        # Audit logging must never break the actual request.
        logger.exception("Failed to persist audit log row")

    response.headers["X-Process-Time-Ms"] = f"{latency_ms:.2f}"
    return response


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Standardized error shape across all endpoints."""
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={"detail": "Validation error", "errors": exc.errors()},
    )


@app.exception_handler(SQLAlchemyError)
async def db_exception_handler(request: Request, exc: SQLAlchemyError) -> JSONResponse:
    logger.exception("Database error on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=503, content={"detail": "Database temporarily unavailable"})


@app.get("/health", tags=["health"], summary="Liveness check")
async def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(api_router, prefix=settings.api_v1_prefix)
