"""DTO สำหรับ AI extract — สอดคล้องกับ prompt ใน src.prompts.extract"""

from __future__ import annotations

from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


EXTRACT_JSON_SHAPE_FOR_PROMPT = """{
  "main": "...",
  "price": 0,
  "type": "expense",
  "cycleName": "ปลานิล",
  "cycleFarmType": "ประตุสัตว์",
  "categoryName": "ค่าอาหาร"
}
(type เป็น "expense" หรือ "income"; price เป็นตัวเลข;
 cycleName และ cycleFarmType ต้องตรงกับรายการ cycles ที่ให้ทุกตัวอักษร หรือ null ถ้าไม่ตรงรอบใด;
 categoryName ต้องตรงกับรายการ categories ที่ให้ทุกตัวอักษร หรือ null ถ้าไม่ตรงหมวดใด)"""


class AiExtractLlmRaw(BaseModel):
    """JSON จาก LLM ก่อน map cycleName/cycleFarmType → cycleId และ categoryName → categoryId"""

    model_config = ConfigDict(populate_by_name=True)

    main: str
    price: float = Field(..., ge=0)
    type: Literal["expense", "income"]
    cycleName: str | None = None
    cycleFarmType: str | None = None
    categoryName: str | None = None


class AiExtractStructured(BaseModel):
    """JSON หลัง resolve cycleId/categoryId แล้ว — ใช้ตอบ client"""

    model_config = ConfigDict(populate_by_name=True)

    main: str = Field(..., description="กริยา + สิ่งของ หรือสิ่งของอย่างเดียว")
    price: float = Field(..., ge=0, description="ราคา / จำนวนเงิน")
    type: Literal["expense", "income"] = Field(..., description="รายจ่ายหรือรายรับ")
    cycleId: UUID | None = Field(
        default=None,
        description="รอบที่จับคู่จาก name/farmType กับรายการ cycles",
    )
    cycleName: str | None = Field(
        default=None,
        description="ชื่อรอบ (canonical) ที่จับคู่ได้",
    )
    categoryId: UUID | None = Field(
        default=None,
        description="หมวดหมู่ที่จับคู่จาก name กับรายการ categories",
    )
    categoryName: str | None = Field(
        default=None,
        description="ชื่อหมวดหมู่ (canonical) ที่จับคู่ได้",
    )


class AiParseResponse(BaseModel):
    """Response ของ GET /parse — ใช้เป็น response_model ใน FastAPI"""

    source_model: str = Field(..., description="แหล่งโมเดลที่ตอบ")
    data: AiExtractStructured | None = Field(
        None, description="มีเมื่อโมเดลตอบ JSON ครบและ parse ผ่าน"
    )
    message: str | None = Field(
        None,
        description="ข้อความเมื่อข้อมูลไม่ครบ (ไม่ใช่ JSON) หรือ JSON ไม่ตรงสคีมา",
    )
    structured_ok: bool = Field(..., description="true เมื่อ data ไม่เป็น None")
