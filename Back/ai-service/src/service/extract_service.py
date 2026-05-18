"""Orchestrate การ extract ข้อความเป็นรายการ:
โหลด cycles → สร้าง prompt → เรียก LLM → parse JSON → resolve cycleId → sanitize
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any

from pydantic import ValidationError

from src.client.lineapp_api import (
    fetch_categories_for_user,
    fetch_cycles_for_user,
    get_lineapp_api_base,
)
from src.config import EXTRACT_MAX_RETRIES, LINEAPP_DEFAULT_USER_ID
from src.dto.res.extract import (
    AiExtractLlmRaw,
    AiExtractStructured,
    AiParseResponse,
)
from src.prompt.mgs import build_extract_prompt
from src.service.category_service import (
    allowed_category_ids,
    categories_for_prompt,
    resolve_category,
)
from src.service.cycle_service import (
    allowed_cycle_ids,
    cycles_for_prompt,
    resolve_cycle,
)
from src.service.llm_service import run_llm

logger = logging.getLogger(__name__)

_FENCE = re.compile(r"^\s*```(?:json)?\s*|\s*```\s*$", re.IGNORECASE | re.MULTILINE)

# คำลงท้ายของ "ยาย" (ตามกฎข้อ 5 ของ prompt) — ถือเป็นการตอบที่ถูกต้องสำหรับ "ข้อมูลไม่ครบ"
_GRANDMA_ENDINGS = ("จ๊ะ", "จ๋า")

_RETRY_HINT = (
    "\n\n❗❗ ครั้งนี้ขอ JSON ตามรูปแบบเท่านั้น:\n"
    '{"main": "...", "price": 0, "type": "expense", '
    '"cycleName": "..." หรือ null, "cycleFarmType": "..." หรือ null, '
    '"categoryName": "..." หรือ null}\n'
    "ห้ามมีข้อความอื่นนอก JSON ห้ามมี markdown code fence"
)


def _strip_json_fences(raw: str) -> str:
    return _FENCE.sub("", raw.strip()).strip()


def _structured_from_dict(
    obj: dict[str, Any],
    cycles: list[dict[str, Any]],
    categories: list[dict[str, Any]],
) -> AiExtractStructured | None:
    # path A: LLM ตอบ cycleName/cycleFarmType/categoryName (รูปแบบใหม่)
    try:
        raw = AiExtractLlmRaw.model_validate(obj)
        cycle_id, cycle_name = resolve_cycle(cycles, raw.cycleName, raw.cycleFarmType)
        category_id, category_name = resolve_category(categories, raw.categoryName, raw.type)
        return AiExtractStructured(
            main=raw.main,
            price=raw.price,
            type=raw.type,
            cycleId=cycle_id,
            cycleName=cycle_name,
            categoryId=category_id,
            categoryName=category_name,
        )
    except ValidationError:
        pass
    # path B: LLM ตอบ cycleId/categoryId ตรง ๆ (รูปแบบเก่า — เผื่อ backward compat)
    try:
        return AiExtractStructured.model_validate(obj)
    except ValidationError:
        return None


def parse_llm_payload(
    payload: Any,
    cycles: list[dict[str, Any]],
    categories: list[dict[str, Any]],
) -> tuple[AiExtractStructured | None, str | None]:
    """แปลง payload จาก LLM → (structured, message)
    - dict ที่ valid → (AiExtractStructured, None)
    - string ที่เป็น JSON valid → (AiExtractStructured, None)
    - string อื่น ๆ → (None, ข้อความตอบกลับแบบยาย)
    """
    if payload is None:
        return None, None
    if isinstance(payload, dict):
        s = _structured_from_dict(payload, cycles, categories)
        return (s, None) if s else (None, None)
    if isinstance(payload, str):
        text = payload.strip()
        if not text:
            return None, None
        try:
            obj = json.loads(_strip_json_fences(text))
            if isinstance(obj, dict):
                s = _structured_from_dict(obj, cycles, categories)
                return (s, None) if s else (None, None)
        except (json.JSONDecodeError, ValueError, TypeError):
            pass
        return None, text
    return None, str(payload)


def _sanitize_ids(
    structured: AiExtractStructured | None,
    cycles: list[dict[str, Any]],
    categories: list[dict[str, Any]],
) -> AiExtractStructured | None:
    """กัน LLM แต่ง UUID — ถ้าไม่อยู่ในรายการที่ดึงมาจริง ให้ล้าง id+name เป็น null"""
    if structured is None:
        return structured
    updates: dict[str, Any] = {}
    if structured.cycleId is not None:
        allowed = allowed_cycle_ids(cycles)
        if str(structured.cycleId).strip().lower() not in allowed:
            logger.info(
                "cycleId from LLM not in fetched cycles — cleared. got=%s allowed=%s",
                structured.cycleId,
                sorted(allowed),
            )
            updates["cycleId"] = None
            updates["cycleName"] = None
    if structured.categoryId is not None:
        allowed_cats = allowed_category_ids(categories)
        if str(structured.categoryId).strip().lower() not in allowed_cats:
            logger.info(
                "categoryId from LLM not in fetched categories — cleared. got=%s allowed=%s",
                structured.categoryId,
                sorted(allowed_cats),
            )
            updates["categoryId"] = None
            updates["categoryName"] = None
    return structured.model_copy(update=updates) if updates else structured


def _is_grandma_reply(message: str | None) -> bool:
    """True เมื่อข้อความตอบกลับเป็น 'ยายตอบหลาน' ตามกฎข้อ 5 (ข้อมูลไม่ครบ)"""
    if not message:
        return False
    stripped = message.strip().rstrip(" .!?。！？\n\r\t")
    return any(stripped.endswith(e) for e in _GRANDMA_ENDINGS)


def _validate_response(response: AiParseResponse) -> bool:
    """ตรวจว่า response พร้อมส่งกลับหรือไม่:
    - มี data ที่ valid → ผ่าน
    - เป็นข้อความ 'ยายตอบหลาน' ที่ถูกกฎ → ผ่าน
    - กรณีอื่น (LLM ตอบ format เพี้ยน / JSON ไม่ครบ) → ไม่ผ่าน → retry
    """
    if response.structured_ok and response.data is not None:
        try:
            AiExtractStructured.model_validate(response.data.model_dump())
            return True
        except ValidationError:
            return False
    return _is_grandma_reply(response.message)


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
    """หลัก entrypoint ของ business logic — controller ควรเรียกตัวนี้ตัวเดียว

    มี retry เมื่อ LLM ตอบ format เพี้ยน (ไม่ผ่าน schema และไม่ใช่ข้อความยาย)
    จำนวนครั้งคุมจาก env EXTRACT_MAX_RETRIES (default 2)
    """
    base = get_lineapp_api_base()
    uid = (user_id or "").strip() or LINEAPP_DEFAULT_USER_ID
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

    max_attempts = max(1, EXTRACT_MAX_RETRIES + 1)
    last_response = _build_response("", None, None)
    for attempt in range(1, max_attempts + 1):
        prompt = base_prompt if attempt == 1 else base_prompt + _RETRY_HINT
        llm_out = run_llm(prompt)
        structured, message = parse_llm_payload(llm_out["result"], cycles, categories)
        structured = _sanitize_ids(structured, cycles, categories)
        last_response = _build_response(llm_out["source_model"], structured, message)

        if _validate_response(last_response):
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
