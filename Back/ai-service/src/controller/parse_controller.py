"""HTTP layer สำหรับการ extract — เรียก service เท่านั้น"""

from __future__ import annotations

from fastapi import APIRouter, Query

from src.dto.extract import AiParseResponse
from src.service.extract_service import extract_transaction

router = APIRouter()


@router.get("/parse", response_model=AiParseResponse)
def parse(
    text: str,
    userId: str | None = Query(
        default=None,
        description=(
            "UUID ผู้ใช้สำหรับ GET /api/cycle/user/{userId} — "
            "ถ้าไม่ส่ง จะไม่ดึง cycle/category (หรือใช้ LINEAPP_DEFAULT_USER_ID ถ้าตั้งใน env)"
        ),
    ),
) -> AiParseResponse:
    return extract_transaction(text, user_id=userId)
