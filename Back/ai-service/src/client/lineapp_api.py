"""
เรียก user-service (LineApp API) เช่น ดึงรายการ cycle ก่อนส่งให้ LLM
"""

from __future__ import annotations

import logging
import os
import socket
from typing import Any
from urllib.parse import urlparse, urlunparse

import requests

logger = logging.getLogger(__name__)

DEFAULT_LINEAPP_API_BASE = "http://localhost:8080"


def _resolve_host_to_ipv4(host: str, port: int) -> str | None:
    try:
        infos = socket.getaddrinfo(host, port, socket.AF_INET, socket.SOCK_STREAM)
        return infos[0][4][0]
    except OSError:
        return None


def _to_ipv4_base_url(base_url: str) -> str:
    """บังคับใช้ IPv4 — ลดปัญหา host.docker.internal ถูก resolve เป็น IPv6 แล้ว Errno 101."""
    parsed = urlparse(base_url)
    host = parsed.hostname
    if not host or host in ("localhost", "127.0.0.1"):
        return base_url.rstrip("/")
    port = parsed.port or (443 if parsed.scheme == "https" else 80)
    ip = _resolve_host_to_ipv4(host, port)
    if not ip:
        return base_url.rstrip("/")
    netloc = f"{ip}:{port}" if parsed.port else ip
    return urlunparse(
        (parsed.scheme, netloc, parsed.path, parsed.params, parsed.query, parsed.fragment)
    ).rstrip("/")


def _docker_default_gateway_ip() -> str | None:
    """IP ของ host จากมุม container (Docker Desktop / Linux bridge)."""
    try:
        with open("/proc/net/route", encoding="utf-8") as f:
            for line in f:
                fields = line.strip().split()
                if len(fields) >= 3 and fields[1] == "00000000":
                    return socket.inet_ntoa(bytes.fromhex(fields[2])[::-1])
    except (OSError, ValueError, IndexError):
        pass
    return None


def get_lineapp_api_base() -> str:
    raw = os.getenv("LINEAPP_API_BASE", "").strip()
    if raw:
        return _to_ipv4_base_url(raw.rstrip("/"))
    gw = _docker_default_gateway_ip()
    if gw:
        return f"http://{gw}:8080"
    return DEFAULT_LINEAPP_API_BASE


def _candidate_urls(base_url: str, path: str) -> list[str]:
    """ลำดับ URL ที่ลอง — IPv4 ก่อน แล้ว fallback ไป gateway ของ Docker (ไม่ใช้ hostname ตรง ๆ)."""
    base = base_url.rstrip("/")
    ipv4_base = _to_ipv4_base_url(base)
    urls = [f"{ipv4_base}{path}"]
    gw = _docker_default_gateway_ip()
    if gw:
        gw_base = f"http://{gw}:8080"
        if gw_base != ipv4_base:
            urls.append(f"{gw_base}{path}")
    seen: set[str] = set()
    out: list[str] = []
    for u in urls:
        if u not in seen:
            seen.add(u)
            out.append(u)
    return out


def _get_api_data(
    base_url: str,
    path: str,
    params: dict[str, str],
    *,
    timeout: float,
    log_label: str,
) -> list[dict[str, Any]]:
    """ส่ง GET ไป user-service พร้อม fallback URL — คืน body['data'] ที่เป็น list[dict]"""
    candidates = _candidate_urls(base_url, path)
    last_error: requests.RequestException | None = None
    r: requests.Response | None = None
    for url in candidates:
        try:
            r = requests.get(url, params=params, timeout=timeout)
            logger.info("GET %s API status=%s url=%s", log_label, r.status_code, r.url)
            r.raise_for_status()
            break
        except requests.RequestException as e:
            last_error = e
            logger.warning("%s attempt failed url=%s error=%s", log_label, url, e)
            r = None
    if r is None:
        logger.warning(
            "%s all attempts failed params=%s bases=%s last=%s",
            log_label,
            params,
            candidates,
            last_error,
        )
        return []
    try:
        body = r.json()
    except ValueError as e:
        logger.warning(
            "%s invalid JSON url=%s text=%s error=%s",
            log_label,
            r.url,
            r.text[:500],
            e,
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
            r.url,
            body.get("message"),
            body.get("typeError"),
        )
        return []
    data = body.get("data")
    if not isinstance(data, list):
        logger.warning("%s data not a list: %s", log_label, type(data).__name__)
        return []
    return [x for x in data if isinstance(x, dict)]


def fetch_cycles_for_user(base_url: str, user_id: str, timeout: float = 15.0) -> list[dict[str, Any]]:
    """GET {base}/api/cycle?userId=... — คืน data[] จาก ApiRes หรือ [] เมื่อ error / ไม่ success"""
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
    """GET {base}/api/category?userId=... — คืน data[] จาก ApiRes หรือ [] เมื่อ error / ไม่ success"""
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
