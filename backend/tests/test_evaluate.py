"""
QA evidence for POST /api/v1/evaluate (hackathon rubric: "QA & UAT
Evidence"). Runs without a live Postgres/Kafka/n8n — the DB session and
the automation side-effects are mocked so this is a pure unit test of the
route's branching logic:

1. Unknown beneficiary_id -> 404 before any scoring happens.
2. model.pkl missing -> falls back to the deterministic rule-based stub,
   still returns 200 with model_status="stub".
3. HIGH risk_tier -> the n8n + Kafka automation calls both fire.

Run: cd backend && pytest -q
"""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

from app.core.db import get_db
from main import app

EVALUATE_URL = "/api/v1/evaluate"


class _FakeResult:
    def __init__(self, row):
        self._row = row

    def scalar_one_or_none(self):
        return self._row


def _fake_graph_row(**overrides):
    base = dict(
        beneficiary_id="BEN-9021",
        region="Kisumu",
        pillar="Scholarship",
        grade_average=52.0,
        socioeconomic_index=2.1,
        historical_dropouts_in_family=1,
    )
    base.update(overrides)
    return SimpleNamespace(**base)


@pytest.fixture(autouse=True)
def _mock_automation(monkeypatch):
    n8n_mock = AsyncMock(return_value=True)
    kafka_mock = AsyncMock(return_value=True)
    monkeypatch.setattr("app.api.v1.endpoints.evaluate.trigger_n8n_webhook", n8n_mock)
    monkeypatch.setattr("app.api.v1.endpoints.evaluate.publish_alert", kafka_mock)
    yield n8n_mock, kafka_mock


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def _override_db(row):
    async def _fake_get_db():
        session = AsyncMock()
        session.execute.return_value = _FakeResult(row)
        yield session

    app.dependency_overrides[get_db] = _fake_get_db


def test_unknown_beneficiary_returns_404(client):
    _override_db(None)

    resp = client.post(
        EVALUATE_URL,
        json={
            "beneficiary_id": "BEN-UNKNOWN",
            "attendance_rate": 0.9,
            "assignment_completion": 0.9,
            "travel_distance_km": 2.0,
            "region": "Nairobi",
        },
    )
    assert resp.status_code == 404
    assert "not found" in resp.json()["detail"].lower()


def test_high_risk_uses_stub_and_triggers_automation(client, monkeypatch, _mock_automation):
    _override_db(_fake_graph_row())

    def _raise_missing_model(*args, **kwargs):
        raise FileNotFoundError("model.pkl missing")

    # score_beneficiary is imported lazily inside the route, so patch it on
    # the source module — the route's `from app.ml.predict import ...`
    # picks up the patched attribute at call time.
    monkeypatch.setattr("app.ml.predict.score_beneficiary", _raise_missing_model)

    resp = client.post(
        EVALUATE_URL,
        json={
            "beneficiary_id": "BEN-9021",
            "attendance_rate": 0.40,
            "assignment_completion": 0.30,
            "travel_distance_km": 22.0,
            "region": "Kisumu",
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["risk_tier"] == "HIGH"
    assert body["automation_triggered"] is True
    assert body["model_status"] == "stub"
    assert "Low Attendance" in body["drivers"]

    n8n_mock, kafka_mock = _mock_automation
    n8n_mock.assert_awaited_once()
    kafka_mock.assert_awaited_once()


def test_low_risk_does_not_trigger_automation(client, monkeypatch, _mock_automation):
    _override_db(_fake_graph_row())

    def _raise_missing_model(*args, **kwargs):
        raise FileNotFoundError("model.pkl missing")

    monkeypatch.setattr("app.ml.predict.score_beneficiary", _raise_missing_model)

    resp = client.post(
        EVALUATE_URL,
        json={
            "beneficiary_id": "BEN-9021",
            "attendance_rate": 0.95,
            "assignment_completion": 0.95,
            "travel_distance_km": 1.0,
            "region": "Nairobi",
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["risk_tier"] == "LOW"
    assert body["automation_triggered"] is False

    n8n_mock, kafka_mock = _mock_automation
    n8n_mock.assert_not_awaited()
    kafka_mock.assert_not_awaited()


def test_request_validation_rejects_out_of_range_attendance(client):
    resp = client.post(
        EVALUATE_URL,
        json={
            "beneficiary_id": "BEN-9021",
            "attendance_rate": 1.5,  # invalid: > 1
            "assignment_completion": 0.5,
            "travel_distance_km": 5.0,
            "region": "Nairobi",
        },
    )
    assert resp.status_code == 422
