"""ช่วย resolve URL สำหรับเรียก service บน host จากใน Docker container"""

from __future__ import annotations

import socket
from urllib.parse import urlparse, urlunparse


def resolve_host_to_ipv4(host: str, port: int) -> str | None:
    try:
        infos = socket.getaddrinfo(host, port, socket.AF_INET, socket.SOCK_STREAM)
        return infos[0][4][0]
    except OSError:
        return None


def to_ipv4_base_url(base_url: str) -> str:
    """บังคับใช้ IPv4 — ลดปัญหา host.docker.internal ถูก resolve เป็น IPv6 แล้ว Errno 101."""
    parsed = urlparse(base_url)
    host = parsed.hostname
    if not host or host in ("localhost", "127.0.0.1"):
        return base_url.rstrip("/")
    port = parsed.port or (443 if parsed.scheme == "https" else 80)
    ip = resolve_host_to_ipv4(host, port)
    if not ip:
        return base_url.rstrip("/")
    netloc = f"{ip}:{port}" if parsed.port else ip
    return urlunparse(
        (parsed.scheme, netloc, parsed.path, parsed.params, parsed.query, parsed.fragment)
    ).rstrip("/")


def docker_default_gateway_ip() -> str | None:
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
