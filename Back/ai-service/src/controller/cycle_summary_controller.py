"""HTTP layer สำหรับสรุปธุรกรรมในรอบปลูก"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from src.dto.cycle_summary import CycleSummaryRequest, CycleSummaryResponse
from src.service.cycle_summary_service import summarize_cycle

router = APIRouter()


@router.post("/cycle-summary/summarize", response_model=CycleSummaryResponse)
def summarize(body: CycleSummaryRequest) -> CycleSummaryResponse:
    cycle_info = (body.cycleInfo or "").strip()
    transaction_data = (body.transactionData or "").strip()
    if not cycle_info:
        raise HTTPException(status_code=400, detail="cycleInfo is required")
    if not transaction_data:
        raise HTTPException(status_code=400, detail="transactionData is required")
    try:
        return summarize_cycle(cycle_info, transaction_data)
    except Exception as exc:
        raise HTTPException(status_code=502, detail="cycle summary failed") from exc
