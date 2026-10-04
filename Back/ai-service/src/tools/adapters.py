"""Local tool handlers ที่ไม่เรียก user-service REST โดยตรง"""

from __future__ import annotations

from typing import Any

from src.service.extract_service import extract_transaction


def run_local_handler(handler: str, args: dict[str, Any], user_id: str | None) -> Any:
    if handler == "parse_expense":
        text = str(args.get("text") or "").strip()
        result = extract_transaction(text, user_id)
        return result.model_dump(mode="json")
    raise ValueError(f"unknown local handler: {handler}")
