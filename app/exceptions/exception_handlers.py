from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from app.exceptions.custom_exceptions import (
    FileUploadException,
    FileValidationException,
    FileNotFoundException,
    TextExtractionException,
    LLMProcessingException,
)


def setup_exception_handlers(app: FastAPI):
    @app.exception_handler(FileUploadException)
    async def file_upload_exception_handler(request: Request, exc: FileUploadException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
        )

    @app.exception_handler(FileValidationException)
    async def file_validation_exception_handler(
        request: Request, exc: FileValidationException
    ):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
        )

    @app.exception_handler(FileNotFoundException)
    async def file_not_found_exception_handler(
        request: Request, exc: FileNotFoundException
    ):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
        )

    @app.exception_handler(TextExtractionException)
    async def text_extraction_exception_handler(
        request: Request, exc: TextExtractionException
    ):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
        )

    @app.exception_handler(LLMProcessingException)
    async def llm_processing_exception_handler(
        request: Request, exc: LLMProcessingException
    ):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
        )
