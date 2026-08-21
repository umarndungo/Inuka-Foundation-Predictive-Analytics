"""
Backend Engineer ownership — Day 2 task: "Implement app/services/n8n_trigger.py:
IF risk_score > 0.75 THEN trigger_n8n_webhook(), sent async via httpx."

The threshold check itself lives in app/api/v1/endpoints/evaluate.py (it's
already known there from the scoring response) — this module is just the
one-shot async POST, kept deliberately dumb and non-raising so a down n8n
instance can never take /evaluate down with it.

Import the matching n8n workflow from backend/n8n/workflows/
risk_alert_workflow.json into your local n8n instance — it exposes the
webhook at the path this module posts to (see .env.example /
N8N_WEBHOOK_URL).
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


async def trigger_n8n_webhook(alert_payload: dict[str, Any]) -> bool:
    """POST the alert payload to the n8n webhook. Returns True on a 2xx
    response, False otherwise. Never raises."""
    try:
        async with httpx.AsyncClient(timeout=settings.n8n_webhook_timeout_seconds) as client:
            response = await client.post(settings.n8n_webhook_url, json=alert_payload)
        if response.status_code >= 300:
            logger.error(
                "n8n webhook returned %s for beneficiary_id=%s: %s",
                response.status_code,
                alert_payload.get("beneficiary_id"),
                response.text[:300],
            )
            return False
        logger.info(
            "n8n webhook fired for beneficiary_id=%s risk_tier=%s",
            alert_payload.get("beneficiary_id"),
            alert_payload.get("risk_tier"),
        )
        return True
    except httpx.HTTPError:
        logger.exception(
            "n8n webhook call failed for beneficiary_id=%s", alert_payload.get("beneficiary_id")
        )
        return False
