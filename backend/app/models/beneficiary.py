"""
Backend Engineer ownership — SQLAlchemy model matching the Silver schema
(Day 1 task: "Define app/models/beneficiary.py ... matching the Bronze/
Silver/Gold schema", owned upstream by Data Engineer in
data-pipeline/sql/02_silver_identity_graph.sql).

silver.beneficiary_identity_graph is a VIEW, not a table — this is a
read-only mapping (we never INSERT/UPDATE through it). It's the lookup
`/api/v1/evaluate` uses to 404 unknown beneficiary_ids and to backfill
optional model features the caller didn't send.
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Float, Integer, SmallInteger, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class BeneficiaryIdentityGraph(Base):
    __tablename__ = "beneficiary_identity_graph"
    __table_args__ = {"schema": "silver"}

    beneficiary_id: Mapped[str] = mapped_column(String, primary_key=True)
    region: Mapped[str | None] = mapped_column(String)
    pillar: Mapped[str | None] = mapped_column(String)
    attendance_rate: Mapped[float | None] = mapped_column(Float)
    grade_average: Mapped[float | None] = mapped_column(Float)
    assignment_completion: Mapped[float | None] = mapped_column(Float)
    travel_distance_km: Mapped[float | None] = mapped_column(Float)
    socioeconomic_index: Mapped[float | None] = mapped_column(Float)
    historical_dropouts_in_family: Mapped[int | None] = mapped_column(Integer)
    dropped_out: Mapped[int | None] = mapped_column(SmallInteger)
    last_event_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_ingested_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    risk_tier: Mapped[str | None] = mapped_column(String)

    def __repr__(self) -> str:  # pragma: no cover - debugging aid only
        return f"<BeneficiaryIdentityGraph {self.beneficiary_id} region={self.region} risk_tier={self.risk_tier}>"
