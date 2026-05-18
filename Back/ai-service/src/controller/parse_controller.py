"""HTTP layer สำหรับการ extract — เรียก service เท่านั้น ไม่ทำ business logic เอง"""

from __future__ import annotations

from fastapi import APIRouter, Query

from src.dto.res.extract import AiParseResponse
from src.service.extract_service import extract_transaction

router = APIRouter()


@router.get("/parse", response_model=AiParseResponse)
def parse(
    text: str,
    userId: str | None = Query(
        default=None,
        description=(
            "UUID ผู้ใช้สำหรับ /api/cycle?userId= — "
            "ถ้าไม่ส่ง ใช้ค่าเริ่มต้น dev (LINEAPP_DEFAULT_USER_ID)"
        ),
    ),
) -> AiParseResponse:
    return extract_transaction(text, user_id=userId)
