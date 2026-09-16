"""ดึงชื่อสินค้าจากข้อความ LINE และสรุปราคาเฉลี่ยวันล่าสุด"""

from __future__ import annotations

import json
import logging
import re
import time
from typing import Any

from src.dto.agri_price import (
    AgriPriceExtractResponse,
    AgriPriceMatchResponse,
    AgriPriceQuote,
    AgriPriceSummarizeResponse,
)
from src.prompts.agri_price import (
    build_agri_price_extract_prompt,
    build_agri_price_match_prompt,
    build_agri_price_summarize_prompt,
)
from src.service.llm_service import run_llm
from src.utils.request_id import get_request_id

logger = logging.getLogger(__name__)

MAX_SUMMARY_CHARS = 900
MAX_MATCHES = 8
_JSON_FENCE = re.compile(r"```(?:json)?\s*([\s\S]*?)```", re.IGNORECASE)


def _payload_text(payload: Any) -> str:
    if isinstance(payload, str):
        return payload.strip()
    if isinstance(payload, dict):
        for key in ("summary", "text", "result", "message"):
            value = payload.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
        return json.dumps(payload, ensure_ascii=False)
    if payload is None:
        return ""
    return str(payload).strip()


def _parse_json_object(raw: str) -> dict[str, Any] | None:
    text = (raw or "").strip()
    if not text:
        return None
    fenced = _JSON_FENCE.search(text)
    if fenced:
        text = fenced.group(1).strip()
    start = text.find("{")
    end = text.rfind("}")
    if start < 0 or end <= start:
        return None
    try:
        parsed = json.loads(text[start : end + 1])
    except json.JSONDecodeError:
        return None
    return parsed if isinstance(parsed, dict) else None


def _limit_chars(text: str, max_chars: int) -> str:
    compact = " ".join(text.split()) if "\n" not in text else text.strip()
    if len(compact) <= max_chars:
        return compact
    return compact[:max_chars].rstrip()


def _as_bool(value: Any, default: bool = True) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        lowered = value.strip().lower()
        if lowered in {"true", "1", "yes"}:
            return True
        if lowered in {"false", "0", "no"}:
            return False
    return default


def extract_product_query(text: str) -> AgriPriceExtractResponse:
    t0 = time.monotonic()
    prompt = build_agri_price_extract_prompt(text)
    prompt_ms = int((time.monotonic() - t0) * 1000)
    t_llm = time.monotonic()
    llm_out = run_llm(prompt)
    llm_ms = int(llm_out.get("llm_ms") or ((time.monotonic() - t_llm) * 1000))
    t_parse = time.monotonic()
    parsed = _parse_json_object(_payload_text(llm_out.get("result")))
    parse_ms = int((time.monotonic() - t_parse) * 1000)
    if parsed is None:
        raise RuntimeError("agri price extract LLM returned invalid JSON")
    is_price_question = _as_bool(
        parsed.get("isPriceQuestion", parsed.get("is_price_question")),
        default=True,
    )
    product_query: str | None = None
    raw_query = parsed.get("productQuery", parsed.get("product_query"))
    if isinstance(raw_query, str) and raw_query.strip():
        product_query = raw_query.strip()
    source_model = str(llm_out.get("source_model") or "unknown")
    logger.info(
        "[ai-latency] hop=ai reqId=%s action=agri-extract query=%s is_price=%s model=%s "
        "promptMs=%d llmMs=%d parseMs=%d promptChars=%d resultChars=%d llmCalls=1 totalMs=%d",
        get_request_id(),
        product_query,
        is_price_question,
        source_model,
        prompt_ms,
        llm_ms,
        parse_ms,
        len(prompt),
        int(llm_out.get("result_chars") or 0),
        (time.monotonic() - t0) * 1000,
    )
    return AgriPriceExtractResponse(
        source_model=source_model,
        isPriceQuestion=is_price_question,
        productQuery=product_query,
    )


def _compact_quotes(quotes: list[AgriPriceQuote]) -> str:
    lines: list[str] = []
    for quote in quotes:
        unit = quote.unit or "บาท"
        lines.append(
            f"{quote.productName} | วันที่ {quote.dateKey} | เฉลี่ย {quote.averagePrice:.2f} {unit}"
            f" | จาก {quote.marketCount} ตลาด"
        )
    return "\n".join(lines) if lines else "-"


def summarize_agri_price(product_query: str, quotes: list[AgriPriceQuote]) -> AgriPriceSummarizeResponse:
    t0 = time.monotonic()
    price_data = _compact_quotes(quotes)
    prompt = build_agri_price_summarize_prompt(product_query, price_data)
    prompt_ms = int((time.monotonic() - t0) * 1000)
    t_llm = time.monotonic()
    llm_out = run_llm(prompt)
    llm_ms = int(llm_out.get("llm_ms") or ((time.monotonic() - t_llm) * 1000))
    t_parse = time.monotonic()
    summary = _limit_chars(_payload_text(llm_out.get("result")), MAX_SUMMARY_CHARS)
    parse_ms = int((time.monotonic() - t_parse) * 1000)
    if not summary:
        raise RuntimeError("agri price LLM returned empty summary")
    source_model = str(llm_out.get("source_model") or "unknown")
    logger.info(
        "[ai-latency] hop=ai reqId=%s action=agri-summarize quotes=%d chars_out=%d model=%s "
        "promptMs=%d llmMs=%d parseMs=%d promptChars=%d resultChars=%d llmCalls=1 totalMs=%d",
        get_request_id(),
        len(quotes),
        len(summary),
        source_model,
        prompt_ms,
        llm_ms,
        parse_ms,
        len(prompt),
        int(llm_out.get("result_chars") or 0),
        (time.monotonic() - t0) * 1000,
    )
    return AgriPriceSummarizeResponse(source_model=source_model, summary=summary)


def _unique_names(values: list[str] | None) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for value in values or []:
        if not isinstance(value, str):
            continue
        name = value.strip()
        if not name or name in seen:
            continue
        seen.add(name)
        out.append(name)
    return out


def match_product_names(product_query: str, product_names: list[str]) -> AgriPriceMatchResponse:
    t0 = time.monotonic()
    query = (product_query or "").strip()
    catalog = _unique_names(product_names)
    if not query or not catalog:
        logger.info(
            "[ai-latency] hop=ai reqId=%s action=agri-match skipped=empty query=%s catalog=%d totalMs=%d",
            get_request_id(),
            query,
            len(catalog),
            (time.monotonic() - t0) * 1000,
        )
        return AgriPriceMatchResponse(source_model="none", matchedNames=[])

    prompt = build_agri_price_match_prompt(query, catalog)
    prompt_ms = int((time.monotonic() - t0) * 1000)
    t_llm = time.monotonic()
    llm_out = run_llm(prompt)
    llm_ms = int(llm_out.get("llm_ms") or ((time.monotonic() - t_llm) * 1000))
    t_parse = time.monotonic()
    parsed = _parse_json_object(_payload_text(llm_out.get("result")))
    if parsed is None:
        raise RuntimeError("agri price match LLM returned invalid JSON")

    raw_names = parsed.get("matchedNames", parsed.get("matched_names"))
    if isinstance(raw_names, str):
        raw_list = [raw_names]
    elif isinstance(raw_names, list):
        raw_list = raw_names
    else:
        raw_list = []

    allowed = set(catalog)
    matched: list[str] = []
    for item in raw_list:
        if not isinstance(item, str):
            continue
        name = item.strip()
        if name not in allowed or name in matched:
            continue
        matched.append(name)
        if len(matched) >= MAX_MATCHES:
            break

    source_model = str(llm_out.get("source_model") or "unknown")
    parse_ms = int((time.monotonic() - t_parse) * 1000)
    logger.info(
        "[ai-latency] hop=ai reqId=%s action=agri-match query=%s catalog=%d matched=%s model=%s "
        "promptMs=%d llmMs=%d parseMs=%d promptChars=%d resultChars=%d llmCalls=1 totalMs=%d",
        get_request_id(),
        query,
        len(catalog),
        matched,
        source_model,
        prompt_ms,
        llm_ms,
        parse_ms,
        len(prompt),
        int(llm_out.get("result_chars") or 0),
        (time.monotonic() - t0) * 1000,
    )
    return AgriPriceMatchResponse(source_model=source_model, matchedNames=matched)
