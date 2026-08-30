"""ดึงชื่อสินค้าจากข้อความ LINE และสรุปราคาเฉลี่ยวันล่าสุด"""

from __future__ import annotations

import json
import logging
import re
from typing import Any

from src.dto.agri_price import (
    AgriPriceExtractResponse,
    AgriPriceQuote,
    AgriPriceSummarizeResponse,
)
from src.prompts.agri_price import (
    build_agri_price_extract_prompt,
    build_agri_price_summarize_prompt,
)
from src.service.llm_service import run_llm

logger = logging.getLogger(__name__)

MAX_SUMMARY_CHARS = 900
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
    prompt = build_agri_price_extract_prompt(text)
    llm_out = run_llm(prompt)
    parsed = _parse_json_object(_payload_text(llm_out.get("result")))
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
        "[agri-price-extract] query=%s is_price=%s model=%s",
        product_query,
        is_price_question,
        source_model,
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
    price_data = _compact_quotes(quotes)
    prompt = build_agri_price_summarize_prompt(product_query, price_data)
    llm_out = run_llm(prompt)
    summary = _limit_chars(_payload_text(llm_out.get("result")), MAX_SUMMARY_CHARS)
    if not summary:
        raise RuntimeError("agri price LLM returned empty summary")
    source_model = str(llm_out.get("source_model") or "unknown")
    logger.info(
        "[agri-price-brief] quotes=%d chars_out=%d model=%s",
        len(quotes),
        len(summary),
        source_model,
    )
    return AgriPriceSummarizeResponse(source_model=source_model, summary=summary)
