"""สรุปธุรกรรมในรอบปลูกเป็นข้อความยายบอกหลาน"""

from __future__ import annotations

import json
import logging
from typing import Any

from src.dto.cycle_summary import CycleSummaryResponse
from src.prompts.cycle_summary import build_cycle_summary_prompt
from src.service.llm_service import run_llm

logger = logging.getLogger(__name__)

MAX_CHARS = 500


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


def summarize_cycle(cycle_info: str, transaction_data: str) -> CycleSummaryResponse:
    prompt = build_cycle_summary_prompt(cycle_info, transaction_data)
    llm_out = run_llm(prompt)
    summary = _limit_chars(_summary_from_llm(llm_out.get("result")))
    if not summary:
        raise RuntimeError("cycle summary LLM returned empty summary")
    source_model = str(llm_out.get("source_model") or "unknown")
    logger.info(
        "[cycle-summary] chars_in=%d+%d chars_out=%d model=%s",
        len(cycle_info or ""),
        len(transaction_data or ""),
        len(summary),
        source_model,
    )
    return CycleSummaryResponse(source_model=source_model, summary=summary)
