"""HTTP layer สำหรับ AI chat orchestrator"""

from __future__ import annotations

from fastapi import APIRouter

from src.dto.chat import ChatRequest, ChatResponse
from src.orchestrator.chat_orchestrator import handle_chat

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
def chat(body: ChatRequest) -> ChatResponse:
    return handle_chat(body)
