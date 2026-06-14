from functools import wraps

from fastapi import FastAPI
from prometheus_client import Info
from prometheus_fastapi_instrumentator import Instrumentator
from prometheus_fastapi_instrumentator import routing as pfi_routing
from starlette.routing import Match, Mount


@wraps(pfi_routing._get_route_name)
def _safe_get_route_name(scope, routes, route_name=None):
    for route in routes:
        route_path = getattr(route, "path", None)
        if route_path is None:
            continue
        match, child_scope = route.matches(scope)
        if match == Match.FULL:
            route_name = route_path
            child_scope = {**scope, **child_scope}
            if isinstance(route, Mount) and route.routes:
                child_route_name = _safe_get_route_name(child_scope, route.routes, route_name)
                if child_route_name is None:
                    route_name = None
                else:
                    route_name += child_route_name
            return route_name
        elif match == Match.PARTIAL and route_name is None:
            route_name = route_path
    return None


def setup_metrics(app: FastAPI) -> None:
    pfi_routing._get_route_name = _safe_get_route_name

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
