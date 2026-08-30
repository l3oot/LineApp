"""DTO สำหรับสรุปอากาศสั้น ๆ ใน LINE"""

from __future__ import annotations

from pydantic import BaseModel, Field


class WeatherBriefSummarizeRequest(BaseModel):
    hourlyForecast: str = Field(..., description="ข้อความพยากรณ์รายชั่วโมงที่ย่อแล้ว")
    descriptionThai: str = Field(default="", description="ข้อความจาก <DescriptionThai>")


class WeatherBriefSummarizeResponse(BaseModel):
    source_model: str = Field(..., description="แหล่งโมเดลที่ตอบ")
    summary: str = Field(..., description="ข้อความสรุปสำหรับ LINE ไม่เกิน 300 ตัวอักษร")
