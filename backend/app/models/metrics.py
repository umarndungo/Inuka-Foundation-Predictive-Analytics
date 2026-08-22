"""
Backend Engineer ownership — SQLAlchemy models matching Bronze/Gold
(Day 1 task: "app/models/metrics.py ... matching the Bronze/Silver/Gold
schema"). Both are read-only mappings onto Data Engineer's tables/views.

TelemetryEvent -> bronze.telemetry_events
  Used as a fallback read path if we ever need to query telemetry via the
  ORM directly instead of Data Engineer's fetch_latest_kafka_telemetry()
  helper in app/services/kafka_consumer.py (which the SSE route uses by
  default — see app/api/v1/endpoints/telemetry.py).

RegionalRiskStats -> gold.regional_risk_stats
  Used by GET /api/v1/demand as a fallback data source when Data
  Scientist's forecast_regional_demand() can't find its data extract yet
  (data-pipeline/data/synthetic_beneficiaries.json), so the Demand Map
  still has something real to render during the demo.
"""

from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Any

from sqlalchemy import BigInteger, Boolean, Date, DateTime, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class TelemetryEvent(Base):
    __tablename__ = "telemetry_events"
    __table_args__ = {"schema": "bronze"}

    event_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    topic: Mapped[str] = mapped_column(String)
    partition_id: Mapped[int | None] = mapped_column(Integer)
    kafka_offset: Mapped[int | None] = mapped_column(BigInteger)
    beneficiary_id: Mapped[str | None] = mapped_column(String)
    event_timestamp: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    ingested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    payload: Mapped[dict[str, Any]] = mapped_column(JSONB)


class BeneficiaryRiskScore(Base):
    __tablename__ = "beneficiary_risk_scores"
    __table_args__ = {"schema": "gold"}

    score_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    beneficiary_id: Mapped[str] = mapped_column(String)
    scored_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    risk_score: Mapped[float] = mapped_column(Numeric)
    risk_tier: Mapped[str] = mapped_column(String)
    drivers: Mapped[list[str] | dict[str, Any]] = mapped_column(JSONB)
    recommended_action: Mapped[str] = mapped_column(Text)
    model_version: Mapped[str] = mapped_column(String)
    automation_triggered: Mapped[bool] = mapped_column(Boolean)


class RegionalRiskStats(Base):
    __tablename__ = "regional_risk_stats"
    __table_args__ = {"schema": "gold"}

    # The view has no real primary key; region is unique per row, which is
    # all SQLAlchemy needs for read-only mapping.
    region: Mapped[str] = mapped_column(String, primary_key=True)
    beneficiary_count: Mapped[int] = mapped_column(BigInteger)
    with_telemetry_count: Mapped[int] = mapped_column(BigInteger)
    avg_attendance_rate: Mapped[float | None] = mapped_column(Numeric)
    avg_travel_distance_km: Mapped[float | None] = mapped_column(Numeric)
    dropout_count: Mapped[int] = mapped_column(BigInteger)
    dropout_rate: Mapped[float | None] = mapped_column(Numeric)
    high_risk_count: Mapped[int] = mapped_column(BigInteger)
    medium_risk_count: Mapped[int] = mapped_column(BigInteger)
    low_risk_count: Mapped[int] = mapped_column(BigInteger)
    unknown_risk_count: Mapped[int] = mapped_column(BigInteger)
    last_event_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_ingested_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class DemandForecastArtifact(Base):
    __tablename__ = "demand_forecasts"
    __table_args__ = {"schema": "gold"}

    forecast_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    forecast_date: Mapped[date] = mapped_column(Date)
    region: Mapped[str] = mapped_column(String)
    horizon_days: Mapped[int] = mapped_column(Integer)
    historical: Mapped[list[float]] = mapped_column(JSONB)
    predicted: Mapped[list[float]] = mapped_column(JSONB)
    confidence: Mapped[list[float]] = mapped_column(JSONB)
    dates: Mapped[list[str]] = mapped_column(JSONB)
    expected_change: Mapped[float] = mapped_column(Numeric)
    peak_day: Mapped[date | None] = mapped_column(Date)
    summary_confidence: Mapped[int] = mapped_column(Integer)
    risk_factor: Mapped[float] = mapped_column(Numeric)
    predicted_demand: Mapped[float] = mapped_column(Numeric)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class RiskTrendDaily(Base):
    __tablename__ = "risk_trend_daily"
    __table_args__ = {"schema": "gold"}

    snapshot_date: Mapped[date] = mapped_column(Date, primary_key=True)
    low_count: Mapped[int] = mapped_column(Integer)
    medium_count: Mapped[int] = mapped_column(Integer)
    high_count: Mapped[int] = mapped_column(Integer)
    critical_count: Mapped[int] = mapped_column(Integer)
    total_count: Mapped[int] = mapped_column(Integer)
    overall_ratio: Mapped[float] = mapped_column(Numeric)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
