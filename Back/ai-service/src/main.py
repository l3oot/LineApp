"""Bootstrap FastAPI app — รวม config, logging และ mount controller routers"""

from __future__ import annotations

import logging

from fastapi import FastAPI

from src.config import LINEAPP_DEFAULT_USER_ID  # noqa: F401  (โหลด .env ผ่าน config)
from src.controller.parse_controller import router as parse_router

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="LineApp AI Service")
app.include_router(parse_router)
