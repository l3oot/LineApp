"""เรียก LLM — Typhoon (OpenAI-compatible) ก่อน แล้ว fallback ไป thaillm (typhoon → kbtg)"""

from __future__ import annotations

import json
import logging
import time
from typing import Any

import requests
from openai import OpenAI

from src.config import settings
from src.utils.request_id import get_request_id

logger = logging.getLogger(__name__)

_LLM = settings.llm

# [Debug Step 0.AI Provider] SDK default ไม่มี timeout (รอได้นานหลายนาที) —
# ถ้าไม่กำหนดเอง provider ที่ตอบช้า/ค้าง จะไม่ fallback ไป thaillm ตามที่ตั้งใจ
LLM_TIMEOUT_SECONDS = 20.0

_opentyphoon_client: OpenAI | None = None


def _get_opentyphoon_client() -> OpenAI:
    global _opentyphoon_client
    if _opentyphoon_client is None:
        _opentyphoon_client = OpenAI(
            api_key=_LLM.openai_api_key,
            base_url=_LLM.opentyphoon_base_url,
            timeout=LLM_TIMEOUT_SECONDS,
            max_retries=0,
        )
    return _opentyphoon_client


def _thaillm_headers() -> dict[str, str]:
    headers = {"Content-Type": "application/json"}
    if _LLM.thaillm_api_key:
        headers["apikey"] = _LLM.thaillm_api_key
    return headers


def _try_json(text: str) -> Any:
    try:
        return json.loads(text)
    except (json.JSONDecodeError, ValueError, TypeError):
        return text


def _call_opentyphoon(prompt: str) -> str:
    stream = _get_opentyphoon_client().chat.completions.create(
        model=_LLM.opentyphoon_model,
        messages=[{"role": "system", "content": prompt}],
        temperature=0.3,
        max_completion_tokens=730,
        top_p=0.5,
        stream=True,
    )
    out = ""
    for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            out += delta
    return out


def _call_opentyphoon_tools(
    messages: list[dict[str, Any]],
    tools: list[dict[str, Any]],
) -> dict[str, Any]:
    """เรียก Typhoon แบบ OpenAI tools — คืน {content, tool_calls, raw_message}"""
    completion = _get_opentyphoon_client().chat.completions.create(
        model=_LLM.opentyphoon_model,
        messages=messages,
        tools=tools,
        tool_choice="auto",
        temperature=0.2,
        max_completion_tokens=1024,
        top_p=0.5,
        stream=False,
    )
    message = completion.choices[0].message
    tool_calls: list[dict[str, Any]] = []
    if message.tool_calls:
        for tc in message.tool_calls:
            fn = tc.function
            args_raw = fn.arguments if fn and fn.arguments else "{}"
            try:
                args = json.loads(args_raw) if isinstance(args_raw, str) else args_raw
            except (json.JSONDecodeError, TypeError):
                args = {}
            if not isinstance(args, dict):
                args = {}
            tool_calls.append(
                {
                    "id": getattr(tc, "id", None),
                    "name": fn.name if fn else None,
                    "arguments": args,
                }
            )
    return {
        "content": message.content,
        "tool_calls": tool_calls,
        "raw_message": message,
    }


def _call_thaillm(url: str, prompt: str) -> str:
    body = {
        "model": "/model",
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 2048,
        "temperature": 0.3,
    }
    response = requests.post(
        url, headers=_thaillm_headers(), json=body, timeout=LLM_TIMEOUT_SECONDS
    )
    response.raise_for_status()
    payload = response.json()
    try:
        return payload["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise ValueError(f"thaillm unexpected response shape: {str(payload)[:300]}") from exc


def _parse_tool_select_json(text: Any) -> dict[str, Any] | None:
    if isinstance(text, dict):
        return text
    if not isinstance(text, str):
        return None
    raw = text.strip()
    if raw.startswith("```"):
        raw = raw.strip("`")
        if raw.startswith("json"):
            raw = raw[4:].strip()
    try:
        data = json.loads(raw)
    except (json.JSONDecodeError, ValueError):
        # หา object แรกในข้อความ
        start = raw.find("{")
        end = raw.rfind("}")
        if start < 0 or end <= start:
            return None
        try:
            data = json.loads(raw[start : end + 1])
        except (json.JSONDecodeError, ValueError):
            return None
    return data if isinstance(data, dict) else None


def _payload_chars(payload: Any) -> int:
    if payload is None:
        return 0
    if isinstance(payload, str):
        return len(payload)
    try:
        return len(json.dumps(payload, ensure_ascii=False))
    except (TypeError, ValueError):
        return len(str(payload))


def _llm_result(source_model: str, text: str, *, llm_ms: int, providers_tried: int) -> dict[str, Any]:
    parsed = _try_json(text)
    return {
        "source_model": source_model,
        "result": parsed,
        "llm_ms": llm_ms,
        "prompt_chars": 0,
        "result_chars": _payload_chars(text if isinstance(text, str) else parsed),
        "providers_tried": providers_tried,
    }


def run_llm(prompt: str) -> dict[str, Any]:
    """รัน LLM ตาม fallback chain — คืน {"source_model", "result"}"""
    prompt_chars = len(prompt or "")
    t0 = time.monotonic()
    providers_tried = 0
    try:
        providers_tried += 1
        text = _call_opentyphoon(prompt)
        llm_ms = int((time.monotonic() - t0) * 1000)
        logger.info(
            "[ai-latency] hop=ai-llm reqId=%s action=done provider=opentyphoon model=%s "
            "promptChars=%d resultChars=%d timeoutS=%.1f providersTried=%d elapsed_ms=%d",
            get_request_id(),
            _LLM.opentyphoon_model,
            prompt_chars,
            _payload_chars(text),
            LLM_TIMEOUT_SECONDS,
            providers_tried,
            llm_ms,
        )
        out = _llm_result(
            f"api.opentyphoon.ai / {_LLM.opentyphoon_model}",
            text,
            llm_ms=llm_ms,
            providers_tried=providers_tried,
        )
        out["prompt_chars"] = prompt_chars
        return out
    except Exception as exc:
        logger.warning(
            "[ai-latency] hop=ai-llm reqId=%s action=fail provider=opentyphoon "
            "promptChars=%d timeoutS=%.1f elapsed_ms=%d error=%s",
            get_request_id(),
            prompt_chars,
            LLM_TIMEOUT_SECONDS,
            (time.monotonic() - t0) * 1000,
            exc,
        )

    t1 = time.monotonic()
    try:
        providers_tried += 1
        text = _call_thaillm(_LLM.thaillm_typhoon_url, prompt)
        llm_ms = int((time.monotonic() - t1) * 1000)
        logger.info(
            "[ai-latency] hop=ai-llm reqId=%s action=done provider=thaillm/typhoon "
            "promptChars=%d resultChars=%d timeoutS=%.1f providersTried=%d elapsed_ms=%d",
            get_request_id(),
            prompt_chars,
            _payload_chars(text),
            LLM_TIMEOUT_SECONDS,
            providers_tried,
            llm_ms,
        )
        out = _llm_result("thaillm / typhoon", text, llm_ms=llm_ms, providers_tried=providers_tried)
        out["prompt_chars"] = prompt_chars
        return out
    except Exception as exc:
        logger.warning(
            "[ai-latency] hop=ai-llm reqId=%s action=fail provider=thaillm/typhoon "
            "promptChars=%d timeoutS=%.1f elapsed_ms=%d error=%s",
            get_request_id(),
            prompt_chars,
            LLM_TIMEOUT_SECONDS,
            (time.monotonic() - t1) * 1000,
            exc,
        )

    t2 = time.monotonic()
    try:
        providers_tried += 1
        text = _call_thaillm(_LLM.thaillm_kbtg_url, prompt)
        llm_ms = int((time.monotonic() - t2) * 1000)
        logger.info(
            "[ai-latency] hop=ai-llm reqId=%s action=done provider=thaillm/kbtg "
            "promptChars=%d resultChars=%d timeoutS=%.1f providersTried=%d elapsed_ms=%d",
            get_request_id(),
            prompt_chars,
            _payload_chars(text),
            LLM_TIMEOUT_SECONDS,
            providers_tried,
            llm_ms,
        )
        out = _llm_result("thaillm / kbtg", text, llm_ms=llm_ms, providers_tried=providers_tried)
        out["prompt_chars"] = prompt_chars
        return out
    except Exception as exc:
        logger.error(
            "[ai-latency] hop=ai-llm reqId=%s action=fail provider=all "
            "promptChars=%d providersTried=%d elapsed_ms=%d error=%s",
            get_request_id(),
            prompt_chars,
            providers_tried,
            (time.monotonic() - t0) * 1000,
            exc,
        )
        raise RuntimeError("all LLM providers failed") from exc


def run_llm_tool_select(
    *,
    system_prompt: str,
    user_message: str,
    tools: list[dict[str, Any]],
    fallback_prompt: str,
) -> dict[str, Any]:
    """
    เลือก tool ผ่าน OpenAI-compatible tools บน Typhoon ก่อน
    ถ้าไม่รองรับ/ล้มเหลว → JSON prompt fallback (Typhoon→ThaiLLM เหมือน run_llm)
    คืน:
      {
        source_model, tool_name|None, arguments:dict, reply|None,
        tool_calls:list, content|None
      }
    """
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message},
    ]
    t0 = time.monotonic()
    try:
        result = _call_opentyphoon_tools(messages, tools)
        llm_ms = int((time.monotonic() - t0) * 1000)
        logger.info(
            "[ai-latency] hop=ai-llm reqId=%s action=done provider=opentyphoon-tools "
            "toolCalls=%d elapsed_ms=%d",
            get_request_id(),
            len(result.get("tool_calls") or []),
            llm_ms,
        )
        calls = result.get("tool_calls") or []
        if calls:
            first = calls[0]
            return {
                "source_model": f"api.opentyphoon.ai / {_LLM.opentyphoon_model} (tools)",
                "tool_name": first.get("name"),
                "arguments": first.get("arguments") or {},
                "reply": None,
                "tool_calls": calls,
                "content": result.get("content"),
                "llm_ms": llm_ms,
            }
        content = result.get("content")
        if content and str(content).strip():
            return {
                "source_model": f"api.opentyphoon.ai / {_LLM.opentyphoon_model} (tools)",
                "tool_name": None,
                "arguments": {},
                "reply": str(content).strip(),
                "tool_calls": [],
                "content": content,
                "llm_ms": llm_ms,
            }
    except Exception as exc:
        logger.warning(
            "[ai-latency] hop=ai-llm reqId=%s action=fail provider=opentyphoon-tools "
            "elapsed_ms=%d error=%s",
            get_request_id(),
            (time.monotonic() - t0) * 1000,
            exc,
        )

    # JSON fallback — ใช้ chain เดิม
    out = run_llm(fallback_prompt)
    parsed = _parse_tool_select_json(out.get("result"))
    if not parsed:
        text = out.get("result")
        reply = text if isinstance(text, str) else None
        return {
            "source_model": out.get("source_model"),
            "tool_name": None,
            "arguments": {},
            "reply": reply,
            "tool_calls": [],
            "content": reply,
            "llm_ms": out.get("llm_ms"),
        }
    tool_name = parsed.get("tool")
    if tool_name is not None:
        tool_name = str(tool_name).strip() or None
        if tool_name and tool_name.lower() in ("null", "none"):
            tool_name = None
    arguments = parsed.get("arguments") if isinstance(parsed.get("arguments"), dict) else {}
    reply = parsed.get("reply")
    if reply is not None:
        reply = str(reply).strip() or None
    return {
        "source_model": out.get("source_model"),
        "tool_name": tool_name,
        "arguments": arguments,
        "reply": reply,
        "tool_calls": (
            [{"name": tool_name, "arguments": arguments}] if tool_name else []
        ),
        "content": reply,
        "llm_ms": out.get("llm_ms"),
    }
