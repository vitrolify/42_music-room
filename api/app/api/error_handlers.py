import logging

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field


# Response models for internal error responses
class ErrorResponse(BaseModel):
    success: bool = Field(default=False, examples=[False])
    error_code: str = Field(examples=["DATABASE_ERROR"])
    message: str = Field(
        description="Message to be shown to end user",
        examples=[
            "An error occurred while processing your request. Please try again later."
        ],
    )


# Custom exceptions for Vitrolify errors
class BaseVitrolifyException(Exception):
    error_code: str
    message: str
    status_code: int

    def __init__(
        self,
        error_code: str,
        message: str,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
    ):
        self.error_code = error_code
        self.message = message
        self.status_code = status_code
        super().__init__(message)


# Exception Handlers
async def vitrolify_exception_handler(request: Request, exc: BaseVitrolifyException):
    logger = logging.getLogger(__name__)
    logger.error(
        {"event": "exception_handled", "code": exc.error_code, "msg": exc.message},
        exc_info=True,
    )

    error_body = ErrorResponse(error_code=exc.error_code, message=exc.message)
    return JSONResponse(status_code=exc.status_code, content=error_body.model_dump())


# NOVO HANDLER AQUI:
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger = logging.getLogger(__name__)

    first_error = exc.errors()[0]
    field_name = ".".join(str(loc) for loc in first_error.get("loc", []))

    if first_error.get("type") == "enum":
        expected = first_error.get("ctx", {}).get("expected", "")
        message = (
            f"O valor enviado para o campo '{field_name}' é inválido. "
            f"Valores esperados: {expected}."
        )
    else:
        message = f"Erro de validação no campo '{field_name}': {first_error.get('msg')}"

    logger.warning(
        {"event": "validation_error", "code": "VALIDATION_ERROR", "msg": message},
    )

    error_body = ErrorResponse(error_code="VALIDATION_ERROR", message=message)
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=error_body.model_dump(),
    )


def setup_exception_handlers(app: FastAPI):
    app.add_exception_handler(
        BaseVitrolifyException,
        vitrolify_exception_handler,  # pyright: ignore[reportArgumentType]
    )
    app.add_exception_handler(
        RequestValidationError,
        validation_exception_handler,  # pyright: ignore[reportArgumentType]
    )


def throw_exception():
    raise BaseVitrolifyException(
        error_code="TEST_ERROR",
        message="This is a test error for demonstration purposes.",
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
