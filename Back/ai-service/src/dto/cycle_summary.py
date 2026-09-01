"""DTO สำหรับสรุปธุรกรรมในรอบปลูก"""

from __future__ import annotations

from pydantic import BaseModel, Field


class CycleSummaryRequest(BaseModel):
    cycleInfo: str = Field(..., description="ข้อมูลรอบปลูกที่ย่อแล้ว")
    transactionData: str = Field(..., description="รายการและยอดรวมของรอบที่ย่อแล้ว")


class CycleSummaryResponse(BaseModel):
    source_model: str = Field(..., description="แหล่งโมเดลที่ตอบ")
    summary: str = Field(..., description="ข้อความสรุปไม่เกิน 500 ตัวอักษร")
