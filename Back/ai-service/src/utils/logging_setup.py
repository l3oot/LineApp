"""เขียน log ทั้ง stdout และไฟล์ — โฟลเดอร์แยกตาม service ที่ host (`log/ai-service`)"""

from __future__ import annotations

import logging
import os
from logging.handlers import RotatingFileHandler
from pathlib import Path

from src.utils.request_id import get_request_id

_CONFIGURED = False
_DEFAULT_LOG_FILE = "/app/logs/ai-service.log"
_MAX_BYTES = 10 * 1024 * 1024
_BACKUP_COUNT = 14
_FORMAT = "%(asctime)s %(levelname)-5s [%(name)s] [reqId=%(reqId)s] %(message)s"


class RequestIdFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.reqId = get_request_id() or "-"
        return True


def _has_file_handler(logger: logging.Logger, log_path: Path) -> bool:
    target = log_path.resolve()
    for handler in logger.handlers:
        filename = getattr(handler, "baseFilename", "")
        if filename and Path(filename).resolve() == target:
            return True
    return False


def setup_logging() -> None:
    global _CONFIGURED
    if _CONFIGURED:
        return

    log_file = Path(os.getenv("LOG_FILE", _DEFAULT_LOG_FILE))
    log_file.parent.mkdir(parents=True, exist_ok=True)

    formatter = logging.Formatter(_FORMAT)
    req_id_filter = RequestIdFilter()

    file_handler = RotatingFileHandler(
        log_file,
        maxBytes=_MAX_BYTES,
        backupCount=_BACKUP_COUNT,
        encoding="utf-8",
    )
    file_handler.setFormatter(formatter)
    file_handler.addFilter(req_id_filter)

    root = logging.getLogger()
    if not root.handlers:
        root.setLevel(logging.INFO)
        stream = logging.StreamHandler()
        stream.setFormatter(formatter)
        stream.addFilter(req_id_filter)
        root.addHandler(stream)

    if not _has_file_handler(root, log_file):
        root.addHandler(file_handler)

    for name in ("uvicorn", "uvicorn.error", "uvicorn.access"):
        uv_logger = logging.getLogger(name)
        if not uv_logger.propagate and not _has_file_handler(uv_logger, log_file):
            uv_logger.addHandler(file_handler)

    _CONFIGURED = True
    logging.getLogger(__name__).info("file logging enabled path=%s", log_file)
