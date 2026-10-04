"""โหลด whitelist จาก YAML และค้นหา tools ที่เกี่ยวข้องกับข้อความผู้ใช้"""

from __future__ import annotations

import logging
import re
from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml

from src.registry.models import RegistryEntry, ToolParameter

logger = logging.getLogger(__name__)

_ENTRIES_PATH = Path(__file__).with_name("entries.yaml")


def _parse_entry(raw: dict[str, Any]) -> RegistryEntry:
    params_raw = raw.get("parameters") or {}
    parameters = {
        name: ToolParameter(**param) if isinstance(param, dict) else ToolParameter()
        for name, param in params_raw.items()
    }
    return RegistryEntry(
        id=raw["id"],
        description=raw.get("description", ""),
        keywords=list(raw.get("keywords") or []),
        permission=raw.get("permission", "read"),
        method=raw.get("method", "GET"),
        path=raw.get("path"),
        executor=raw.get("executor", "http"),
        handler=raw.get("handler"),
        parameters=parameters,
    )


@lru_cache(maxsize=1)
def load_entries() -> tuple[RegistryEntry, ...]:
    with _ENTRIES_PATH.open(encoding="utf-8") as fh:
        data = yaml.safe_load(fh) or {}
    tools = data.get("tools") or []
    entries = tuple(_parse_entry(item) for item in tools if isinstance(item, dict) and item.get("id"))
    logger.info("api_registry loaded entries=%d path=%s", len(entries), _ENTRIES_PATH)
    return entries


def get_entry(tool_id: str) -> RegistryEntry | None:
    tid = (tool_id or "").strip()
    if not tid:
        return None
    for entry in load_entries():
        if entry.id == tid:
            return entry
    return None


def all_entries() -> list[RegistryEntry]:
    return list(load_entries())


def search_tools(query: str, *, limit: int = 6) -> list[RegistryEntry]:
    """คะแนนจาก keyword overlap + คำใน description — คืน shortlist สำหรับ LLM"""
    text = (query or "").strip().lower()
    if not text:
        return all_entries()[:limit]

    tokens = {t for t in re.split(r"\s+", text) if t}
    scored: list[tuple[int, RegistryEntry]] = []
    for entry in load_entries():
        score = 0
        for kw in entry.keywords:
            k = kw.lower()
            if k and k in text:
                score += 3
            elif any(k in tok or tok in k for tok in tokens if len(tok) >= 2):
                score += 1
        desc = entry.description.lower()
        for tok in tokens:
            if len(tok) >= 2 and tok in desc:
                score += 1
        # parse_expense เป็น fallback เมื่อมีตัวเลข/บาท
        if entry.id == "parse_expense" and re.search(r"\d", text):
            score += 2
        if score > 0:
            scored.append((score, entry))

    scored.sort(key=lambda x: (-x[0], x[1].id))
    if not scored:
        # ไม่เจอ keyword — ส่งชุดหลักสั้น ๆ ให้ LLM เลือกเอง
        fallback_ids = {
            "parse_expense",
            "get_weather_forecast",
            "search_agri_prices",
            "list_transactions",
            "list_cycles",
        }
        return [e for e in load_entries() if e.id in fallback_ids][:limit]
    return [e for _, e in scored[:limit]]
