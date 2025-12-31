import logging
import time
import uuid
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)


class LoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware to log all incoming requests, responses, and exceptions.
    Adds request_id to track requests through the system.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id

        start_time = time.time()

        try:
            response = await call_next(request)

            process_time = time.time() - start_time

            response.headers["X-Request-ID"] = request_id
            response.headers["X-Process-Time"] = str(round(process_time * 1000, 2))

            # Log successful requests
            logger.info(
                f"Request completed: {request.method} {request.url.path} - "
                f"status={response.status_code}, time={round(process_time * 1000, 2)}ms, "
                f"request_id={request_id}"
            )

            return response

        except Exception as exc:
            process_time = time.time() - start_time

            logger.error(
                f"Request failed: {type(exc).__name__} - {str(exc)}",
                extra={
                    "request_id": request_id,
                    "method": request.method,
                    "endpoint": str(request.url.path),
                    "process_time_ms": round(process_time * 1000, 2),
                },
            )
            raise
