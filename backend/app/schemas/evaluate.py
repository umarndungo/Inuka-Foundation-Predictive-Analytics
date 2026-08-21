"""
Pydantic schemas for POST /api/v1/evaluate — the shared contract in
docs/00_end_to_end_integration.md §3.2. Field names/types are locked; if
you need to change one, announce it (Slack/standup) before merging —
Frontend's lib/api-client.ts types break silently otherwise.

`model_status` is an ADDITIVE field beyond the original contract (not in
the frozen request/response shape) so Frontend/PM can tell live model
scores apart from the Day-1 rule-based stub used while model.pkl doesn't
exist yet. It's safe for existing consumers (unknown fields are ignored)
but still worth a one-line heads-up in the team channel.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator

RiskTier = Literal["LOW", "MEDIUM", "HIGH", "UNKNOWN"]


class EvaluateRequest(BaseModel):
    beneficiary_id: str = Field(..., min_length=1, examples=["BEN-9021"])
    attendance_rate: float = Field(..., ge=0, le=1, examples=[0.58])
    assignment_completion: float = Field(..., ge=0, le=1, examples=[0.42])
    travel_distance_km: float = Field(..., ge=0, examples=[14.5])
    region: str = Field(..., min_length=1, examples=["Kisumu"])

    @field_validator("beneficiary_id", "region")
    @classmethod
    def _not_blank(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("must not be blank")
        return v


class EvaluateResponse(BaseModel):
    beneficiary_id: str
    risk_score: float
    risk_tier: RiskTier
    drivers: list[str]
    recommended_action: str
    automation_triggered: bool
    model_status: Literal["live", "stub"] = Field(
        default="live",
        description="'stub' = model.pkl not found yet, rule-based fallback scoring was used.",
    )
