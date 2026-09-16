"""Correlation id ของ request — ใช้ไล่ latency ข้าม ai-service ↔ user-service"""

from __future__ import annotations

from contextvars import ContextVar

REQUEST_ID_HEADER = "x-request-id"
_request_id: ContextVar[str] = ContextVar("request_id", default="-")


def get_request_id() -> str:
    return _request_id.get() or "-"


def set_request_id(value: str | None) -> str:
    req_id = (value or "").strip() or "-"
    _request_id.set(req_id)
    return req_id
