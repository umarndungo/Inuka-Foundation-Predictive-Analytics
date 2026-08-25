"""
Batch-evaluate 5 HIGH-risk beneficiaries via POST /api/v1/evaluate.

Fetches HIGH-risk individuals from the beneficiaries endpoint, then runs
each through /evaluate to trigger n8n webhook + email. For demos.

Usage:
    docker exec inuka-backend python -m scripts.batch_evaluate --base-url http://backend:8000
"""

from __future__ import annotations

import argparse
import logging
import sys

import httpx

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def main() -> None:
    parser = argparse.ArgumentParser(description="Batch-evaluate HIGH-risk beneficiaries via /api/v1/evaluate")
    parser.add_argument("--base-url", default="http://localhost:8000", help="Backend API base URL")
    parser.add_argument("--count", type=int, default=5, help="Number of HIGH-risk beneficiaries to evaluate")
    args = parser.parse_args()

    base = args.base_url.rstrip("/")

    with httpx.Client(timeout=30.0) as client:
        logger.info("Fetching %d HIGH-risk beneficiaries...", args.count)
        resp = client.get(
            f"{base}/api/v1/beneficiaries",
            params={"pageSize": 100, "riskTier": "HIGH"},
        )
        resp.raise_for_status()
        beneficiaries = resp.json()["items"][:args.count]

        if not beneficiaries:
            logger.error("No HIGH-risk beneficiaries found")
            sys.exit(1)

        logger.info("Evaluating %d HIGH-risk beneficiaries...", len(beneficiaries))

        emails_triggered = 0
        for b in beneficiaries:
            payload = {
                "beneficiary_id": b["code"],
                "attendance_rate": b["attendanceRate"],
                "assignment_completion": b["assignmentCompletion"],
                "travel_distance_km": b["travelDistanceKm"],
                "region": b["region"],
            }
            resp = client.post(f"{base}/api/v1/evaluate", json=payload)
            resp.raise_for_status()
            result = resp.json()

            triggered = result.get("automation_triggered", False)
            if triggered:
                emails_triggered += 1
                logger.info("  %s → HIGH (%.2f) → EMAIL SENT", b["code"], result["risk_score"])
            else:
                logger.info("  %s → %s (%.2f) → no email", b["code"], result["risk_tier"], result["risk_score"])

        logger.info("=" * 60)
        logger.info("DONE — %d evaluated, %d emails sent", len(beneficiaries), emails_triggered)
        logger.info("=" * 60)


if __name__ == "__main__":
    main()
