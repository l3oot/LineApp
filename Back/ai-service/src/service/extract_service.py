"""Orchestrate การ extract ข้อความเป็นรายการ: โหลด context → prompt → LLM → parse → sanitize"""

from __future__ import annotations

import json
import logging
import time
from concurrent.futures import ThreadPoolExecutor
from contextvars import copy_context
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
from src.service.llm_service import LLM_TIMEOUT_SECONDS, run_llm
from src.utils.request_id import get_request_id

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


def _payload_chars(payload: Any) -> int:
    if payload is None:
        return 0
    if isinstance(payload, str):
        return len(payload)
    try:
        return len(json.dumps(payload, ensure_ascii=False))
    except (TypeError, ValueError):
        return len(str(payload))


def extract_transaction(text: str, user_id: str | None = None) -> AiParseResponse:
    """หลัก entrypoint ของ business logic — controller ควรเรียกตัวนี้ตัวเดียว"""
    t_start = time.monotonic()
    req_id = get_request_id()
    base = get_lineapp_api_base()
    uid = (user_id or "").strip() or settings.lineapp_default_user_id
    cycles: list[dict[str, Any]] = []
    categories: list[dict[str, Any]] = []
    user_svc_ms = 0
    if uid:
        t_ctx = time.monotonic()
        with ThreadPoolExecutor(max_workers=2) as pool:
            cycles_future = pool.submit(copy_context().run, fetch_cycles_for_user, base, uid)
            categories_future = pool.submit(copy_context().run, fetch_categories_for_user, base, uid)
            cycles = cycles_future.result()
            categories = categories_future.result()
        user_svc_ms = int((time.monotonic() - t_ctx) * 1000)
        logger.info(
            "[ai-latency] hop=ai reqId=%s action=context userSvcMs=%d cycles=%d categories=%d userId=%s base=%s",
            req_id,
            user_svc_ms,
            len(cycles),
            len(categories),
            uid,
            base,
        )

    t_prompt = time.monotonic()
    cycles_json = json.dumps(cycles_for_prompt(cycles), ensure_ascii=False)
    categories_json = json.dumps(categories_for_prompt(categories), ensure_ascii=False)
    icons_json = icons_json_for_prompt()
    base_prompt = build_extract_prompt(text, cycles_json, categories_json, icons_json)
    prompt_ms = int((time.monotonic() - t_prompt) * 1000)
    prompt_chars = len(base_prompt)
    logger.info(
        "[ai-latency] hop=ai reqId=%s action=prompt-prep promptMs=%d promptChars=%d "
        "model=%s timeoutS=%.1f maxRetries=%d textChars=%d",
        req_id,
        prompt_ms,
        prompt_chars,
        settings.llm.opentyphoon_model,
        LLM_TIMEOUT_SECONDS,
        settings.extract_max_retries,
        len(text or ""),
    )

    max_attempts = max(1, settings.extract_max_retries + 1)
    last_response = _build_response("", None, None)
    llm_calls = 0
    llm_ms_total = 0
    parse_ms_total = 0
    validate_ms_total = 0
    last_model = ""
    last_providers_tried = 0
    last_result_chars = 0
    for attempt in range(1, max_attempts + 1):
        prompt = base_prompt if attempt == 1 else base_prompt + _RETRY_HINT
        t_attempt = time.monotonic()
        try:
            t_llm = time.monotonic()
            llm_out = run_llm(prompt)
            llm_ms = int(llm_out.get("llm_ms") or ((time.monotonic() - t_llm) * 1000))
            llm_calls += int(llm_out.get("providers_tried") or 1)
            llm_ms_total += llm_ms
            last_model = str(llm_out.get("source_model") or "")
            last_providers_tried = int(llm_out.get("providers_tried") or 1)
            last_result_chars = int(llm_out.get("result_chars") or _payload_chars(llm_out.get("result")))

            t_parse = time.monotonic()
            structured, message = parse_llm_payload(llm_out["result"], cycles, categories)
            parse_ms = int((time.monotonic() - t_parse) * 1000)
            parse_ms_total += parse_ms

            t_validate = time.monotonic()
            structured = sanitize_ids(structured, cycles, categories)
            structured = sanitize_icon(structured)
            last_response = _build_response(llm_out["source_model"], structured, message)
            valid = is_valid_response(last_response, text)
            validate_ms = int((time.monotonic() - t_validate) * 1000)
            validate_ms_total += validate_ms
            logger.info(
                "[ai-latency] hop=ai reqId=%s action=parse-attempt attempt=%d/%d model=%s "
                "llmMs=%d parseMs=%d validateMs=%d providersTried=%d resultChars=%d elapsed_ms=%d",
                req_id,
                attempt,
                max_attempts,
                last_model,
                llm_ms,
                parse_ms,
                validate_ms,
                last_providers_tried,
                last_result_chars,
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

        if valid:
            logger.info(
                "[ai-latency] hop=ai reqId=%s action=parse-breakdown "
                "status=%s attempt=%d/%d llmCalls=%d model=%s "
                "contextMs=%d promptMs=%d llmMs=%d parseMs=%d validateMs=%d "
                "promptChars=%d resultChars=%d timeoutS=%.1f totalMs=%d",
                req_id,
                "structured" if structured else "grandma",
                attempt,
                max_attempts,
                llm_calls,
                last_model,
                user_svc_ms,
                prompt_ms,
                llm_ms_total,
                parse_ms_total,
                validate_ms_total,
                prompt_chars,
                last_result_chars,
                LLM_TIMEOUT_SECONDS,
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
        "[ai-latency] hop=ai reqId=%s action=parse-giveup attempts=%d llmCalls=%d "
        "contextMs=%d promptMs=%d llmMs=%d parseMs=%d validateMs=%d totalMs=%d",
        req_id,
        max_attempts,
        llm_calls,
        user_svc_ms,
        prompt_ms,
        llm_ms_total,
        parse_ms_total,
        validate_ms_total,
        (time.monotonic() - t_start) * 1000,
    )
    return last_response
