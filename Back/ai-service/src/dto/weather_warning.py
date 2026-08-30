"""DTO สำหรับสรุปประกาศเตือนภัยอากาศ"""

from __future__ import annotations

from pydantic import BaseModel, Field


class WeatherWarningSummarizeRequest(BaseModel):
    descriptionThai: str = Field(..., min_length=1, description="ข้อความจาก <DescriptionThai>")


class WeatherWarningSummarizeResponse(BaseModel):
    source_model: str = Field(..., description="แหล่งโมเดลที่ตอบ")
    summary: str = Field(..., description="ข้อความสรุปประกาศ")
