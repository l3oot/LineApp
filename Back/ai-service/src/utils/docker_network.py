"""ช่วย resolve URL สำหรับเรียก service บน host จากใน Docker container"""

from __future__ import annotations

import socket
import time
from urllib.parse import urlparse, urlunparse

# [Debug Step 4.Network] resolve_host_to_ipv4 / docker_default_gateway_ip เดิมทำ
# blocking syscall (DNS lookup / อ่าน /proc/net/route) ทุกครั้งที่มี request เข้ามา
# ค่านี้แทบไม่เปลี่ยนระหว่างรัน container เดียว จึง cache ไว้ตาม TTL เพื่อลด latency
_CACHE_TTL_SECONDS = 60.0
_ipv4_cache: dict[str, tuple[str | None, float]] = {}
_gateway_cache: tuple[str | None, float] | None = None


def resolve_host_to_ipv4(host: str, port: int) -> str | None:
    try:
        infos = socket.getaddrinfo(host, port, socket.AF_INET, socket.SOCK_STREAM)
        return infos[0][4][0]
    except OSError:
        return None


def _resolve_host_to_ipv4_cached(host: str, port: int) -> str | None:
    key = f"{host}:{port}"
    cached = _ipv4_cache.get(key)
    now = time.monotonic()
    if cached is not None and (now - cached[1]) < _CACHE_TTL_SECONDS:
        return cached[0]
    ip = resolve_host_to_ipv4(host, port)
    _ipv4_cache[key] = (ip, now)
    return ip


def to_ipv4_base_url(base_url: str) -> str:
    """บังคับใช้ IPv4 — ลดปัญหา host.docker.internal ถูก resolve เป็น IPv6 แล้ว Errno 101."""
    parsed = urlparse(base_url)
    host = parsed.hostname
    if not host or host in ("localhost", "127.0.0.1"):
        return base_url.rstrip("/")
    port = parsed.port or (443 if parsed.scheme == "https" else 80)
    ip = _resolve_host_to_ipv4_cached(host, port)
    if not ip:
        return base_url.rstrip("/")
    netloc = f"{ip}:{port}" if parsed.port else ip
    return urlunparse(
        (parsed.scheme, netloc, parsed.path, parsed.params, parsed.query, parsed.fragment)
    ).rstrip("/")


def _read_docker_default_gateway_ip() -> str | None:
    try:
        with open("/proc/net/route", encoding="utf-8") as f:
            for line in f:
                fields = line.strip().split()
                if len(fields) >= 3 and fields[1] == "00000000":
                    return socket.inet_ntoa(bytes.fromhex(fields[2])[::-1])
    except (OSError, ValueError, IndexError):
        pass
    return None


def docker_default_gateway_ip() -> str | None:
    """IP ของ host จากมุม container (Docker Desktop / Linux bridge) — cached ตาม TTL."""
    global _gateway_cache
    now = time.monotonic()
    if _gateway_cache is not None and (now - _gateway_cache[1]) < _CACHE_TTL_SECONDS:
        return _gateway_cache[0]
    gw = _read_docker_default_gateway_ip()
    _gateway_cache = (gw, now)
    return gw


def candidate_urls(base_url: str, path: str) -> list[str]:
    """ลำดับ URL ที่ลอง — IPv4 ก่อน แล้ว fallback ไป gateway ของ Docker."""
    base = base_url.rstrip("/")
    ipv4_base = to_ipv4_base_url(base)
    urls = [f"{ipv4_base}{path}"]
    gw = docker_default_gateway_ip()
    if gw:
        gw_base = f"http://{gw}:8080"
        if gw_base != ipv4_base:
            urls.append(f"{gw_base}{path}")
    seen: set[str] = set()
    out: list[str] = []
    for url in urls:
        if url not in seen:
            seen.add(url)
            out.append(url)
    return out
