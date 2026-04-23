from fastapi import FastAPI
from prometheus_client import Info
from prometheus_fastapi_instrumentator import Instrumentator


def setup_metrics(app: FastAPI) -> None:
    i = Info("app_info", "FastAPI application information", namespace="fastapi")
    i.info({"app_name": "vitrolify-api"})

    instrumentator = Instrumentator(
        should_group_status_codes=False,
        should_ignore_untemplated=True,
        should_respect_env_var=True,
        should_instrument_requests_inprogress=True,
        excluded_handlers=["/metrics"],
        inprogress_name="fastapi_requests_in_progress",
        inprogress_labels=True,
    )

    _ = instrumentator.instrument(app).expose(app)
