"""Entry point ของ chat orchestrator"""

from __future__ import annotations

import logging
import time

from src.dto.chat import ChatRequest, ChatResponse
from src.orchestrator.tool_loop import run_tool_loop
from src.utils.request_id import get_request_id

logger = logging.getLogger(__name__)


def handle_chat(req: ChatRequest) -> ChatResponse:
    t0 = time.monotonic()
    req_id = get_request_id()
    message = (req.message or "").strip()
    user_id = (req.user_id or "").strip() or None
    history = list(req.history or [])
    logger.info(
        "[ai-orchestrator] hop=ai reqId=%s action=start userId=%s textLen=%d history=%d",
        req_id,
        user_id,
        len(message),
        len(history),
    )
    response = run_tool_loop(message, user_id, history=history)
    logger.info(
        "[ai-orchestrator] hop=ai reqId=%s action=done tools=%s actions=%d "
        "intent=%s confidence=%s source=%s history=%d elapsed_ms=%d",
        req_id,
        response.tools_used,
        len(response.actions),
        response.route_intent,
        response.route_confidence,
        response.route_source,
        len(history),
        (time.monotonic() - t0) * 1000,
    )
    return response
