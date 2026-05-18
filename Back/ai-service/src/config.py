"""โหลด .env และรวมค่า config / endpoint ของ external services ไว้ที่เดียว"""

from __future__ import annotations

import os

from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY = os.getenv("api_key_openai")
THAILLM_API_KEY = os.getenv("api_key_thaillm")

OPENTYPHOON_BASE_URL = "https://api.opentyphoon.ai/v1"
OPENTYPHOON_MODEL = "typhoon-v2.5-30b-a3b-instruct"

THAILLM_TYPHOON_URL = "http://thaillm.or.th/api/typhoon/v1/chat/completions"
THAILLM_KBTG_URL = "http://thaillm.or.th/api/kbtg/v1/chat/completions"

# ใช้ดึง GET /api/cycle?userId= ตอน dev จนกว่าจะส่ง userId จาก client
DEFAULT_CYCLE_USER_ID = "f7e2c5e1-a0c0-42ac-ab49-1ab8ea977f1a"
LINEAPP_DEFAULT_USER_ID = os.getenv(
    "LINEAPP_DEFAULT_USER_ID", DEFAULT_CYCLE_USER_ID
).strip()

# จำนวนครั้งที่ retry เมื่อ LLM ตอบไม่ตรง format (ไม่นับครั้งแรก)
EXTRACT_MAX_RETRIES = int(os.getenv("EXTRACT_MAX_RETRIES", "2"))
