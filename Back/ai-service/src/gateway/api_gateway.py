"""API Gateway — validate → permission → route → execute"""

from __future__ import annotations

import logging
import re
from typing import Any

from src.gateway.permissions import PermissionDenied, check_permission
from src.gateway.validators import ValidationError, validate_args
from src.registry.api_registry import get_entry
from src.registry.models import RegistryEntry
from src.tools.adapters import run_local_handler
from src.tools.http_executor import HttpExecutorError, execute_http

logger = logging.getLogger(__name__)


class GatewayError(Exception):
    def __init__(self, message: str, *, code: str = "gateway_error"):
        super().__init__(message)
        self.message = message
        self.code = code


_PATH_PARAM_RE = re.compile(r"\{([a-zA-Z_][a-zA-Z0-9_]*)\}")


def _render_path(path_template: str, args: dict[str, Any], user_id: str | None) -> tuple[str, dict[str, Any]]:
    """แทนที่ {user_id}/{cycle_id} ใน path แล้วคืน query params ที่เหลือ"""
    remaining = dict(args)
    values = dict(remaining)
    if user_id:
        values.setdefault("user_id", str(user_id).strip())

    def repl(match: re.Match[str]) -> str:
        key = match.group(1)
        if key not in values or values[key] is None or values[key] == "":
            raise GatewayError(f"missing path parameter: {key}", code="validation_error")
        val = str(values[key])
        remaining.pop(key, None)
        return val

    rendered = _PATH_PARAM_RE.sub(repl, path_template)
    return rendered, remaining


def _query_params_for_http(entry: RegistryEntry, remaining: dict[str, Any], user_id: str | None) -> dict[str, Any]:
    params = dict(remaining)
    # map snake_case tool args → Java query names
    rename = {
        "cycle_id": "cycleId",
        "start_date": "startDate",
        "end_date": "endDate",
    }
    out: dict[str, Any] = {}
    for key, value in params.items():
        out[rename.get(key, key)] = value
    if entry.permission == "read_own" and user_id:
        # endpoints ที่ต้องการ userId เป็น query (เช่น summarize, get by id)
        if "userId" not in out and "{user_id}" not in (entry.path or ""):
            # path ที่มี user_id ใน path แล้วไม่ต้องซ้ำ — แต่ summarize ต้องมี
            if entry.id in ("get_cycle_summary",) or "/user/" not in (entry.path or ""):
                out["userId"] = str(user_id).strip()
    return out


def execute_tool(tool_name: str, args: dict[str, Any] | None, user_id: str | None) -> dict[str, Any]:
    entry = get_entry(tool_name)
    if entry is None:
        raise GatewayError(f"tool not in registry: {tool_name}", code="not_found")

    try:
        check_permission(entry, user_id)
        clean_args = validate_args(entry, args)
    except PermissionDenied as exc:
        raise GatewayError(exc.message, code="permission_denied") from exc
    except ValidationError as exc:
        raise GatewayError(exc.message, code="validation_error") from exc

    if entry.executor == "local":
        if not entry.handler:
            raise GatewayError(f"local tool missing handler: {entry.id}", code="config_error")
        # parse_expense: ถ้าไม่มี text ใน args ใช้ไม่ได้
        data = run_local_handler(entry.handler, clean_args, user_id)
        return {"ok": True, "tool": entry.id, "data": data}

    if not entry.path:
        raise GatewayError(f"http tool missing path: {entry.id}", code="config_error")

    path, remaining = _render_path(entry.path, clean_args, user_id)
    params = _query_params_for_http(entry, remaining, user_id)
    try:
        data = execute_http(
            method=entry.method if entry.method != "LOCAL" else "GET",
            path=path,
            params=params,
            user_id=user_id,
        )
    except HttpExecutorError as exc:
        raise GatewayError(exc.message, code="upstream_error") from exc

    return {"ok": True, "tool": entry.id, "data": data}
