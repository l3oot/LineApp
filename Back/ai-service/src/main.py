"""Bootstrap FastAPI app — รวม config, logging และ mount controller routers"""

from __future__ import annotations

import logging
import time
import uuid

from fastapi import Depends, FastAPI, Request

import src.config  # noqa: F401  (โหลด .env ผ่าน settings)
from src.controller.parse_controller import router as parse_router
from src.controller.weather_warning_controller import router as weather_warning_router
from src.controller.weather_brief_controller import router as weather_brief_router
from src.controller.agri_price_controller import router as agri_price_router
from src.controller.cycle_summary_controller import router as cycle_summary_router
from src.utils.request_id import REQUEST_ID_HEADER, get_request_id, set_request_id

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def bind_request_id(request: Request) -> str:
    """ผูก reqId ใน thread ของ endpoint — sync route ไม่สืบทอด contextvar จาก middleware"""
    req_id = getattr(request.state, "req_id", None)
    if not req_id:
        incoming = request.headers.get(REQUEST_ID_HEADER)
        req_id = (incoming or "").strip() or get_request_id()
    if not req_id or req_id == "-":
        req_id = uuid.uuid4().hex[:8]
    return set_request_id(req_id)


app = FastAPI(title="LineApp AI Service", dependencies=[Depends(bind_request_id)])


@app.middleware("http")
async def ai_latency_middleware(request: Request, call_next):
    incoming = request.headers.get(REQUEST_ID_HEADER)
    req_id = (incoming or "").strip() or uuid.uuid4().hex[:8]
    request.state.req_id = req_id
    set_request_id(req_id)
    t0 = time.monotonic()
    logger.info(
        "[ai-latency] hop=ai reqId=%s action=start method=%s path=%s",
        req_id,
        request.method,
        request.url.path,
    )
    response = await call_next(request)
    logger.info(
        "[ai-latency] hop=ai reqId=%s action=done method=%s path=%s status=%s elapsed_ms=%d",
        req_id,
        request.method,
        request.url.path,
        response.status_code,
        (time.monotonic() - t0) * 1000,
    )
    response.headers[REQUEST_ID_HEADER] = req_id
    return response


app.include_router(parse_router)
app.include_router(weather_warning_router)
app.include_router(weather_brief_router)
app.include_router(agri_price_router)
app.include_router(cycle_summary_router)
