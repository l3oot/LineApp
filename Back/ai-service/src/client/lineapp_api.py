"""เรียก user-service (LineApp API) เช่น ดึงรายการ cycle / category ก่อนส่งให้ LLM"""

from __future__ import annotations

import logging
import os
import time
from typing import Any

import requests

from src.utils.docker_network import candidate_urls, docker_default_gateway_ip, to_ipv4_base_url
from src.utils.request_id import REQUEST_ID_HEADER, get_request_id

logger = logging.getLogger(__name__)

DEFAULT_LINEAPP_API_BASE = "http://localhost:8080"


def get_lineapp_api_base() -> str:
    raw = os.getenv("LINEAPP_API_BASE", "").strip()
    if raw:
        return to_ipv4_base_url(raw.rstrip("/"))
    gw = docker_default_gateway_ip()
    if gw:
        return f"http://{gw}:8080"
    return DEFAULT_LINEAPP_API_BASE


def _get_api_data(
    base_url: str,
    path: str,
    params: dict[str, str],
    *,
    timeout: float,
    log_label: str,
) -> list[dict[str, Any]]:
    """ส่ง GET ไป user-service พร้อม fallback URL — คืน body['data'] ที่เป็น list[dict]"""
    candidates = candidate_urls(base_url, path)
    last_error: requests.RequestException | None = None
    response: requests.Response | None = None
    req_id = get_request_id()
    headers = {}
    if req_id and req_id != "-":
        headers[REQUEST_ID_HEADER] = req_id
    t0 = time.monotonic()
    logger.info(
        "[ai-latency] hop=ai→user reqId=%s action=start path=%s candidates=%d",
        req_id,
        path,
        len(candidates),
    )
    for url in candidates:
        t_attempt = time.monotonic()
        try:
            response = requests.get(url, params=params, headers=headers, timeout=timeout)
            logger.info(
                "[ai-latency] hop=ai→user reqId=%s action=done path=%s status=%s url=%s elapsed_ms=%d",
                req_id,
                path,
                response.status_code,
                response.url,
                (time.monotonic() - t_attempt) * 1000,
            )
            response.raise_for_status()
            break
        except requests.RequestException as exc:
            last_error = exc
            logger.warning(
                "[ai-latency] hop=ai→user reqId=%s action=fail path=%s url=%s elapsed_ms=%d error=%s",
                req_id,
                path,
                url,
                (time.monotonic() - t_attempt) * 1000,
                exc,
            )
            response = None
    if response is None:
        logger.warning(
            "[ai-latency] hop=ai→user reqId=%s action=fail path=%s elapsed_ms=%d params=%s bases=%s last=%s",
            req_id,
            path,
            (time.monotonic() - t0) * 1000,
            params,
            candidates,
            last_error,
        )
        return []
    try:
        body = response.json()
    except ValueError as exc:
        logger.warning(
            "%s invalid JSON url=%s text=%s error=%s",
            log_label,
            response.url,
            response.text[:500],
            exc,
        )
        return []
    if not isinstance(body, dict):
        logger.warning(
            "%s unexpected body type=%s preview=%s",
            log_label,
            type(body).__name__,
            str(body)[:300],
        )
        return []
    if not body.get("success"):
        logger.warning(
            "%s success=false url=%s message=%s typeError=%s",
            log_label,
            response.url,
            body.get("message"),
            body.get("typeError"),
        )
        return []
    data = body.get("data")
    if not isinstance(data, list):
        logger.warning("%s data not a list: %s", log_label, type(data).__name__)
        return []
    return [row for row in data if isinstance(row, dict)]


def fetch_cycles_for_user(
    base_url: str, user_id: str, timeout: float = 15.0
) -> list[dict[str, Any]]:
    """GET {base}/api/cycle?userId=... — คืน data[] จาก ApiRes หรือ [] เมื่อ error"""
    if not user_id or not str(user_id).strip():
        logger.info("fetch_cycles_for_user skipped: empty user_id")
        return []
    rows = _get_api_data(
        base_url,
        "/api/cycle",
        {"userId": user_id.strip()},
        timeout=timeout,
        log_label="cycle",
    )
    preview = [
        {
            "cycleId": row.get("cycleId"),
            "name": row.get("name"),
            "farmType": row.get("farmType"),
        }
        for row in rows[:5]
    ]
    logger.info("GET cycle OK count=%s preview=%s", len(rows), preview)
    return rows


def fetch_categories_for_user(
    base_url: str,
    user_id: str,
    *,
    type_filter: str | None = None,
    timeout: float = 15.0,
) -> list[dict[str, Any]]:
    """GET {base}/api/category?userId=... — คืน data[] จาก ApiRes หรือ [] เมื่อ error"""
    if not user_id or not str(user_id).strip():
        logger.info("fetch_categories_for_user skipped: empty user_id")
        return []
    params: dict[str, str] = {"userId": user_id.strip()}
    if type_filter and type_filter.strip():
        params["type"] = type_filter.strip()
    rows = _get_api_data(
        base_url,
        "/api/category",
        params,
        timeout=timeout,
        log_label="category",
    )
    preview = [
        {
            "categoryId": row.get("categoryId"),
            "name": row.get("name"),
            "type": row.get("type"),
        }
        for row in rows[:5]
    ]
    logger.info("GET category OK count=%s preview=%s", len(rows), preview)
    return rows
