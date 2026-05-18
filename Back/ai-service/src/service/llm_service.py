"""เรียก LLM — Typhoon (OpenAI-compatible) ก่อน แล้ว fallback ไป thaillm (typhoon → kbtg)"""

from __future__ import annotations

import json
import logging
from typing import Any

import requests
from openai import OpenAI

from src.config import (
    OPENAI_API_KEY,
    OPENTYPHOON_BASE_URL,
    OPENTYPHOON_MODEL,
    THAILLM_API_KEY,
    THAILLM_KBTG_URL,
    THAILLM_TYPHOON_URL,
)

logger = logging.getLogger(__name__)

THAILLM_HEADERS = {"Content-Type": "application/json", "apikey": THAILLM_API_KEY}


def _is_rate_limited(exc: BaseException) -> bool:
    return (hasattr(exc, "status_code") and getattr(exc, "status_code", None) == 429) or "429" in str(exc)


def _try_json(text: str) -> Any:
    try:
        return json.loads(text)
    except (json.JSONDecodeError, ValueError, TypeError):
        return text


def _call_opentyphoon(prompt: str) -> str:
    client = OpenAI(api_key=OPENAI_API_KEY, base_url=OPENTYPHOON_BASE_URL)
    stream = client.chat.completions.create(
        model=OPENTYPHOON_MODEL,
        messages=[{"role": "system", "content": prompt}],
        temperature=0.3,
        max_completion_tokens=730,
        top_p=0.5,
        stream=True,
    )
    out = ""
    for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            out += delta
    return out


def _call_thaillm(url: str, prompt: str) -> str:
    body = {
        "model": "/model",
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 2048,
        "temperature": 0.3,
    }
    r = requests.post(url, headers=THAILLM_HEADERS, json=body, timeout=60)
    r.raise_for_status()
    return r.json()["choices"][0]["message"]["content"]


def run_llm(prompt: str) -> dict[str, Any]:
    """รัน LLM ตาม fallback chain — คืน {"source_model", "result"}; result เป็น dict (JSON) หรือ str (ข้อความ)"""
    try:
        text = _call_opentyphoon(prompt)
        return {
            "source_model": f"api.opentyphoon.ai / {OPENTYPHOON_MODEL}",
            "result": _try_json(text),
        }
    except Exception as e:
        if not _is_rate_limited(e):
            raise
        logger.warning("opentyphoon rate-limited — fallback to thaillm typhoon")

    try:
        text = _call_thaillm(THAILLM_TYPHOON_URL, prompt)
        return {"source_model": "thaillm / typhoon", "result": _try_json(text)}
    except Exception as e:
        if not _is_rate_limited(e):
            raise
        logger.warning("thaillm typhoon rate-limited — fallback to thaillm kbtg")

    text = _call_thaillm(THAILLM_KBTG_URL, prompt)
    return {"source_model": "thaillm / kbtg", "result": _try_json(text)}
