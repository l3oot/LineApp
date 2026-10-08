"""กฎบันทึกรายการก่อน → ถ้าไม่เข้าเกณฑ์ LLM เลือก tool → Gateway execute → summarize"""

from __future__ import annotations

import logging
from typing import Any

from src.client.lineapp_api import fetch_user_profile, get_lineapp_api_base
from src.config import settings
from src.dto.chat import ChatAction, ChatResponse, ChatTurn
from src.gateway.api_gateway import GatewayError, execute_tool
from src.orchestrator.intent_rules import (
    WEB_ENTRY_REPLY,
    RouteDecision,
    classify_list_agri_products_intent,
    classify_record_intent,
    classify_web_entry_intent,
    sanitize_unverified_save,
)
from src.orchestrator.weather_location import (
    NO_PROFILE_PLACE_REPLY,
    WEATHER_TOOLS,
    prepare_weather_arguments,
)
from src.prompts.orchestrator import (
    SYSTEM_PERSONA,
    TOOL_ROUTER_RULES,
    build_summarize_prompt,
    build_tool_select_prompt,
    format_history_transcript,
)
from src.registry.api_registry import search_tools
from src.registry.models import RegistryEntry
from src.service.llm_service import run_llm, run_llm_tool_select
from src.utils.request_id import get_request_id

logger = logging.getLogger(__name__)

_FALLBACK_REPLY = "ยายขอโทษน้า ยายยังไม่เข้าใจ ช่วยพิมพ์ใหม่อีกครั้งนะจ๊ะ"
_REPLY_CHAT = "reply_chat"
_LIST_AGRI_PRODUCTS_TOOL = "list_agri_products"
_PRODUCT_LIST_LIMIT = 40

_ROUTER_SYSTEM = f"{SYSTEM_PERSONA}\n\n{TOOL_ROUTER_RULES}"

_REPLY_CHAT_TOOL: dict[str, Any] = {
    "type": "function",
    "function": {
        "name": _REPLY_CHAT,
        "description": (
            "ตอบหลานเป็นข้อความเมื่อไม่ต้องบันทึกรายการและไม่ต้องดึงข้อมูลจากเครื่องมืออื่น "
            "ห้ามใช้เมื่อข้อความเป็นคำสั่งซื้อ จ่าย ขาย ได้ หรือรับที่ตามด้วยตัวเลขเงิน"
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "reply": {
                    "type": "string",
                    "description": "ข้อความตอบหลาน ห้ามบอกว่าบันทึกแล้ว จดแล้ว หรือลงรายการแล้ว",
                }
            },
            "required": ["reply"],
        },
    },
}


def _tools_for_openai(entries: list[RegistryEntry]) -> list[dict[str, Any]]:
    return [e.openai_tool() for e in entries] + [_REPLY_CHAT_TOOL]


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
    out.append(
        {
            "id": _REPLY_CHAT,
            "description": _REPLY_CHAT_TOOL["function"]["description"],
            "parameters": {
                "reply": {
                    "type": "string",
                    "description": "ข้อความตอบหลาน ห้ามบอกว่าบันทึกแล้ว",
                    "required": True,
                }
            },
        }
    )
    return out


def _unwrap_string_list(data: Any) -> list[str]:
    if isinstance(data, list):
        return [str(item).strip() for item in data if str(item).strip()]
    if isinstance(data, dict):
        inner = data.get("data")
        if isinstance(inner, list):
            return [str(item).strip() for item in inner if str(item).strip()]
    return []


def _format_agri_product_list(data: Any) -> str:
    names = _unwrap_string_list(data)
    if not names:
        return "ตอนนี้ยายยังดึงรายการสินค้าไม่ได้จ๊ะ ลองใหม่อีกครั้งนะจ๊ะ"
    shown = names[:_PRODUCT_LIST_LIMIT]
    lines = [f"🥬 รายการสินค้าที่มีราคา มี {len(names)} รายการนะจ๊ะ"]
    lines.extend(f"• {name}" for name in shown)
    if len(names) > _PRODUCT_LIST_LIMIT:
        lines.append(f"…และอีก {len(names) - _PRODUCT_LIST_LIMIT} รายการ")
    lines.append("ถ้าอยากดูราคา พิมพ์ เช่น ราคามะนาว นะจ๊ะ")
    return "\n".join(lines)


def _history_as_dicts(history: list[ChatTurn] | list[dict[str, Any]] | None) -> list[dict[str, Any]]:
    if not history:
        return []
    out: list[dict[str, Any]] = []
    for turn in history:
        if isinstance(turn, ChatTurn):
            role = turn.role
            content = (turn.content or "").strip()
        elif isinstance(turn, dict):
            role = str(turn.get("role") or "").strip()
            content = str(turn.get("content") or "").strip()
        else:
            continue
        if role not in ("user", "assistant") or not content:
            continue
        out.append({"role": role, "content": content})
    return out


def _compose_llm_user_message(user_message: str, history: list[dict[str, Any]]) -> str:
    history_block = format_history_transcript(history)
    if not history_block:
        return user_message
    return f"{history_block}ข้อความล่าสุดของหลาน:\n{user_message.strip()}"


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


def _log_route(decision: RouteDecision, user_message: str, context_msgs: int) -> None:
    preview = " ".join((user_message or "").split())[:80]
    logger.info(
        "[ai-route] hop=ai reqId=%s intent=%s tool=%s confidence=%.2f source=%s "
        "reason=%s context_msgs=%d preview=%s",
        get_request_id(),
        decision.intent,
        decision.tool_name,
        decision.confidence,
        decision.source,
        decision.reason,
        context_msgs,
        preview,
    )


def _with_route(response: ChatResponse, decision: RouteDecision) -> ChatResponse:
    return response.model_copy(
        update={
            "route_intent": decision.intent,
            "route_confidence": decision.confidence,
            "route_source": decision.source,
        }
    )


def _chat_reply(text: str, decision: RouteDecision, tools_used: list[str], source_model: str | None) -> ChatResponse:
    cleaned, blocked = sanitize_unverified_save(text)
    if blocked:
        logger.info(
            "[ai-route] hop=ai reqId=%s action=block-unverified-save intent=%s source=%s",
            get_request_id(),
            decision.intent,
            decision.source,
        )
    return _with_route(
        ChatResponse(
            reply_text=cleaned or _FALLBACK_REPLY,
            actions=[],
            tools_used=tools_used,
            source_model=source_model,
        ),
        decision,
    )


def _decision_from_selection(tool_name: str | None) -> RouteDecision:
    if tool_name == "parse_expense":
        return RouteDecision("record", tool_name, 0.7, "llm", "tool_call")
    if not tool_name or tool_name == _REPLY_CHAT:
        return RouteDecision("chat", tool_name, 0.4, "llm", "reply")
    return RouteDecision("lookup", tool_name, 0.6, "llm", "tool_call")


def _prepare_weather_call(
    arguments: dict[str, Any],
    user_message: str,
    user_id: str | None,
) -> dict[str, Any] | str:
    """ใส่พื้นที่จากโปรไฟล์เมื่อข้อความล่าสุดไม่ได้ระบุที่ ไม่งั้นคืนข้อความให้หลาน"""
    prepared = prepare_weather_arguments(arguments, user_message, None)
    uid = (user_id or "").strip()
    if prepared is None and uid:
        profile = fetch_user_profile(
            get_lineapp_api_base(),
            uid,
            timeout=settings.gateway_http_timeout_seconds,
        )
        prepared = prepare_weather_arguments(arguments, user_message, profile)
    if prepared is None:
        logger.info(
            "[ai-route] hop=ai reqId=%s action=weather-no-place userId=%s",
            get_request_id(),
            uid or "-",
        )
        return NO_PROFILE_PLACE_REPLY
    logger.info(
        "[ai-route] hop=ai reqId=%s action=weather-place province=%s amphoe=%s tambon=%s",
        get_request_id(),
        prepared.get("province"),
        prepared.get("amphoe"),
        prepared.get("tambon"),
    )
    return prepared


def _finish_tool(
    tool_name: str,
    arguments: dict[str, Any],
    user_message: str,
    user_id: str | None,
    decision: RouteDecision,
    tools_used: list[str],
    source_model: str | None,
    history: list[dict[str, Any]] | None = None,
) -> ChatResponse:
    if tool_name == _REPLY_CHAT:
        reply = arguments.get("reply") if isinstance(arguments, dict) else None
        return _chat_reply(str(reply or ""), decision, tools_used, source_model)

    if tool_name == "parse_expense":
        arguments = _ensure_parse_text(arguments, user_message)

    if tool_name in WEATHER_TOOLS:
        prepared = _prepare_weather_call(arguments, user_message, user_id)
        if isinstance(prepared, str):
            return _chat_reply(prepared, decision, tools_used, source_model)
        arguments = prepared

    tools_used.append(tool_name)
    try:
        result = execute_tool(tool_name, arguments, user_id)
    except GatewayError as exc:
        logger.warning("gateway error tool=%s: %s", tool_name, exc.message)
        return _with_route(
            ChatResponse(
                reply_text="ยายดึงข้อมูลไม่สำเร็จตอนนี้นะจ๊ะ ลองถามใหม่อีกครั้งหรือเปลี่ยนวัน/จังหวัดดูนะจ๊ะ",
                actions=[],
                tools_used=tools_used,
                source_model=source_model,
            ),
            decision,
        )
    data = result.get("data")

    if tool_name == _LIST_AGRI_PRODUCTS_TOOL:
        return _chat_reply(_format_agri_product_list(data), decision, tools_used, source_model)

    if tool_name == "parse_expense":
        action = _extract_create_action(data)
        if action is not None:
            return _with_route(
                ChatResponse(
                    reply_text="",
                    actions=[action],
                    tools_used=tools_used,
                    source_model=source_model,
                ),
                decision,
            )
        if isinstance(data, dict) and data.get("message"):
            return _chat_reply(str(data["message"]), decision, tools_used, source_model)

    summarize_prompt = build_summarize_prompt(user_message, tool_name, data, history=history)
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
        return _chat_reply(reply, decision, tools_used, source_model)
    except Exception as exc:
        logger.warning("summarize failed tool=%s: %s", tool_name, exc)
        return _with_route(
            ChatResponse(
                reply_text="ยายดึงข้อมูลได้แล้วนะจ๊ะ แต่สรุปไม่ทัน ลองถามใหม่อีกครั้งนะจ๊ะ",
                actions=[],
                tools_used=tools_used,
                source_model=source_model,
            ),
            decision,
        )


def run_tool_loop(
    user_message: str,
    user_id: str | None,
    history: list[ChatTurn] | list[dict[str, Any]] | None = None,
) -> ChatResponse:
    history_dicts = _history_as_dicts(history)
    context_msgs = len(history_dicts) + 1  # รวมข้อความล่าสุด

    # Intent rule ดูข้อความล่าสุดอย่างเดียว — ไม่ให้ follow-up สั้น ๆ ไปบันทึกผิด
    rule = classify_record_intent(user_message)
    if rule is not None:
        _log_route(rule, user_message, context_msgs)
        return _finish_tool(
            "parse_expense",
            {"text": user_message},
            user_message,
            user_id,
            rule,
            [],
            "rule",
            history=history_dicts,
        )

    web_rule = classify_web_entry_intent(user_message)
    if web_rule is not None:
        _log_route(web_rule, user_message, context_msgs)
        return _chat_reply(WEB_ENTRY_REPLY, web_rule, [], "rule")

    list_rule = classify_list_agri_products_intent(user_message)
    if list_rule is not None:
        _log_route(list_rule, user_message, context_msgs)
        return _finish_tool(
            _LIST_AGRI_PRODUCTS_TOOL,
            {},
            user_message,
            user_id,
            list_rule,
            [],
            "rule",
            history=history_dicts,
        )

    shortlist = search_tools(user_message, limit=6)
    openai_tools = _tools_for_openai(shortlist)
    fallback_prompt = build_tool_select_prompt(
        user_message,
        _tools_for_prompt(shortlist),
        history=history_dicts,
    )
    llm_user_message = _compose_llm_user_message(user_message, history_dicts)

    tools_used: list[str] = []
    source_model: str | None = None
    max_rounds = max(1, settings.orchestrator_max_tool_rounds)

    for round_i in range(max_rounds):
        selection = run_llm_tool_select(
            system_prompt=_ROUTER_SYSTEM,
            user_message=llm_user_message,
            tools=openai_tools,
            fallback_prompt=fallback_prompt,
            tool_choice="required",
        )
        source_model = selection.get("source_model") or source_model
        tool_name = selection.get("tool_name")
        arguments = selection.get("arguments") or {}
        direct_reply = selection.get("reply")
        decision = _decision_from_selection(tool_name)
        _log_route(decision, user_message, context_msgs)

        if not tool_name or tool_name == _REPLY_CHAT:
            text = direct_reply or ""
            if tool_name == _REPLY_CHAT:
                text = str(arguments.get("reply") or direct_reply or "")
            return _chat_reply(text, decision, tools_used, source_model)

        logger.info(
            "[ai-route] hop=ai reqId=%s action=execute round=%d tool=%s",
            get_request_id(),
            round_i,
            tool_name,
        )
        return _finish_tool(
            tool_name,
            arguments,
            user_message,
            user_id,
            decision,
            tools_used,
            source_model,
            history=history_dicts,
        )

    return _with_route(
        ChatResponse(
            reply_text=_FALLBACK_REPLY,
            actions=[],
            tools_used=tools_used,
            source_model=source_model,
        ),
        RouteDecision("chat", None, 0.2, "llm", "max_rounds"),
    )
