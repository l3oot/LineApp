"""แปลง / ตรวจสอบ / sanitize ผลลัพธ์จาก LLM"""

from __future__ import annotations

import json
import logging
import re
from typing import Any

from pydantic import ValidationError

from src.dto.extract import AiExtractLlmRaw, AiExtractStructured, AiParseResponse
from src.service.category_service import (
    allowed_category_ids,
    resolve_category,
)
from src.service.cycle_service import (
    allowed_cycle_ids,
    resolve_cycle,
)

logger = logging.getLogger(__name__)

_JSON_FENCE = re.compile(r"^\s*```(?:json)?\s*|\s*```\s*$", re.IGNORECASE | re.MULTILINE)
_GRANDMA_ENDINGS = ("จ๊ะ", "จ๋า")


def strip_json_fences(raw: str) -> str:
    return _JSON_FENCE.sub("", raw.strip()).strip()


def structured_from_dict(
    obj: dict[str, Any],
    cycles: list[dict[str, Any]],
    categories: list[dict[str, Any]],
) -> AiExtractStructured | None:
    try:
        raw = AiExtractLlmRaw.model_validate(obj)
        cycle_id, cycle_name = resolve_cycle(cycles, raw.cycleName, raw.cycleFarmType)
        category_id, category_name = resolve_category(
            categories, raw.categoryName, raw.type
        )
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
    try:
        return AiExtractStructured.model_validate(obj)
    except ValidationError:
        return None


def parse_llm_payload(
    payload: Any,
    cycles: list[dict[str, Any]],
    categories: list[dict[str, Any]],
) -> tuple[AiExtractStructured | None, str | None]:
    """แปลง payload จาก LLM → (structured, message)"""
    if payload is None:
        return None, None
    if isinstance(payload, dict):
        structured = structured_from_dict(payload, cycles, categories)
        return (structured, None) if structured else (None, None)
    if isinstance(payload, str):
        text = payload.strip()
        if not text:
            return None, None
        try:
            obj = json.loads(strip_json_fences(text))
            if isinstance(obj, dict):
                structured = structured_from_dict(obj, cycles, categories)
                return (structured, None) if structured else (None, None)
        except (json.JSONDecodeError, ValueError, TypeError):
            pass
        return None, text
    return None, str(payload)


def sanitize_ids(
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


def is_grandma_reply(message: str | None) -> bool:
    """True เมื่อข้อความตอบกลับเป็น 'ยายตอบหลาน' ตามกฎข้อ 5 (ข้อมูลไม่ครบ)"""
    if not message:
        return False
    stripped = message.strip().rstrip(" .!?。！？\n\r\t")
    return any(stripped.endswith(ending) for ending in _GRANDMA_ENDINGS)


def is_valid_response(response: AiParseResponse) -> bool:
    """ตรวจว่า response พร้อมส่งกลับหรือไม่"""
    if response.structured_ok and response.data is not None:
        try:
            AiExtractStructured.model_validate(response.data.model_dump())
            return True
        except ValidationError:
            return False
    return is_grandma_reply(response.message)
