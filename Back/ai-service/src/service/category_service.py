"""Logic เกี่ยวกับ category — เตรียมข้อมูลให้ LLM และ map name → categoryId"""

from __future__ import annotations

from typing import Any
from uuid import UUID


def categories_for_prompt(categories: list[dict[str, Any]]) -> list[dict[str, str | None]]:
    """ส่งให้ LLM แค่ name + type — categoryId map ฝั่ง server หลัง parse"""
    out: list[dict[str, str | None]] = []
    for row in categories:
        if not isinstance(row, dict):
            continue
        out.append({"name": row.get("name"), "type": row.get("type")})
    return out


def resolve_category(
    categories: list[dict[str, Any]],
    category_name: str | None,
    type_hint: str | None = None,
) -> tuple[UUID | None, str | None]:
    """หา category จาก name ที่ LLM ตอบมา — เปรียบเทียบแบบ trim + casefold
    ถ้าระบุ type_hint จะให้ความสำคัญกับ category ที่ type ตรงกันก่อน
    คืน (categoryId, categoryName) โดย categoryName เป็นชื่อ canonical จากรายการ
    """
    name = (category_name or "").strip()
    if not name:
        return None, None
    name_key = name.casefold()
    type_key = (type_hint or "").strip().casefold()

    type_match: list[dict[str, Any]] = []
    name_match: list[dict[str, Any]] = []
    for row in categories:
        if not isinstance(row, dict):
            continue
        row_name = str(row.get("name") or "").strip()
        if row_name.casefold() != name_key:
            continue
        row_type = str(row.get("type") or "").strip().casefold()
        if type_key and row_type == type_key:
            type_match.append(row)
        else:
            name_match.append(row)

    pick = (
        type_match[0]
        if len(type_match) == 1
        else (name_match[0] if len(name_match) == 1 else None)
    )
    if pick is None:
        return None, None
    canonical_name = str(pick.get("name") or "").strip() or None
    cid = pick.get("categoryId")
    if cid is None:
        return None, canonical_name
    try:
        return UUID(str(cid)), canonical_name
    except (ValueError, TypeError):
        return None, canonical_name


def allowed_category_ids(categories: list[dict[str, Any]]) -> set[str]:
    """set ของ categoryId (lowercased) ที่อนุญาต — ใช้ตอน sanitize ผลจาก LLM"""
    out: set[str] = set()
    for c in categories:
        if not isinstance(c, dict):
            continue
        cid = c.get("categoryId")
        if cid is not None and str(cid).strip():
            out.add(str(cid).strip().lower())
    return out
