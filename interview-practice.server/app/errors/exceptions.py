from typing import Any


class ApiError(Exception):
    """An error that maps to the API's error contract (see docs/api-design.md).

    Subclasses fix the HTTP status and a default error code, so raising one only
    takes a message: `raise NotFoundError("Document not found.")`. Pass `code=` to
    use a more specific code than the default, e.g.
    `ConflictError("...", code="INTERVIEW_ALREADY_ENDED")`.
    """

    status: int = 500
    code: str = "INTERNAL_ERROR"

    def __init__(
        self,
        message: str,
        details: dict[str, Any] | None = None,
        code: str | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.details = details
        if code is not None:
            self.code = code


class BadRequestError(ApiError):
    status = 400
    code = "VALIDATION_ERROR"


class NotFoundError(ApiError):
    status = 404
    code = "NOT_FOUND"


class ConflictError(ApiError):
    status = 409
    code = "CONFLICT"


class FileTooLargeError(ApiError):
    status = 413
    code = "FILE_TOO_LARGE"


class UnprocessableFileError(ApiError):
    status = 422
    code = "UNPROCESSABLE_FILE"


class InputRejectedError(ApiError):
    """The security guard (or the model provider's moderation) refused the input."""

    status = 422
    code = "INPUT_REJECTED"


class LlmUpstreamError(ApiError):
    """The model provider failed or returned something unusable."""

    status = 502
    code = "LLM_UPSTREAM_ERROR"


class LlmUnavailableError(ApiError):
    """The model provider can't serve us right now (rate limit, credits, key)."""

    status = 503
    code = "LLM_UNAVAILABLE"


class LlmTimeoutError(ApiError):
    status = 504
    code = "LLM_TIMEOUT"
