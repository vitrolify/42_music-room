import logging
import json
from datetime import datetime, timezone


class JsonFormatter(logging.Formatter):
    def format(self, record):
        t = datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat()
        log_record = {
            "timestamp": t,
            "level": record.levelname,
            "logger": record.name,
        }

        if isinstance(record.msg, dict):
            log_record.update(record.msg)
        else:
            log_record["message"] = record.getMessage()

        if record.exc_info:
            log_record["exception"] = self.formatException(record.exc_info)
            log_record["caller"] = f"{record.pathname}:{record.lineno}"

        return json.dumps(log_record)


def setup_logging() -> None:
    root_logger = logging.getLogger()

    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter())

    root_logger.setLevel(logging.INFO)
    root_logger.addHandler(handler)

    logging.getLogger().handlers = [handler]
