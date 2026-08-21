"""
Backend Engineer ownership — SQLAlchemy async engine/session (Day 1),
plus the Backend-owned `audit` schema used for Day 3 automation proof.

Design notes:
- Async engine (asyncpg) because the task doc requires all external I/O
  (DB, Kafka, Twilio, n8n) to be async/await.
- We do NOT touch Data Engineer's bronze/silver/gold migrations
  (data-pipeline/sql/*.sql, run once via docker-entrypoint-initdb.d).
  Backend's own `audit` schema is created idempotently at app startup
  instead (see init_audit_schema, called from main.py's startup event),
  so it doesn't need a Postgres container rebuild to appear.
"""

from __future__ import annotations

from collections.abc import AsyncIterator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import get_settings

settings = get_settings()

engine = create_async_engine(settings.database_url, pool_pre_ping=True, future=True)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


class Base(DeclarativeBase):
    """Declarative base for read-only mappings onto Data Engineer's
    bronze/silver/gold tables & views (see app/models/)."""


async def get_db() -> AsyncIterator[AsyncSession]:
    """FastAPI dependency — one session per request."""
    async with AsyncSessionLocal() as session:
        yield session


_AUDIT_SCHEMA_STATEMENTS = (
    "CREATE SCHEMA IF NOT EXISTS audit",
    """
    CREATE TABLE IF NOT EXISTS audit.request_log (
        id                     BIGSERIAL PRIMARY KEY,
        method                 TEXT NOT NULL,
        path                   TEXT NOT NULL,
        status_code            INTEGER NOT NULL,
        latency_ms             NUMERIC(10, 2) NOT NULL,
        beneficiary_id         TEXT,
        risk_tier              TEXT,
        automation_triggered   BOOLEAN,
        created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """,
    "CREATE INDEX IF NOT EXISTS idx_audit_request_log_created_at ON audit.request_log (created_at DESC)",
)


async def init_audit_schema() -> None:
    """Idempotent — safe to call on every startup. This is the Day-3
    'audit logging system' deliverable: every request lands a row here,
    and /evaluate rows additionally carry risk_tier + automation_triggered
    as the demo-day 'proof of automation' evidence for the PM."""
    async with engine.begin() as conn:
        for stmt in _AUDIT_SCHEMA_STATEMENTS:
            await conn.execute(text(stmt))


async def log_request(
    *,
    method: str,
    path: str,
    status_code: int,
    latency_ms: float,
    beneficiary_id: str | None = None,
    risk_tier: str | None = None,
    automation_triggered: bool | None = None,
) -> None:
    async with AsyncSessionLocal() as session:
        await session.execute(
            text(
                """
                INSERT INTO audit.request_log
                    (method, path, status_code, latency_ms, beneficiary_id, risk_tier, automation_triggered)
                VALUES
                    (:method, :path, :status_code, :latency_ms, :beneficiary_id, :risk_tier, :automation_triggered)
                """
            ),
            {
                "method": method,
                "path": path,
                "status_code": status_code,
                "latency_ms": latency_ms,
                "beneficiary_id": beneficiary_id,
                "risk_tier": risk_tier,
                "automation_triggered": automation_triggered,
            },
        )
        await session.commit()
