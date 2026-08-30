"""HTTP layer สำหรับสรุปอากาศสั้น ๆ ใน LINE"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from src.dto.weather_brief import WeatherBriefSummarizeRequest, WeatherBriefSummarizeResponse
from src.service.weather_brief_service import summarize_weather_brief

router = APIRouter()


@router.post("/weather-brief/summarize", response_model=WeatherBriefSummarizeResponse)
def summarize(body: WeatherBriefSummarizeRequest) -> WeatherBriefSummarizeResponse:
    hourly = (body.hourlyForecast or "").strip()
    if not hourly:
        raise HTTPException(status_code=400, detail="hourlyForecast is required")
    try:
        return summarize_weather_brief(hourly, body.descriptionThai or "")
    except Exception as exc:
        raise HTTPException(status_code=502, detail="weather brief summarize failed") from exc
