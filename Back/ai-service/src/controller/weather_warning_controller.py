"""HTTP layer สำหรับสรุปประกาศเตือนภัยอากาศ"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from src.dto.weather_warning import (
    WeatherWarningSummarizeRequest,
    WeatherWarningSummarizeResponse,
)
from src.service.weather_warning_service import summarize_weather_warning

router = APIRouter()


@router.post("/weather-warning/summarize", response_model=WeatherWarningSummarizeResponse)
def summarize(body: WeatherWarningSummarizeRequest) -> WeatherWarningSummarizeResponse:
    text = body.descriptionThai.strip()
    if not text:
        raise HTTPException(status_code=400, detail="descriptionThai is required")
    try:
        return summarize_weather_warning(text)
    except Exception as exc:
        raise HTTPException(status_code=502, detail="weather warning summarize failed") from exc
