"""
Backend Engineer ownership — env-based settings (Day 1).

Single source of truth for every config value the FastAPI app needs, so
nothing is hardcoded across evaluate.py / demand.py / telemetry.py /
n8n_trigger.py / kafka_producer.py. Values come from environment variables
(or a local .env file — see .env.example) with sane defaults that match
docker-compose.yml so `uvicorn main:app --reload` works out of the box
against the Data Engineer's stack.
"""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Inuka Risk Radar API"
    api_v1_prefix: str = "/api/v1"

    # Postgres — async driver for FastAPI routes/ORM, sync DSN kept for parity
    # with Data Engineer's kafka_consumer.py (psycopg2) and Data Scientist's
    # scripts, which read DATABASE_URL the same way.
    database_url: str = "postgresql+asyncpg://inuka:inuka@localhost:5433/inuka_risk_radar"
    database_url_sync: str = "postgresql://inuka:inuka@localhost:5433/inuka_risk_radar"

    # Kafka / Redpanda — bootstrap matches docker-compose.yml's external listener.
    kafka_bootstrap: str = "localhost:19092"
    kafka_topic_alerts: str = "system.alerts"

    # n8n — self-hosted, webhook path created inside the imported workflow
    # (see backend/n8n/workflows/risk_alert_workflow.json).
    n8n_webhook_url: str = "http://localhost:5678/webhook/inuka-risk-alert"
    n8n_webhook_timeout_seconds: float = 5.0

    # Shared automation contract (docs/00_end_to_end_integration.md §3.6).
    automation_threshold: float = 0.75

    # CORS — Next.js dev origin. Extend via env var CORS_ORIGINS='["http://x"]'.
    cors_origins: list[str] = ["http://localhost:3000"]

    # SSE cadence for /api/v1/telemetry/stream.
    telemetry_poll_interval_seconds: float = 2.0
    telemetry_batch_limit: int = 20


@lru_cache
def get_settings() -> Settings:
    return Settings()
