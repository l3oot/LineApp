"""HTTP layer สำหรับถามราคาสินค้าเกษตรใน LINE"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from src.dto.agri_price import (
    AgriPriceExtractRequest,
    AgriPriceExtractResponse,
    AgriPriceMatchRequest,
    AgriPriceMatchResponse,
    AgriPriceSummarizeRequest,
    AgriPriceSummarizeResponse,
)
from src.service.agri_price_service import extract_product_query, match_product_names, summarize_agri_price

router = APIRouter()


@router.post("/agri-price/extract", response_model=AgriPriceExtractResponse)
def extract(body: AgriPriceExtractRequest) -> AgriPriceExtractResponse:
    text = (body.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="text is required")
    try:
        return extract_product_query(text)
    except Exception as exc:
        raise HTTPException(status_code=502, detail="agri price extract failed") from exc


@router.post("/agri-price/summarize", response_model=AgriPriceSummarizeResponse)
def summarize(body: AgriPriceSummarizeRequest) -> AgriPriceSummarizeResponse:
    if not body.quotes:
        raise HTTPException(status_code=400, detail="quotes is required")
    try:
        return summarize_agri_price(body.productQuery or "", body.quotes)
    except Exception as exc:
        raise HTTPException(status_code=502, detail="agri price summarize failed") from exc


@router.post("/agri-price/match", response_model=AgriPriceMatchResponse)
def match(body: AgriPriceMatchRequest) -> AgriPriceMatchResponse:
    query = (body.productQuery or "").strip()
    if not query:
        raise HTTPException(status_code=400, detail="productQuery is required")
    try:
        return match_product_names(query, body.productNames or [])
    except Exception as exc:
        raise HTTPException(status_code=502, detail="agri price match failed") from exc
