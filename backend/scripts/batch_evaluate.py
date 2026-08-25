"""
Batch-trigger n8n emails for 5 HIGH-risk beneficiaries.

Queries the DB directly for beneficiaries with risk_score > 0.75 and
POSTs to the n8n webhook. Skips the ML model and /evaluate endpoint.

Usage:
    docker exec inuka-backend python -m scripts.batch_evaluate
    # or from host:
    python scripts/batch_evaluate.py --dsn postgresql://inuka:inuka@localhost:5433/inuka_risk_radar
"""

from __future__ import annotations

import argparse
import logging
import uuid
from datetime import datetime, timezone

import httpx
import psycopg2

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

N8N_WEBHOOK_URL = "http://n8n:5678/webhook/inuka-risk-alert"

FETCH_SQL = """
    SELECT
        r.beneficiary_id,
        r.risk_score,
        r.risk_tier,
        g.region
    FROM gold.beneficiary_risk_scores r
    JOIN silver.beneficiary_identity_graph g
        ON r.beneficiary_id = g.beneficiary_id
    WHERE r.risk_score > 0.75
    ORDER BY r.risk_score DESC
    LIMIT %s
"""


def main() -> None:
    parser = argparse.ArgumentParser(description="Trigger n8n emails for HIGH-risk beneficiaries")
    parser.add_argument("--dsn", default="postgresql://inuka:inuka@postgres:5432/inuka_risk_radar")
    parser.add_argument("--n8n-url", default=N8N_WEBHOOK_URL)
    parser.add_argument("--count", type=int, default=5, help="Number of HIGH-risk beneficiaries")
    args = parser.parse_args()

    conn = psycopg2.connect(args.dsn)
    try:
        with conn.cursor() as cur:
            cur.execute(FETCH_SQL, (args.count,))
            rows = cur.fetchall()
    finally:
        conn.close()

    if not rows:
        logger.error("No HIGH-risk beneficiaries found in DB")
        return

    logger.info("Found %d HIGH-risk beneficiaries — sending emails via n8n...", len(rows))

    emails_sent = 0
    with httpx.Client(timeout=30.0) as client:
        for beneficiary_id, risk_score, risk_tier, region in rows:
            payload = {
                "alert_id": f"ALT-{uuid.uuid4().hex[:8].upper()}",
                "beneficiary_id": beneficiary_id,
                "risk_score": float(risk_score),
                "risk_tier": risk_tier or "HIGH",
                "region": region or "Unknown",
                "triggered_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                "source": "batch_evaluate",
            }

            try:
                resp = client.post(args.n8n_url, json=payload)
                if resp.status_code < 300:
                    emails_sent += 1
                    logger.info("  %s → score=%.2f → EMAIL SENT", beneficiary_id, risk_score)
                else:
                    logger.warning("  %s → n8n returned %d: %s", beneficiary_id, resp.status_code, resp.text[:200])
            except Exception as e:
                logger.warning("  %s → failed: %s", beneficiary_id, e)

    logger.info("=" * 60)
    logger.info("DONE — %d emails sent", emails_sent)
    logger.info("=" * 60)


if __name__ == "__main__":
    main()
