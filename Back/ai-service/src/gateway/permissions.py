"""ตรวจสิทธิ์ก่อนให้ Gateway เรียก tool"""

from __future__ import annotations

from src.registry.models import RegistryEntry


class PermissionDenied(Exception):
    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


def check_permission(entry: RegistryEntry, user_id: str | None) -> None:
    perm = entry.permission
    if perm == "read":
        return
    if perm in ("read_own", "parse_only"):
        if not user_id or not str(user_id).strip():
            raise PermissionDenied(f"tool {entry.id} requires authenticated user_id")
        return
    raise PermissionDenied(f"unsupported permission: {perm}")
