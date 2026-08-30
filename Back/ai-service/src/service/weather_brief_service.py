"""สรุปอากาศสำหรับ LINE จาก hourly + DescriptionThai"""

from __future__ import annotations

import json
import logging
from typing import Any

from src.dto.weather_brief import WeatherBriefSummarizeResponse
from src.prompts.weather_brief import build_weather_brief_prompt
from src.service.llm_service import run_llm

logger = logging.getLogger(__name__)

MAX_CHARS = 300


def _summary_from_llm(payload: Any) -> str:
    if isinstance(payload, str):
        return payload.strip()
    if isinstance(payload, dict):
        for key in ("summary", "text", "result", "message"):
            value = payload.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
        return json.dumps(payload, ensure_ascii=False)
    if payload is None:
        return ""
    return str(payload).strip()


def _limit_chars(text: str) -> str:
    compact = " ".join(text.split())
    if len(compact) <= MAX_CHARS:
        return compact
    return compact[:MAX_CHARS].rstrip()


def summarize_weather_brief(hourly_forecast: str, description_thai: str) -> WeatherBriefSummarizeResponse:
    prompt = build_weather_brief_prompt(hourly_forecast, description_thai)
    llm_out = run_llm(prompt)
    summary = _limit_chars(_summary_from_llm(llm_out.get("result")))
    if not summary:
        raise RuntimeError("weather brief LLM returned empty summary")
    source_model = str(llm_out.get("source_model") or "unknown")
    logger.info(
        "[weather-brief] summarized chars_in=%d+%d chars_out=%d model=%s",
        len(hourly_forecast or ""),
        len(description_thai or ""),
        len(summary),
        source_model,
    )
    return WeatherBriefSummarizeResponse(source_model=source_model, summary=summary)
