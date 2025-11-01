import logging
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from app.exceptions.custom_exceptions import (
    FileUploadException,
    FileValidationException,
    FileNotFoundException,
    TextExtractionException,
    LLMProcessingException,
)

logger = logging.getLogger(__name__)


def setup_exception_handlers(app: FastAPI):
    @app.exception_handler(FileUploadException)
    async def file_upload_exception_handler(request: Request, exc: FileUploadException):
        request_id = getattr(request.state, "request_id", "unknown")

        logger.error(
            f"File upload failed: {exc.detail}",
            extra={"request_id": request_id, "endpoint": str(request.url.path)}
        )

        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail, "request_id": request_id},
        )

    @app.exception_handler(FileValidationException)
    async def file_validation_exception_handler(
        request: Request, exc: FileValidationException
    ):
        request_id = getattr(request.state, "request_id", "unknown")

        logger.warning(
            f"File validation failed: {exc.detail}",
            extra={"request_id": request_id, "endpoint": str(request.url.path)}
        )

        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail, "request_id": request_id},
        )

    @app.exception_handler(FileNotFoundException)
    async def file_not_found_exception_handler(
        request: Request, exc: FileNotFoundException
    ):
        request_id = getattr(request.state, "request_id", "unknown")

        logger.warning(
            f"File not found: {exc.detail}",
            extra={"request_id": request_id, "endpoint": str(request.url.path)}
        )

        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail, "request_id": request_id},
        )

    @app.exception_handler(TextExtractionException)
    async def text_extraction_exception_handler(
        request: Request, exc: TextExtractionException
    ):
        request_id = getattr(request.state, "request_id", "unknown")

        logger.error(
            f"Text extraction failed: {exc.detail}",
            extra={"request_id": request_id, "endpoint": str(request.url.path)}
        )

        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail, "request_id": request_id},
        )

    @app.exception_handler(LLMProcessingException)
    async def llm_processing_exception_handler(
        request: Request, exc: LLMProcessingException
    ):
        request_id = getattr(request.state, "request_id", "unknown")

        logger.error(
            f"LLM processing failed: {exc.detail}",
            extra={"request_id": request_id, "endpoint": str(request.url.path)}
        )

        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail, "request_id": request_id},
        )

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        request_id = getattr(request.state, "request_id", "unknown")

        # Only log 4xx errors if they're authentication related (401, 403)
        if exc.status_code in [401, 403]:
            logger.warning(
                f"Auth error {exc.status_code}: {exc.detail}",
                extra={"request_id": request_id, "endpoint": str(request.url.path)}
            )
        elif exc.status_code >= 500:
            logger.error(
                f"Server error {exc.status_code}: {exc.detail}",
                extra={"request_id": request_id, "endpoint": str(request.url.path)}
            )

        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail, "request_id": request_id},
        )

    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        request_id = getattr(request.state, "request_id", "unknown")

        logger.critical(
            f"Unhandled exception: {type(exc).__name__} - {str(exc)}",
            exc_info=True,
            extra={"request_id": request_id, "endpoint": str(request.url.path)}
        )

        return JSONResponse(
            status_code=500,
            content={
                "detail": "Internal server error",
                "request_id": request_id,
            },
        )
