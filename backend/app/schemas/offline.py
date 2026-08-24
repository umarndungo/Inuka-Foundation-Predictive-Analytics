from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class OfflineQueueItem(BaseModel):
    id: str = Field(..., min_length=1)
    type: Literal["beneficiary_update", "field_note", "attendance_log", "assessment"]
    payload: dict
    timestamp: datetime
    retries: int = Field(ge=0)
    status: Literal["pending", "syncing", "synced", "failed"]


class OfflineSyncRequest(BaseModel):
    items: list[OfflineQueueItem]


class OfflineSyncError(BaseModel):
    item_id: str
    error: str


class OfflineSyncResponse(BaseModel):
    synced: int
    failed: int
    errors: list[OfflineSyncError]