import logging
import re
import sys
from typing import Any

TOKEN_PATTERN = re.compile(
    r"(?i)(token=|access_token=|authorization:\s*bearer\s+|bearer\s+)[^\s&\"'\)]+"
)


def _redact_str(s: str) -> str:
    return TOKEN_PATTERN.sub(r"\g<1>[REDACTED]", s)


def _redact_value(val: Any) -> Any:
    if isinstance(val, str):
        return _redact_str(val)
    if isinstance(val, dict):
        return {k: _redact_value(v) for k, v in val.items()}
    if isinstance(val, (list, tuple)):
        return type(val)(_redact_value(item) for item in val)
    return val


class SensitiveDataFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            record.msg = _redact_str(record.msg)
        if record.args:
            if isinstance(record.args, tuple):
                record.args = tuple(_redact_value(a) for a in record.args)
            elif isinstance(record.args, dict):
                record.args = {k: _redact_value(v) for k, v in record.args.items()}
        return True


def setup_logging() -> None:
    log_format = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
    date_format = "%Y-%m-%d %H:%M:%S"

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter(fmt=log_format, datefmt=date_format))
    handler.addFilter(SensitiveDataFilter())

    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    root_logger.handlers = [handler]
    root_logger.addFilter(SensitiveDataFilter())

    # Disable uvicorn's default access log since UserActionMiddleware handles it
    logging.getLogger("uvicorn.access").disabled = True

    # Redact sensitive parameters (e.g. WebSocket query tokens) from uvicorn logs
    uvicorn_error = logging.getLogger("uvicorn.error")
    uvicorn_error.addFilter(SensitiveDataFilter())
    for h in uvicorn_error.handlers:
        h.addFilter(SensitiveDataFilter())
