"""โหลด .env และรวมค่า config ไว้ที่เดียว"""

from __future__ import annotations

import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()

_DEFAULT_CYCLE_USER_ID = "f7e2c5e1-a0c0-42ac-ab49-1ab8ea977f1a"


@dataclass(frozen=True, slots=True)
class LlmSettings:
    openai_api_key: str | None
    thaillm_api_key: str | None
    opentyphoon_base_url: str = "https://api.opentyphoon.ai/v1"
    opentyphoon_model: str = "typhoon-v2.5-30b-a3b-instruct"
    thaillm_typhoon_url: str = "http://thaillm.or.th/api/typhoon/v1/chat/completions"
    thaillm_kbtg_url: str = "http://thaillm.or.th/api/kbtg/v1/chat/completions"


@dataclass(frozen=True, slots=True)
class Settings:
    lineapp_default_user_id: str
    extract_max_retries: int
    llm: LlmSettings


def _load_settings() -> Settings:
    return Settings(
        lineapp_default_user_id=os.getenv(
            "LINEAPP_DEFAULT_USER_ID", _DEFAULT_CYCLE_USER_ID
        ).strip(),
        extract_max_retries=int(os.getenv("EXTRACT_MAX_RETRIES", "2")),
        llm=LlmSettings(
            openai_api_key=os.getenv("api_key_openai"),
            thaillm_api_key=os.getenv("api_key_thaillm"),
        ),
    )


settings = _load_settings()
