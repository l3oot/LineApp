"""Registry shortlist → LLM pick tool → Gateway execute → summarize"""

from __future__ import annotations

import logging
from typing import Any

from src.config import settings
from src.dto.chat import ChatAction, ChatResponse
from src.gateway.api_gateway import GatewayError, execute_tool
from src.prompts.orchestrator import (
    SYSTEM_PERSONA,
    build_summarize_prompt,
    build_tool_select_prompt,
)
from src.registry.api_registry import search_tools
from src.registry.models import RegistryEntry
from src.service.llm_service import run_llm, run_llm_tool_select

logger = logging.getLogger(__name__)

_FALLBACK_REPLY = "ยายขอโทษน้า ยายยังไม่เข้าใจ ช่วยพิมพ์ใหม่อีกครั้งนะจ๊ะ"


def _tools_for_openai(entries: list[RegistryEntry]) -> list[dict[str, Any]]:
    return [e.openai_tool() for e in entries]


def _tools_for_prompt(entries: list[RegistryEntry]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for e in entries:
        out.append(
            {
                "id": e.id,
                "description": e.description,
                "parameters": {
                    name: {
                        "type": p.type,
                        "description": p.description,
                        "required": p.required,
                    }
                    for name, p in e.parameters.items()
                },
            }
        )
    return out


def _extract_create_action(parse_payload: Any) -> ChatAction | None:
    if not isinstance(parse_payload, dict):
        return None
    if not parse_payload.get("structured_ok"):
        return None
    data = parse_payload.get("data")
    if not isinstance(data, dict):
        return None
    if data.get("price") is None or not data.get("type") or not data.get("main"):
        return None
    return ChatAction(type="create_transaction", payload=data)


def _ensure_parse_text(args: dict[str, Any], user_message: str) -> dict[str, Any]:
    cleaned = dict(args or {})
    if not cleaned.get("text"):
        cleaned["text"] = user_message
    return cleaned


def run_tool_loop(user_message: str, user_id: str | None) -> ChatResponse:
    shortlist = search_tools(user_message, limit=6)
    openai_tools = _tools_for_openai(shortlist)
    fallback_prompt = build_tool_select_prompt(user_message, _tools_for_prompt(shortlist))

    tools_used: list[str] = []
    source_model: str | None = None
    max_rounds = max(1, settings.orchestrator_max_tool_rounds)

    for round_i in range(max_rounds):
        selection = run_llm_tool_select(
            system_prompt=SYSTEM_PERSONA,
            user_message=user_message,
            tools=openai_tools,
            fallback_prompt=fallback_prompt,
        )
        source_model = selection.get("source_model") or source_model
        tool_name = selection.get("tool_name")
        arguments = selection.get("arguments") or {}
        direct_reply = selection.get("reply")

        if not tool_name:
            text = (direct_reply or "").strip() or _FALLBACK_REPLY
            return ChatResponse(
                reply_text=text,
                actions=[],
                tools_used=tools_used,
                source_model=source_model,
            )

        if tool_name == "parse_expense":
            arguments = _ensure_parse_text(arguments, user_message)

        tools_used.append(tool_name)
        try:
            result = execute_tool(tool_name, arguments, user_id)
        except GatewayError as exc:
            logger.warning("gateway error tool=%s round=%s: %s", tool_name, round_i, exc.message)
            return ChatResponse(
                reply_text="ยายดึงข้อมูลไม่สำเร็จตอนนี้นะจ๊ะ ลองถามใหม่อีกครั้งหรือเปลี่ยนวัน/จังหวัดดูนะจ๊ะ",
                actions=[],
                tools_used=tools_used,
                source_model=source_model,
            )
        data = result.get("data")

        if tool_name == "parse_expense":
            action = _extract_create_action(data)
            if action is not None:
                return ChatResponse(
                    reply_text="",
                    actions=[action],
                    tools_used=tools_used,
                    source_model=source_model,
                )
            # structured ไม่ครบ — ใช้ message จาก parse ถ้ามี
            if isinstance(data, dict) and data.get("message"):
                return ChatResponse(
                    reply_text=str(data["message"]),
                    actions=[],
                    tools_used=tools_used,
                    source_model=source_model,
                )

        summarize_prompt = build_summarize_prompt(user_message, tool_name, data)
        try:
            summarized = run_llm(summarize_prompt)
            source_model = summarized.get("source_model") or source_model
            result_payload = summarized.get("result")
            if isinstance(result_payload, str) and result_payload.strip():
                reply = result_payload.strip()
            elif isinstance(result_payload, dict):
                reply = str(result_payload.get("reply") or result_payload.get("message") or "").strip()
                if not reply:
                    reply = "ยายดูข้อมูลให้นะจ๊ะ แต่สรุปไม่ชัด ลองถามใหม่อีกครั้งนะจ๊ะ"
            else:
                reply = "ยายดูข้อมูลให้นะจ๊ะ แต่สรุปไม่ชัด ลองถามใหม่อีกครั้งนะจ๊ะ"
            return ChatResponse(
                reply_text=reply,
                actions=[],
                tools_used=tools_used,
                source_model=source_model,
            )
        except Exception as exc:
            logger.warning("summarize failed tool=%s: %s", tool_name, exc)
            return ChatResponse(
                reply_text="ยายดึงข้อมูลได้แล้วนะจ๊ะ แต่สรุปไม่ทัน ลองถามใหม่อีกครั้งนะจ๊ะ",
                actions=[],
                tools_used=tools_used,
                source_model=source_model,
            )

    return ChatResponse(
        reply_text=_FALLBACK_REPLY,
        actions=[],
        tools_used=tools_used,
        source_model=source_model,
    )
