"""Aggregates all /api/v1 routes. Mounted in main.py under settings.api_v1_prefix."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.endpoints import beneficiaries, dashboard, demand, evaluate, telemetry

api_router = APIRouter()
api_router.include_router(evaluate.router, tags=["evaluate"])
api_router.include_router(dashboard.router, tags=["dashboard"])
api_router.include_router(beneficiaries.router, tags=["beneficiaries"])
api_router.include_router(demand.router, tags=["demand"])
api_router.include_router(telemetry.router, tags=["telemetry"])
