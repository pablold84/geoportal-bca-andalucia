import logging
import logging.handlers
import os
import json
from datetime import datetime, timezone


LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
LOG_FILE = os.getenv("LOG_FILE", "")
LOG_MAX_BYTES = int(os.getenv("LOG_MAX_BYTES", str(10 * 1024 * 1024)))
LOG_BACKUP_COUNT = int(os.getenv("LOG_BACKUP_COUNT", "5"))


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        for key in ("username", "ip", "method", "path", "status", "action", "resource"):
            if hasattr(record, key):
                log_entry[key] = getattr(record, key)
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_entry, ensure_ascii=False)


def setup_logging() -> None:
    root = logging.getLogger()
    root.setLevel(getattr(logging, LOG_LEVEL, logging.INFO))

    for handler in root.handlers[:]:
        root.removeHandler(handler)

    formatter = JsonFormatter()

    stdout_handler = logging.StreamHandler()
    stdout_handler.setFormatter(formatter)
    root.addHandler(stdout_handler)

    if LOG_FILE:
        os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True) if os.path.dirname(LOG_FILE) else None
        file_handler = logging.handlers.RotatingFileHandler(
            LOG_FILE,
            maxBytes=LOG_MAX_BYTES,
            backupCount=LOG_BACKUP_COUNT,
            encoding="utf-8"
        )
        file_handler.setFormatter(formatter)
        root.addHandler(file_handler)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)


def log_access(logger: logging.Logger, username: str, ip: str, method: str, path: str, status: int) -> None:
    logger.info(
        "access",
        extra={"username": username, "ip": ip, "method": method, "path": path, "status": status}
    )


def log_auth(logger: logging.Logger, action: str, username: str, ip: str, success: bool) -> None:
    level = logging.INFO if success else logging.WARNING
    logger.log(
        level,
        f"auth.{action}",
        extra={"username": username, "ip": ip, "action": action, "status": "ok" if success else "fail"}
    )


def log_operation(logger: logging.Logger, action: str, resource: str, username: str, detail: str = "") -> None:
    logger.info(
        f"operation.{action}",
        extra={"username": username, "action": action, "resource": resource, "message": detail}
    )


def log_error(logger: logging.Logger, message: str, exc: Exception = None, username: str = "", path: str = "") -> None:
    logger.error(
        message,
        exc_info=exc is not None,
        extra={"username": username, "path": path}
    )
