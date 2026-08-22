from __future__ import annotations

from pydantic import BaseModel


class AlertResponse(BaseModel):
    id: str
    type: str
    severity: str
    status: str
    timestamp: str
    location: str
    beneficiaryId: str | None = None
    beneficiaryCode: str | None = None
    deviceId: str | None = None
    description: str
    metadata: dict | None = None
    acknowledgedBy: str | None = None
    acknowledgedAt: str | None = None
    resolvedAt: str | None = None


class InterventionResponse(BaseModel):
    intervention_id: str
    beneficiary_id: str | None = None
    field_worker_id: str | None = None
    triggered_by_alert_id: str | None = None
    intervention_type: str
    status: str
    created_at: str
    completed_at: str | None = None
    notes: str | None = None
