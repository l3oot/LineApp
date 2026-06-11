"""Orchestrate การ extract ข้อความเป็นรายการ: โหลด context → prompt → LLM → parse → sanitize"""

from __future__ import annotations

import json
import logging
from typing import Any

from src.client.lineapp_api import (
    fetch_categories_for_user,
    fetch_cycles_for_user,
    get_lineapp_api_base,
)
from src.config import settings
from src.dto.extract import AiExtractStructured, AiParseResponse
from src.prompts.extract import build_extract_prompt
from src.service.category_service import categories_for_prompt
from src.service.cycle_service import cycles_for_prompt
from src.service.llm_response_parser import (
    is_valid_response,
    parse_llm_payload,
    sanitize_ids,
)
from src.service.llm_service import run_llm

logger = logging.getLogger(__name__)

_RETRY_HINT = (
    "\n\n❗❗ ครั้งนี้ขอ JSON ตามรูปแบบเท่านั้น:\n"
    '{"main": "...", "price": 0, "type": "expense", '
    '"cycleName": "..." หรือ null, "cycleFarmType": "..." หรือ null, '
    '"categoryName": "..." หรือ null}\n'
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
    base = get_lineapp_api_base()
    uid = (user_id or "").strip() or settings.lineapp_default_user_id
    cycles: list[dict[str, Any]] = []
    categories: list[dict[str, Any]] = []
    if uid:
        cycles = fetch_cycles_for_user(base, uid)
        categories = fetch_categories_for_user(base, uid)
        logger.info(
            "Loaded %d cycles, %d categories for userId=%s from %s",
            len(cycles),
            len(categories),
            uid,
            base,
        )

    cycles_json = json.dumps(cycles_for_prompt(cycles), ensure_ascii=False)
    categories_json = json.dumps(categories_for_prompt(categories), ensure_ascii=False)
    base_prompt = build_extract_prompt(text, cycles_json, categories_json)

    max_attempts = max(1, settings.extract_max_retries + 1)
    last_response = _build_response("", None, None)
    for attempt in range(1, max_attempts + 1):
        prompt = base_prompt if attempt == 1 else base_prompt + _RETRY_HINT
        llm_out = run_llm(prompt)
        structured, message = parse_llm_payload(llm_out["result"], cycles, categories)
        structured = sanitize_ids(structured, cycles, categories)
        last_response = _build_response(llm_out["source_model"], structured, message)

        if is_valid_response(last_response):
            logger.info(
                "extract_transaction attempt=%d/%d status=%s",
                attempt,
                max_attempts,
                "structured" if structured else "grandma",
            )
            return last_response

        logger.warning(
            "extract_transaction attempt=%d/%d invalid format — retrying. payload=%s",
            attempt,
            max_attempts,
            str(llm_out["result"])[:300],
        )

    logger.warning(
        "extract_transaction: gave up after %d attempts — returning last response",
        max_attempts,
    )
    return last_response
