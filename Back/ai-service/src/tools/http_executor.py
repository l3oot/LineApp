"""เรียก user-service ผ่าน HTTP พร้อม internal API key"""

from __future__ import annotations

import logging
import time
from typing import Any

import requests

from src.client.lineapp_api import get_lineapp_api_base
from src.config import settings
from src.utils.docker_network import candidate_urls
from src.utils.request_id import REQUEST_ID_HEADER, get_request_id

logger = logging.getLogger(__name__)

INTERNAL_KEY_HEADER = "X-Internal-Api-Key"
USER_ID_HEADER = "X-User-Id"


class HttpExecutorError(Exception):
    def __init__(self, message: str, *, status_code: int | None = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def _headers(user_id: str | None) -> dict[str, str]:
    headers: dict[str, str] = {"Accept": "application/json"}
    req_id = get_request_id()
    if req_id and req_id != "-":
        headers[REQUEST_ID_HEADER] = req_id
    key = settings.ai_internal_key
    if key:
        headers[INTERNAL_KEY_HEADER] = key
    if user_id and str(user_id).strip():
        headers[USER_ID_HEADER] = str(user_id).strip()
    return headers


def execute_http(
    *,
    method: str,
    path: str,
    params: dict[str, Any] | None = None,
    user_id: str | None = None,
    timeout: float | None = None,
) -> Any:
    base = get_lineapp_api_base()
    candidates = candidate_urls(base, path)
    last_error: Exception | None = None
    timeout_s = timeout if timeout is not None else settings.gateway_http_timeout_seconds
    headers = _headers(user_id)
    req_id = get_request_id()
    t0 = time.monotonic()
    logger.info(
        "[ai-gateway] hop=ai→user reqId=%s action=start method=%s path=%s",
        req_id,
        method,
        path,
    )
    for url in candidates:
        try:
            response = requests.request(
                method.upper(),
                url,
                params=params or None,
                headers=headers,
                timeout=timeout_s,
            )
            logger.info(
                "[ai-gateway] hop=ai→user reqId=%s action=done method=%s path=%s status=%s elapsed_ms=%d",
                req_id,
                method,
                path,
                response.status_code,
                (time.monotonic() - t0) * 1000,
            )
            if response.status_code >= 400:
                raise HttpExecutorError(
                    f"HTTP {response.status_code}: {response.text[:400]}",
                    status_code=response.status_code,
                )
            try:
                return response.json()
            except ValueError:
                return {"raw": response.text}
        except HttpExecutorError:
            raise
        except requests.RequestException as exc:
            last_error = exc
            logger.warning(
                "[ai-gateway] hop=ai→user reqId=%s action=fail url=%s error=%s",
                req_id,
                url,
                exc,
            )
    raise HttpExecutorError(f"all candidates failed for {path}: {last_error}")
