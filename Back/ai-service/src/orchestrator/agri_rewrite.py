"""จัดรูปคำตอบความรู้เกษตร แล้วให้ยายเภากล่าวใหม่ก่อนส่ง LINE"""

from __future__ import annotations

import json
import logging
import re
from typing import Any

from src.prompts.orchestrator import build_agri_rewrite_prompt
from src.service.llm_service import run_llm
from src.utils.request_id import get_request_id

logger = logging.getLogger(__name__)

# โควต้าที่ API ใช้ร่วมกันระหว่าง prompt กับคำตอบ และที่จองไว้ให้คำตอบยายเภา
CONTEXT_TOKEN_QUOTA = 8192
OUTPUT_TOKEN_RESERVE = 730
INPUT_TOKEN_BUDGET = CONTEXT_TOKEN_QUOTA - OUTPUT_TOKEN_RESERVE

_CHART_OPEN = "```chart"
_OVERFLOW_MARKERS = (
    "context length",
    "context_length",
    "maximum context",
    "too many tokens",
    "token limit",
    "prompt is too long",
    "input is too long",
    "reduce the length",
)
_MAX_ATTEMPTS = 3


def estimate_tokens(text: str) -> int:
    """ประมาณแบบกันเกินโควต้า: อักษรที่ไม่ใช่ ASCII นับ 1 token, ASCII 4 ตัวต่อ 1 token"""
    thai = 0
    ascii_chars = 0
    for ch in text or "":
        if ord(ch) < 128:
            if not ch.isspace():
                ascii_chars += 1
        else:
            thai += 1
    return thai + (ascii_chars + 3) // 4


def _format_number(value: Any) -> str:
    if isinstance(value, bool) or value is None:
        return str(value)
    if isinstance(value, int):
        return f"{value:,}"
    if isinstance(value, float) and value.is_integer():
        return f"{int(value):,}"
    return str(value)


def _chart_to_lines(raw: str) -> str | None:
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return None
    if not isinstance(data, dict):
        return None
    title = str(data.get("title") or "แผนภูมิ").strip()
    unit = str(data.get("unit") or "").strip()
    lines = [f"แผนภูมิ: {title}"]
    if unit:
        lines.append(f"หน่วย: {unit}")
    rows = data.get("rows")
    if isinstance(rows, list):
        for row in rows:
            if not isinstance(row, dict):
                continue
            label = str(row.get("label") or "").strip()
            if not label:
                continue
            value = _format_number(row.get("value"))
            if unit:
                lines.append(f"- {label}: {value} {unit}")
            else:
                lines.append(f"- {label}: {value}")
    return "\n".join(lines)


def _replace_charts(text: str) -> str:
    out: list[str] = []
    cursor = 0
    lowered = text.lower()
    while True:
        start = lowered.find(_CHART_OPEN, cursor)
        if start < 0:
            out.append(text[cursor:])
            break
        content_at = text.find("\n", start)
        if content_at < 0:
            content_at = start + len(_CHART_OPEN)
        close = text.find("```", content_at)
        if close < 0:
            out.append(text[cursor:])
            break
        rendered = _chart_to_lines(text[content_at:close].strip())
        out.append(text[cursor:start])
        out.append(rendered if rendered else text[start : close + 3])
        cursor = close + 3
    return "".join(out)


def _split_table_row(line: str) -> list[str] | None:
    stripped = line.strip()
    if not stripped.startswith("|"):
        return None
    return [cell.strip() for cell in stripped.strip("|").split("|")]


def _is_separator_row(cells: list[str]) -> bool:
    if not cells:
        return False
    return all(re.fullmatch(r":?-{3,}:?", cell.replace(" ", "")) is not None for cell in cells)


def _table_to_lines(rows: list[list[str]]) -> str:
    header = rows[0]
    body = [row for row in rows[1:] if not _is_separator_row(row)]
    lines: list[str] = []
    if len(header) >= 2 and not _is_separator_row(header):
        lines.append("ตาราง: " + ", ".join(header))
    for row in body:
        if len(row) >= 2:
            lines.append(f"- {row[0]}: {row[1]}")
        elif row and row[0]:
            lines.append(f"- {row[0]}")
    return "\n".join(lines)


def _replace_tables(text: str) -> str:
    lines = text.splitlines()
    out: list[str] = []
    index = 0
    while index < len(lines):
        row = _split_table_row(lines[index])
        if row is None:
            out.append(lines[index])
            index += 1
            continue
        block: list[list[str]] = []
        while index < len(lines):
            parsed = _split_table_row(lines[index])
            if parsed is None:
                break
            block.append(parsed)
            index += 1
        rendered = _table_to_lines(block) if len(block) >= 2 else None
        if rendered:
            out.append(rendered)
        else:
            out.extend(lines[index - len(block) : index])
    return "\n".join(out)


def normalize_agri_markup(text: str) -> str:
    """แปลงบล็อก chart และตาราง markdown เป็นรายการที่พูดได้"""
    return _replace_tables(_replace_charts(text or "")).strip()


def fit_source_to_budget(user_message: str, source: str) -> tuple[str, bool]:
    """ถ้า prompt เกินโควต้า input ให้ตัดเฉพาะต้นฉบับ"""
    source = (source or "").strip()
    if estimate_tokens(build_agri_rewrite_prompt(user_message, source)) <= INPUT_TOKEN_BUDGET:
        return source, False
    marker = "\n…(ตัดท้าย)"
    lo = 0
    hi = len(source)
    best = ""
    while lo <= hi:
        mid = (lo + hi) // 2
        chunk = source[:mid].rstrip()
        if not chunk:
            lo = mid + 1
            continue
        candidate = chunk + marker
        if estimate_tokens(build_agri_rewrite_prompt(user_message, candidate)) <= INPUT_TOKEN_BUDGET:
            best = candidate
            lo = mid + 1
        else:
            hi = mid - 1
    if not best:
        best = source[:200].rstrip() + marker
    return best, True


def _reply_text(payload: Any) -> str:
    if isinstance(payload, str):
        return payload.strip()
    if isinstance(payload, dict):
        for key in ("reply", "message", "text", "summary"):
            value = payload.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
    return ""


def _is_context_overflow(exc: BaseException) -> bool:
    seen: set[int] = set()
    current: BaseException | None = exc
    parts: list[str] = []
    while current is not None and id(current) not in seen:
        seen.add(id(current))
        parts.append(str(current).lower())
        current = current.__cause__ or current.__context__
    blob = " ".join(parts)
    return any(marker in blob for marker in _OVERFLOW_MARKERS)


def _shrink(text: str) -> str:
    cut = max(1, int(len(text) * 0.6))
    chunk = text[:cut]
    newline = chunk.rfind("\n")
    if newline > cut // 2:
        chunk = chunk[:newline]
    return chunk.rstrip()


def rewrite_agri_for_yai(user_message: str, source: str) -> tuple[str, str | None]:
    """สรุปด้วยยายเภา ถ้าต้นฉบับเกินโควต้า input ให้ตัดแล้วเรียกใหม่"""
    text = normalize_agri_markup(source)
    if not text:
        return "", None
    for attempt in range(_MAX_ATTEMPTS):
        fitted, trimmed = fit_source_to_budget(user_message, text)
        if trimmed:
            logger.info(
                "[ai-route] hop=ai reqId=%s action=agri-rewrite-trim attempt=%d chars=%d tokens=%d",
                get_request_id(),
                attempt + 1,
                len(fitted),
                estimate_tokens(build_agri_rewrite_prompt(user_message, fitted)),
            )
        try:
            result = run_llm(build_agri_rewrite_prompt(user_message, fitted))
        except Exception as exc:
            logger.warning(
                "[ai-route] hop=ai reqId=%s action=agri-rewrite-fail attempt=%d overflow=%s error=%s",
                get_request_id(),
                attempt + 1,
                _is_context_overflow(exc),
                exc,
            )
            if not _is_context_overflow(exc) or attempt + 1 >= _MAX_ATTEMPTS:
                break
            text = _shrink(fitted)
            continue
        reply = _reply_text(result.get("result"))
        model = result.get("source_model")
        if reply:
            return reply, str(model) if model else None
        break
    return text, None
