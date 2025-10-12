import os

from fastapi import APIRouter, File, Query, Request, UploadFile, status

from app.constants.file_types import ALLOWED_EXTENSIONS, ALLOWED_MIME_TYPES
from app.constants.paths import UPLOAD_DIRECTORY
from app.exceptions.custom_exceptions import (
    FileUploadException,
    FileValidationException,
    LLMProcessingException,
)
from app.schemas.study import (
    MCQGenerationResponse,
    UploadResponse,
)
from app.services.extraction_service import extract_text_from_file
from app.services.llm_service import (
    generate_mcq_questions_from_pages,
)

router = APIRouter()


@router.post(
    "/uploadfile/",
    response_model=UploadResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_upload_file(file: UploadFile = File(...), request: Request = Request):
    # 1. Validate the file extension
    if not file.filename:
        raise FileValidationException("No file provided or filename is missing.")

    file_extension = os.path.splitext(file.filename)[1].lower()
    if file_extension not in ALLOWED_EXTENSIONS:
        raise FileValidationException(
            f"File extension '{file_extension}' is not allowed. Allowed extensions are: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # 2. Validate the MIME type
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise FileValidationException(
            f"File content type '{file.content_type}' is not allowed."
        )

    safe_filename = os.path.basename(file.filename)
    file_location = os.path.join(UPLOAD_DIRECTORY, safe_filename)

    if not os.path.exists(UPLOAD_DIRECTORY):
        os.makedirs(UPLOAD_DIRECTORY)

    try:
        contents = await file.read()
        with open(file_location, "wb") as f:
            f.write(contents)
        file_url = f"{request.base_url}files/{safe_filename}"
        _ = extract_text_from_file(UPLOAD_DIRECTORY + "/" + safe_filename)
    except Exception as e:
        raise FileUploadException(str(e))
    finally:
        await file.close()

    return UploadResponse(
        filename=safe_filename,
        content_type=file.content_type,
        file_url=file_url,
    )


@router.post("/generate-mcq/", response_model=MCQGenerationResponse)
async def generate_mcq_questions(
    file_url: str,
    num_questions: int = Query(
        3, ge=1, le=10, description="Number of questions to generate per page"
    ),
):
    """
    Generate MCQ questions from an existing file URL.

    Args:
        file_url: The URL of the existing document file to extract text from and generate questions
        num_questions: Number of questions to generate per page (1-10)

    Returns:
        MCQGenerationResponse: JSON response with MCQ questions
    """
    # Extract filename from the URL
    filename = file_url.split("/")[-1]

    # Validate the file extension
    file_extension = os.path.splitext(filename)[1].lower()
    if file_extension not in ALLOWED_EXTENSIONS:
        raise FileValidationException(
            f"File extension '{file_extension}' is not allowed. Allowed extensions are: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Construct the full file path
    file_location = os.path.join(UPLOAD_DIRECTORY, filename)

    try:
        # Check if the file exists
        if not os.path.exists(file_location):
            raise FileValidationException(f"File not found: {file_location}")

        # Extract text from the existing file
        pages_text = extract_text_from_file(file_location)

        # Generate MCQ questions from the extracted text
        questions = await generate_mcq_questions_from_pages(
            pages_text, num_questions_per_page=num_questions
        )

    except Exception as e:
        raise LLMProcessingException(f"Error generating MCQ questions: {str(e)}")

    return MCQGenerationResponse(
        filename=filename,
        page_count=len(pages_text),
        questions=questions,
        message=f"MCQ questions generated successfully from {len(pages_text)} pages",
    )
