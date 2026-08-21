#!/usr/bin/env python3
"""CLI wrapper: run Bronze Kafka consumer from the data-pipeline scripts folder."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from app.services.kafka_consumer import main  # noqa: E402

if __name__ == "__main__":
    sys.exit(main())
