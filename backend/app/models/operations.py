from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class Alert(Base):
    __tablename__ = "alerts"
    __table_args__ = {"schema": "operations"}

    alert_id: Mapped[str] = mapped_column(String, primary_key=True)
    beneficiary_id: Mapped[str | None] = mapped_column(String)
    field_worker_id: Mapped[str | None] = mapped_column(String)
    severity: Mapped[str] = mapped_column(String)
    type: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(Text)
    location: Mapped[str] = mapped_column(String)
    device_id: Mapped[str | None] = mapped_column(String)
    alert_metadata: Mapped[dict[str, Any] | None] = mapped_column("metadata", JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    acknowledged_by: Mapped[str | None] = mapped_column(String)
    acknowledged_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Intervention(Base):
    __tablename__ = "interventions"
    __table_args__ = {"schema": "operations"}

    intervention_id: Mapped[str] = mapped_column(String, primary_key=True)
    beneficiary_id: Mapped[str | None] = mapped_column(String)
    field_worker_id: Mapped[str | None] = mapped_column(String)
    triggered_by_alert_id: Mapped[str | None] = mapped_column(String)
    intervention_type: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    notes: Mapped[str | None] = mapped_column(Text)
