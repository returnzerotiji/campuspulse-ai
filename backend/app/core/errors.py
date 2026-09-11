"""Centralized error handling.

Every error the API returns -- validation, "not found", or an unexpected
DB/server failure -- comes back in the same JSON shape:

    {"error": {"code": "...", "message": "..."}}

so the frontend only needs one error-handling path.
"""
import logging

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

logger = logging.getLogger("campuspulse")


class NotFoundError(Exception):
    """Raised by services when a requested resource does not exist."""

    def __init__(self, message: str = "Resource not found"):
        self.message = message
        super().__init__(message)


def _error_response(status_code: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(status_code=status_code, content={"error": {"code": code, "message": message}})


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(NotFoundError)
    async def not_found_handler(request: Request, exc: NotFoundError) -> JSONResponse:
        return _error_response(status.HTTP_404_NOT_FOUND, "not_found", exc.message)

    @app.exception_handler(RequestValidationError)
    async def validation_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        return _error_response(
            status.HTTP_422_UNPROCESSABLE_ENTITY, "validation_error", str(exc.errors())
        )

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
        return _error_response(exc.status_code, "http_error", str(exc.detail))

    @app.exception_handler(SQLAlchemyError)
    async def db_error_handler(request: Request, exc: SQLAlchemyError) -> JSONResponse:
        logger.exception("Database error handling request %s", request.url)
        return _error_response(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "database_error",
            "Database is unavailable. Please try again shortly.",
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("Unhandled error handling request %s", request.url)
        return _error_response(
            status.HTTP_500_INTERNAL_SERVER_ERROR, "internal_error", "An unexpected error occurred."
        )
