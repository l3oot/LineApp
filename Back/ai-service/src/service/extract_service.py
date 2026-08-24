"""Orchestrate การ extract ข้อความเป็นรายการ: โหลด context → prompt → LLM → parse → sanitize"""

from __future__ import annotations

import json
import logging
import time
from concurrent.futures import ThreadPoolExecutor
from typing import Any

from src.client.lineapp_api import (
    fetch_categories_for_user,
    fetch_cycles_for_user,
    get_lineapp_api_base,
)
from src.config import settings
from src.data.icons import icons_json_for_prompt
from src.dto.extract import AiExtractStructured, AiParseResponse
from src.prompts.extract import build_extract_prompt
from src.service.category_service import categories_for_prompt
from src.service.cycle_service import cycles_for_prompt
from src.service.llm_response_parser import (
    fallback_extract_from_text,
    is_valid_response,
    looks_like_complete_transaction,
    parse_llm_payload,
    sanitize_icon,
    sanitize_ids,
)
from src.service.llm_service import run_llm

logger = logging.getLogger(__name__)

_RETRY_HINT = (
    "\n\n❗❗ ครั้งนี้ขอ JSON ตามรูปแบบเท่านั้น:\n"
    '{"main": "...", "price": 0, "type": "expense", '
    '"cycleName": null, "cycleFarmType": null, '
    '"categoryName": null, "icon": null}\n'
    "ห้ามทวนข้อความหลานแล้วต่อท้าย จ๊ะ/จ๋า ถ้ามีราคาในข้อความแล้ว\n"
    "ห้ามมีข้อความอื่นนอก JSON ห้ามมี markdown code fence"
)


def _build_response(
    source_model: str,
    structured: AiExtractStructured | None,
    message: str | None,
) -> AiParseResponse:
    return AiParseResponse(
        source_model=source_model,
        data=structured,
        message=message,
        structured_ok=structured is not None,
    )


def extract_transaction(text: str, user_id: str | None = None) -> AiParseResponse:
    """หลัก entrypoint ของ business logic — controller ควรเรียกตัวนี้ตัวเดียว"""
    t_start = time.monotonic()
    base = get_lineapp_api_base()
    uid = (user_id or "").strip() or settings.lineapp_default_user_id
    cycles: list[dict[str, Any]] = []
    categories: list[dict[str, Any]] = []
    if uid:
        # [Debug Step 2.User Service] เดิมยิง 2 request ไป user-service ตามลำดับ
        # (สูงสุดรวมกัน ~30s) — ยิงพร้อมกันแทนเพื่อลดเวลาที่รอ
        t_ctx = time.monotonic()
        with ThreadPoolExecutor(max_workers=2) as pool:
            cycles_future = pool.submit(fetch_cycles_for_user, base, uid)
            categories_future = pool.submit(fetch_categories_for_user, base, uid)
            cycles = cycles_future.result()
            categories = categories_future.result()
        logger.info(
            "[step2:user-service] loaded %d cycles, %d categories for userId=%s from %s elapsed_ms=%d",
            len(cycles),
            len(categories),
            uid,
            base,
            (time.monotonic() - t_ctx) * 1000,
        )

    cycles_json = json.dumps(cycles_for_prompt(cycles), ensure_ascii=False)
    categories_json = json.dumps(categories_for_prompt(categories), ensure_ascii=False)
    icons_json = icons_json_for_prompt()
    base_prompt = build_extract_prompt(text, cycles_json, categories_json, icons_json)

    max_attempts = max(1, settings.extract_max_retries + 1)
    last_response = _build_response("", None, None)
    for attempt in range(1, max_attempts + 1):
        prompt = base_prompt if attempt == 1 else base_prompt + _RETRY_HINT
        t_attempt = time.monotonic()
        try:
            llm_out = run_llm(prompt)
            structured, message = parse_llm_payload(llm_out["result"], cycles, categories)
            structured = sanitize_ids(structured, cycles, categories)
            structured = sanitize_icon(structured)
            last_response = _build_response(llm_out["source_model"], structured, message)
            logger.info(
                "[step1:ai-service] attempt=%d/%d model=%s elapsed_ms=%d",
                attempt,
                max_attempts,
                llm_out["source_model"],
                (time.monotonic() - t_attempt) * 1000,
            )
        except Exception as exc:
            if "all LLM providers failed" in str(exc):
                logger.warning(
                    "extract_transaction attempt=%d/%d all LLM providers unavailable — skip retries",
                    attempt,
                    max_attempts,
                )
                last_response = _build_response(
                    "llm-unavailable",
                    None,
                    "AI service unavailable",
                )
                break
            logger.warning(
                "extract_transaction attempt=%d/%d failed while calling/parsing LLM: %s",
                attempt,
                max_attempts,
                exc,
            )
            continue

        if is_valid_response(last_response, text):
            logger.info(
                "extract_transaction attempt=%d/%d status=%s total_elapsed_ms=%d",
                attempt,
                max_attempts,
                "structured" if structured else "grandma",
                (time.monotonic() - t_start) * 1000,
            )
            return last_response

        logger.warning(
            "extract_transaction attempt=%d/%d invalid format — retrying. payload=%s",
            attempt,
            max_attempts,
            str(llm_out["result"])[:300],
        )

    if looks_like_complete_transaction(text):
        fallback = fallback_extract_from_text(text)
        if fallback is not None:
            fallback = sanitize_ids(fallback, cycles, categories)
            fallback = sanitize_icon(fallback)
            logger.info(
                "extract_transaction: regex fallback structured type=%s main=%s price=%s",
                fallback.type,
                fallback.main,
                fallback.price,
            )
            return _build_response("regex-fallback", fallback, None)

    logger.warning(
        "extract_transaction: gave up after %d attempts total_elapsed_ms=%d — returning last response",
        max_attempts,
        (time.monotonic() - t_start) * 1000,
    )
    return last_response
