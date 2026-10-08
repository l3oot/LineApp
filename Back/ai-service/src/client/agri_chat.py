"""ถามความรู้เกษตรผ่าน SSE ของ agri.pathumma แล้วใช้เฉพาะเหตุการณ์ type=done"""

from __future__ import annotations

import json
import logging
from typing import Any

import requests

from src.config import settings
from src.utils.request_id import get_request_id

logger = logging.getLogger(__name__)

_HISTORY_LIMIT = 8


class AgriChatError(Exception):
    """เรียกแชทความรู้เกษตรไม่สำเร็จ หรือสตรีมไม่มีเหตุการณ์ done"""


def build_agri_messages(
    user_message: str,
    history: list[dict[str, Any]] | None = None,
) -> list[dict[str, str]]:
    """แปลงประวัติแชทเป็น messages ที่ API ใช้ฟิลด์ text"""
    messages: list[dict[str, str]] = []
    for turn in (history or [])[-_HISTORY_LIMIT:]:
        if not isinstance(turn, dict):
            continue
        role = str(turn.get("role") or "").strip()
        text = str(turn.get("content") or turn.get("text") or "").strip()
        if role not in ("user", "assistant") or not text:
            continue
        messages.append({"role": role, "text": text})
    current = (user_message or "").strip()
    if current:
        messages.append({"role": "user", "text": current})
    return messages


def done_text_from_sse_line(line: str) -> str | None:
    """คืน text เมื่อบรรทัด SSE เป็นเหตุการณ์ type=done และมีข้อความ"""
    raw = (line or "").strip()
    if raw.startswith("data:"):
        raw = raw[5:].strip()
    else:
        return None
    if not raw or raw == "[DONE]":
        return None
    try:
        event = json.loads(raw)
    except json.JSONDecodeError:
        return None
    if not isinstance(event, dict) or event.get("type") != "done":
        return None
    text = event.get("text")
    if not isinstance(text, str):
        return None
    cleaned = text.strip()
    return cleaned or None


def ask_agri_chat(messages: list[dict[str, str]]) -> str:
    """POST /api/chat/stream แล้วคืนข้อความจากเหตุการณ์ done ครั้งแรก"""
    if not messages:
        raise AgriChatError("empty messages")
    url = settings.agri_chat_stream_url
    timeout = settings.agri_chat_timeout_seconds
    logger.info(
        "[ai-route] hop=ai reqId=%s action=agri-chat-start msgs=%d",
        get_request_id(),
        len(messages),
    )
    response: requests.Response | None = None
    try:
        response = requests.post(
            url,
            json={"messages": messages},
            headers={
                "Content-Type": "application/json",
                "Accept": "text/event-stream",
            },
            stream=True,
            timeout=(10, timeout),
        )
        response.raise_for_status()
        response.encoding = "utf-8"
        for line in response.iter_lines(decode_unicode=True):
            if not line:
                continue
            text = done_text_from_sse_line(line)
            if text:
                logger.info(
                    "[ai-route] hop=ai reqId=%s action=agri-chat-done chars=%d",
                    get_request_id(),
                    len(text),
                )
                return text
    except requests.RequestException as exc:
        logger.warning(
            "[ai-route] hop=ai reqId=%s action=agri-chat-fail error=%s",
            get_request_id(),
            exc,
        )
        raise AgriChatError(str(exc)) from exc
    finally:
        if response is not None:
            response.close()
    raise AgriChatError("sse done event missing")
