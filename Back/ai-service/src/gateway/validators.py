"""Validate args ตาม schema ใน registry"""

from __future__ import annotations

from typing import Any

from src.registry.models import RegistryEntry, ToolParameter


class ValidationError(Exception):
    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


def _coerce(name: str, value: Any, param: ToolParameter) -> Any:
    if value is None:
        raise ValidationError(f"parameter {name} is null")
    if param.type == "string":
        return str(value)
    if param.type == "integer":
        try:
            return int(value)
        except (TypeError, ValueError) as exc:
            raise ValidationError(f"parameter {name} must be integer") from exc
    if param.type == "number":
        try:
            return float(value)
        except (TypeError, ValueError) as exc:
            raise ValidationError(f"parameter {name} must be number") from exc
    if param.type == "boolean":
        if isinstance(value, bool):
            return value
        if str(value).lower() in ("true", "1", "yes"):
            return True
        if str(value).lower() in ("false", "0", "no"):
            return False
        raise ValidationError(f"parameter {name} must be boolean")
    return value


def validate_args(entry: RegistryEntry, args: dict[str, Any] | None) -> dict[str, Any]:
    raw = dict(args or {})
    out: dict[str, Any] = {}
    for name, param in entry.parameters.items():
        if name not in raw or raw[name] is None or raw[name] == "":
            if param.required:
                raise ValidationError(f"missing required parameter: {name}")
            continue
        out[name] = _coerce(name, raw[name], param)
    # ตัด key ที่ไม่อยู่ใน schema
    return out
