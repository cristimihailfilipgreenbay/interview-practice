from typing import Any

from flask import Flask, jsonify
from flask.typing import ResponseReturnValue
from pydantic import ValidationError
from werkzeug.exceptions import HTTPException

from app.errors.exceptions import (
    ApiError,
    BadRequestError,
    FileTooLargeError,
    NotFoundError,
)

# Codes for errors Flask/Werkzeug raise on their own (unknown route, body over
# MAX_CONTENT_LENGTH, ...), so they come back in the same shape as ours.
_HTTP_ERROR_CODES = {
    NotFoundError.status: NotFoundError.code,
    FileTooLargeError.status: FileTooLargeError.code,
    405: "METHOD_NOT_ALLOWED",
    415: "UNSUPPORTED_MEDIA_TYPE",
}


def _error_response(
    status: int, code: str, message: str, details: Any = None
) -> ResponseReturnValue:
    body: dict[str, Any] = {"code": code, "message": message}
    if details is not None:
        body["details"] = details
    return jsonify({"error": body}), status


def register_error_handlers(app: Flask) -> None:
    @app.errorhandler(ApiError)
    def handle_api_error(error: ApiError) -> ResponseReturnValue:
        return _error_response(error.status, error.code, error.message, error.details)

    @app.errorhandler(ValidationError)
    def handle_validation_error(error: ValidationError) -> ResponseReturnValue:
        details = error.errors(include_url=False, include_context=False)
        return handle_api_error(
            BadRequestError("Invalid request.", {"errors": details})
        )

    @app.errorhandler(HTTPException)
    def handle_http_error(error: HTTPException) -> ResponseReturnValue:
        status = error.code or 500
        code = _HTTP_ERROR_CODES.get(status, "HTTP_ERROR")
        return _error_response(status, code, error.description or "")

    @app.errorhandler(Exception)
    def handle_unexpected_error(error: Exception) -> ResponseReturnValue:
        if app.debug:
            raise error  # let Flask's interactive debugger show it
        app.logger.exception("Unhandled error")
        return handle_api_error(ApiError("Something went wrong."))
