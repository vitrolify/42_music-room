from fastapi import FastAPI
from prometheus_fastapi_instrumentator import Instrumentator


# Can be used to configure custom metrics later in development
def setup_metrics(app: FastAPI) -> None:
    Instrumentator().instrument(app).expose(app)
