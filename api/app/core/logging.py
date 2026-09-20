import logging
import sys


class EndpointFilter(logging.Filter):
    def __init__(
        self,
        excluded_endpoints: tuple[str, ...] = ("/metrics", "/favicon.ico"),
    ) -> None:
        super().__init__()
        self.excluded_endpoints = excluded_endpoints

    def filter(self, record: logging.LogRecord) -> bool:
        if record.args and len(record.args) >= 3:
            path = record.args[2]
            if isinstance(path, str) and any(
                path.startswith(endpoint) for endpoint in self.excluded_endpoints
            ):
                return False
        return not any(
            endpoint in record.getMessage() for endpoint in self.excluded_endpoints
        )


def setup_logging() -> None:
    log_format = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
    date_format = "%Y-%m-%d %H:%M:%S"

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter(fmt=log_format, datefmt=date_format))

    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    root_logger.handlers = [handler]

    # Silence health check and metrics scraping logs from uvicorn.access
    logging.getLogger("uvicorn.access").addFilter(EndpointFilter())
