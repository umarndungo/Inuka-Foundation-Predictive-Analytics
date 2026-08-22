from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Float, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class FieldWorker(Base):
    __tablename__ = "field_workers"
    __table_args__ = {"schema": "silver"}

    field_worker_id: Mapped[str] = mapped_column(String, primary_key=True)
    code: Mapped[str] = mapped_column(String)
    full_name: Mapped[str] = mapped_column(String)
    region: Mapped[str] = mapped_column(String)
    sub_county: Mapped[str] = mapped_column(String)
    phone_number: Mapped[str | None] = mapped_column(String)
    active: Mapped[bool] = mapped_column(Boolean)
    home_base_lat: Mapped[float | None] = mapped_column(Float)
    home_base_lng: Mapped[float | None] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class BeneficiaryMaster(Base):
    __tablename__ = "beneficiaries_master"
    __table_args__ = {"schema": "silver"}

    beneficiary_id: Mapped[str] = mapped_column(String, primary_key=True)
    full_name: Mapped[str] = mapped_column(String)
    region: Mapped[str] = mapped_column(String)
    sub_county: Mapped[str] = mapped_column(String)
    school_name: Mapped[str] = mapped_column(String)
    grade: Mapped[int] = mapped_column()
    age: Mapped[int] = mapped_column()
    gender: Mapped[str] = mapped_column(String)
    phone_number: Mapped[str | None] = mapped_column(String)
    pillar: Mapped[str] = mapped_column(String)
    enrollment_date: Mapped[date] = mapped_column(Date)
    field_worker_id: Mapped[str | None] = mapped_column(String)
    home_lat: Mapped[float | None] = mapped_column(Float)
    home_lng: Mapped[float | None] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
