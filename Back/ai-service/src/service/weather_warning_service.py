"""สรุปประกาศเตือนภัยอากาศจาก DescriptionThai"""

from __future__ import annotations

import json
import logging
from typing import Any

from src.dto.weather_warning import WeatherWarningSummarizeResponse
from src.prompts.weather_warning import build_weather_warning_prompt
from src.service.llm_service import run_llm

logger = logging.getLogger(__name__)


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


def summarize_weather_warning(description_thai: str) -> WeatherWarningSummarizeResponse:
    prompt = build_weather_warning_prompt(description_thai)
    llm_out = run_llm(prompt)
    summary = _summary_from_llm(llm_out.get("result"))
    if not summary:
        raise RuntimeError("weather warning LLM returned empty summary")
    source_model = str(llm_out.get("source_model") or "unknown")
    logger.info("[weather-warning] summarized chars_in=%d chars_out=%d model=%s",
                len(description_thai), len(summary), source_model)
    return WeatherWarningSummarizeResponse(source_model=source_model, summary=summary)
