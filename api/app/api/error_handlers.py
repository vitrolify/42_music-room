import logging

from fastapi import Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field


# Response models for internal error responses
class ErrorResponse(BaseModel):
    success: bool = Field(default=False, example=False)
    error_code: str = Field(example="DATABASE_ERROR")
    message: str = Field(
        description="Message to be shown to end user",
        example="An error occurred while processing your request. Please try again later.",
    )


# Custom exceptions for Virtolify errors
class BaseVirtolifyException(Exception):
    def __init__(
        self,
        error_code: str,
        message: str,
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
    ):
        self.error_code = error_code
        self.message = message
        self.status_code = status_code
        super().__init__(message)


# Exception Handlers
async def virtolify_exception_handler(request: Request, exc: BaseVirtolifyException):
    logger = logging.getLogger(__name__)
    logger.error(
        {"event": "exception_handled", "code": exc.error_code, "msg": exc.message},
        exc_info=True,
    )

    error_body = ErrorResponse(error_code=exc.error_code, message=exc.message)
    return JSONResponse(status_code=exc.status_code, content=error_body.model_dump())


def setup_exception_handlers(app):
    app.add_exception_handler(BaseVirtolifyException, virtolify_exception_handler)


def throw_exception():
    raise BaseVirtolifyException(
        error_code="TEST_ERROR",
        message="This is a test error for demonstration purposes.",
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
