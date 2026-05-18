"""Logic เกี่ยวกับรอบปลูก — เตรียมข้อมูลให้ LLM และ map label → cycleId"""

from __future__ import annotations

from typing import Any
from uuid import UUID


def cycles_for_prompt(cycles: list[dict[str, Any]]) -> list[dict[str, str | None]]:
    """ส่งให้ LLM แค่ name + farmType — cycleId map ฝั่ง server หลัง parse"""
    out: list[dict[str, str | None]] = []
    for row in cycles:
        if not isinstance(row, dict):
            continue
        out.append({"name": row.get("name"), "farmType": row.get("farmType")})
    return out


def resolve_cycle(
    cycles: list[dict[str, Any]],
    cycle_name: str | None,
    cycle_farm_type: str | None,
) -> tuple[UUID | None, str | None]:
    """หา cycle จาก (name, farmType) ที่ LLM ตอบมา — เปรียบเทียบแบบ trim + casefold
    คืน (cycleId, cycleName) โดย cycleName เป็นชื่อ canonical จากรายการ
    """
    name = (cycle_name or "").strip()
    if not name:
        return None, None
    farm = (cycle_farm_type or "").strip()
    name_key = name.casefold()
    farm_key = farm.casefold()

    exact: list[dict[str, Any]] = []
    name_only: list[dict[str, Any]] = []
    for row in cycles:
        if not isinstance(row, dict):
            continue
        row_name = str(row.get("name") or "").strip()
        if row_name.casefold() != name_key:
            continue
        row_farm = str(row.get("farmType") or "").strip()
        if farm and row_farm.casefold() == farm_key:
            exact.append(row)
        elif not farm:
            name_only.append(row)

    pick = exact[0] if len(exact) == 1 else (name_only[0] if len(name_only) == 1 else None)
    if pick is None:
        return None, None
    canonical_name = str(pick.get("name") or "").strip() or None
    cid = pick.get("cycleId")
    if cid is None:
        return None, canonical_name
    try:
        return UUID(str(cid)), canonical_name
    except (ValueError, TypeError):
        return None, canonical_name


def allowed_cycle_ids(cycles: list[dict[str, Any]]) -> set[str]:
    """set ของ cycleId (lowercased) ที่อนุญาต — ใช้ตอน sanitize ผลจาก LLM"""
    out: set[str] = set()
    for c in cycles:
        if not isinstance(c, dict):
            continue
        cid = c.get("cycleId")
        if cid is not None and str(cid).strip():
            out.add(str(cid).strip().lower())
    return out
