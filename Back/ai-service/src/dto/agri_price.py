"""DTO สำหรับถามราคาสินค้าเกษตรใน LINE"""

from __future__ import annotations

from pydantic import BaseModel, Field


class AgriPriceExtractRequest(BaseModel):
    text: str = Field(..., min_length=1, description="ข้อความจาก LINE ที่มีคำว่า ราคา")


class AgriPriceExtractResponse(BaseModel):
    source_model: str = Field(..., description="แหล่งโมเดลที่ตอบ")
    isPriceQuestion: bool = Field(..., description="true ถ้าเป็นคำถามราคา ไม่ใช่บันทึกรายการ")
    productQuery: str | None = Field(default=None, description="ชื่อสินค้าที่ดึงได้ ว่างถ้ายังไม่บอก")


class AgriPriceQuote(BaseModel):
    productName: str
    dateKey: str
    averagePrice: float
    unit: str | None = None
    marketCount: int = 0


class AgriPriceSummarizeRequest(BaseModel):
    productQuery: str = Field(..., description="คำค้นที่ผู้ใช้พิมพ์")
    quotes: list[AgriPriceQuote] = Field(default_factory=list)


class AgriPriceSummarizeResponse(BaseModel):
    source_model: str = Field(..., description="แหล่งโมเดลที่ตอบ")
    summary: str = Field(..., description="ข้อความสรุปสำหรับ LINE")
