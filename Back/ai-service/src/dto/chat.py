"""DTO สำหรับ POST /chat orchestrator"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(..., min_length=1)


class ChatRequest(BaseModel):
    user_id: str | None = Field(default=None, description="UUID ผู้ใช้ในระบบ")
    message: str = Field(..., min_length=1, description="ข้อความจากผู้ใช้")
    locale: str = Field(default="th")
    history: list[ChatTurn] = Field(
        default_factory=list,
        description="ข้อความก่อนหน้า (ไม่รวม message ล่าสุด) จาก Spring in-memory",
    )


class ChatAction(BaseModel):
    type: Literal["create_transaction"]
    payload: dict[str, Any]


class ChatResponse(BaseModel):
    reply_text: str
    actions: list[ChatAction] = Field(default_factory=list)
    tools_used: list[str] = Field(default_factory=list)
    source_model: str | None = None
    route_intent: str | None = None
    route_confidence: float | None = None
    route_source: str | None = None
