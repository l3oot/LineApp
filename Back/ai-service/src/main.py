"""Bootstrap FastAPI app — รวม config, logging และ mount controller routers"""

from __future__ import annotations

import logging

from fastapi import FastAPI

import src.config  # noqa: F401  (โหลด .env ผ่าน settings)
from src.controller.parse_controller import router as parse_router

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="LineApp AI Service")
app.include_router(parse_router)
