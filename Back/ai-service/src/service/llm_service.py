"""เรียก LLM — Typhoon (OpenAI-compatible) ก่อน แล้ว fallback ไป thaillm (typhoon → kbtg)"""

from __future__ import annotations

import json
import logging
from typing import Any

import requests
from openai import OpenAI

from src.config import settings

logger = logging.getLogger(__name__)

_LLM = settings.llm
_THAILLM_HEADERS = {"Content-Type": "application/json", "apikey": _LLM.thaillm_api_key}


def _is_rate_limited(exc: BaseException) -> bool:
    return (hasattr(exc, "status_code") and getattr(exc, "status_code", None) == 429) or "429" in str(
        exc
    )


def _try_json(text: str) -> Any:
    try:
        return json.loads(text)
    except (json.JSONDecodeError, ValueError, TypeError):
        return text


def _call_opentyphoon(prompt: str) -> str:
    client = OpenAI(api_key=_LLM.openai_api_key, base_url=_LLM.opentyphoon_base_url)
    stream = client.chat.completions.create(
        model=_LLM.opentyphoon_model,
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
    response = requests.post(url, headers=_THAILLM_HEADERS, json=body, timeout=60)
    response.raise_for_status()
    return response.json()["choices"][0]["message"]["content"]


def run_llm(prompt: str) -> dict[str, Any]:
    """รัน LLM ตาม fallback chain — คืน {"source_model", "result"}"""
    try:
        text = _call_opentyphoon(prompt)
        return {
            "source_model": f"api.opentyphoon.ai / {_LLM.opentyphoon_model}",
            "result": _try_json(text),
        }
    except Exception as exc:
        if not _is_rate_limited(exc):
            raise
        logger.warning("opentyphoon rate-limited — fallback to thaillm typhoon")

    try:
        text = _call_thaillm(_LLM.thaillm_typhoon_url, prompt)
        return {"source_model": "thaillm / typhoon", "result": _try_json(text)}
    except Exception as exc:
        if not _is_rate_limited(exc):
            raise
        logger.warning("thaillm typhoon rate-limited — fallback to thaillm kbtg")

    text = _call_thaillm(_LLM.thaillm_kbtg_url, prompt)
    return {"source_model": "thaillm / kbtg", "result": _try_json(text)}
