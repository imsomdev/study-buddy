import os
from urllib.parse import unquote
from typing import List

from fastapi import APIRouter, File, Query, Request, UploadFile, status, Depends
from sqlalchemy.orm import Session

from app.constants.file_types import ALLOWED_EXTENSIONS, ALLOWED_MIME_TYPES
from app.constants.paths import UPLOAD_DIRECTORY
from app.database.config import get_db
from app.exceptions.custom_exceptions import (
    FileUploadException,
    FileValidationException,
    LLMProcessingException,
)
from app.schemas.study import (
    MCQGenerationResponse,
    MCQRequest,
    UploadResponse,
    MCQQuestion,
)
from app.services.extraction_service import extract_text_from_file
from app.services.llm_service import (
    generate_mcq_questions_from_pages,
)
from app.database.models import StudyDocument, MCQQuestion as DBMCQQuestion

router = APIRouter()


@router.post(
    "/uploadfile/",
    response_model=UploadResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_upload_file(
    file: UploadFile = File(...),
    request: Request = Request,
    db: Session = Depends(get_db),
):
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
        pages_text = extract_text_from_file(UPLOAD_DIRECTORY + "/" + safe_filename)
        page_count = len(pages_text) if pages_text else 0

        # Create a new study document record in the database
        db_document = StudyDocument(
            filename=safe_filename,
            content_type=file.content_type,
            file_path=file_location,
            file_url=file_url,
            page_count=page_count,
        )
        db.add(db_document)
        db.commit()
        db.refresh(db_document)

    except Exception as e:
        db.rollback()
        raise FileUploadException(str(e))
    finally:
        await file.close()

    return UploadResponse(
        filename=safe_filename,
        content_type=file.content_type,
        file_url=file_url,
    )


import asyncio
from typing import List
import threading


@router.post("/generate-mcq/", response_model=MCQGenerationResponse)
async def generate_mcq_questions(request: MCQRequest, db: Session = Depends(get_db)):
    """
    Generate MCQ questions from an existing file URL.
    Returns questions from the first page immediately, then continues processing remaining pages in the background.

    Args:
        file_url: The URL of the existing document file to extract text from and generate questions
        num_questions: Number of questions to generate per page (1-10)

    Returns:
        MCQGenerationResponse: JSON response with MCQ questions from the first page
    """
    # Extract filename from the URL
    filename = unquote(request.file_url.split("/")[-1])

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

        # Get the document from the database based on the filename
        db_document = (
            db.query(StudyDocument).filter(StudyDocument.filename == filename).first()
        )
        if not db_document:
            raise FileValidationException(f"Document not found in database: {filename}")

        # Process first page and return results immediately
        first_page_questions = []
        if pages_text:
            first_page_text = pages_text[0]
            if first_page_text.strip():
                # Generate questions for the first page
                page_questions = await generate_mcq_questions_from_pages(
                    [first_page_text], num_questions_per_page=request.num_questions
                )

                # Store the generated questions for the first page in the database
                for question in page_questions:
                    db_question = DBMCQQuestion(  # Use the database model
                        document_id=db_document.id,
                        question=question.question,
                        choices=str(
                            [
                                {"id": choice.id, "text": choice.text}
                                for choice in question.choices
                            ]
                        ),  # Store as JSON string
                        correct_answer=question.correct_answer,
                        explanation=question.explanation,
                        page_number=1,  # First page
                    )
                    db.add(db_question)
                    first_page_questions.append(question)

                # Commit after first page to ensure it's saved
                db.commit()

        # Process remaining pages in the background if there are more than one page
        if len(pages_text) > 1:
            # Create a background task to process remaining pages
            remaining_pages = pages_text[
                1:
            ]  # Skip the first page since it's already processed

            # Use a separate thread for the background processing
            def process_remaining_pages():
                # Create a new database session for the background task
                from app.database.config import SessionLocal

                background_db = SessionLocal()
                try:
                    # Re-query the document in the background session to get a fresh instance
                    background_document = (
                        background_db.query(StudyDocument)
                        .filter(StudyDocument.filename == filename)
                        .first()
                    )
                    
                    if not background_document:
                        print(f"Document {filename} not found in background session")
                        return

                    for page_idx, page_text in enumerate(
                        remaining_pages, start=2
                    ):  # Start from page 2
                        if not page_text.strip():
                            continue

                        # Generate questions for this specific page
                        page_questions = asyncio.run(
                            generate_mcq_questions_from_pages(
                                [page_text],
                                num_questions_per_page=request.num_questions,
                            )
                        )

                        # Store the generated questions for this page in the database
                        for question in page_questions:
                            db_question = DBMCQQuestion(  # Use the database model
                                document_id=background_document.id,
                                question=question.question,
                                choices=str(
                                    [
                                        {"id": choice.id, "text": choice.text}
                                        for choice in question.choices
                                    ]
                                ),  # Store as JSON string
                                correct_answer=question.correct_answer,
                                explanation=question.explanation,
                                page_number=page_idx,  # Actual page number
                            )
                            background_db.add(db_question)

                        # Commit after each page to ensure data is stored
                        background_db.commit()
                except Exception as e:
                    print(f"Error processing remaining pages in background: {str(e)}")
                    background_db.rollback()
                finally:
                    background_db.close()

            # Start the background thread
            thread = threading.Thread(target=process_remaining_pages)
            thread.start()

    except Exception as e:
        db.rollback()
        raise LLMProcessingException(f"Error generating MCQ questions: {str(e)}")

    return MCQGenerationResponse(
        filename=filename,
        page_count=len(pages_text),
        questions=first_page_questions,
        message="MCQ questions generated for first page. Remaining pages will be processed in the background.",
    )


@router.get("/mcq-questions/{document_filename}", response_model=List[MCQQuestion])
async def get_mcq_questions(document_filename: str, db: Session = Depends(get_db)):
    """
    Retrieve all MCQ questions for a specific document.

    Args:
        document_filename: The filename of the document to retrieve questions for
        db: Database session

    Returns:
        List of MCQQuestion objects
    """
    # Get the document from the database based on the filename
    db_document = (
        db.query(StudyDocument)
        .filter(StudyDocument.filename == document_filename)
        .first()
    )
    if not db_document:
        raise FileValidationException(
            f"Document not found in database: {document_filename}"
        )

    # Retrieve all MCQ questions for this document
    db_questions = (
        db.query(DBMCQQuestion)
        .filter(DBMCQQuestion.document_id == db_document.id)
        .order_by(DBMCQQuestion.page_number, DBMCQQuestion.id)
        .all()
    )

    # Parse the choices from JSON strings back to proper format
    questions = []
    for db_question in db_questions:
        # Parse the choices JSON string
        import json
        from app.schemas.study import MCQChoice

        try:
            choices_json = json.loads(db_question.choices.replace("'", '"'))
            choices = [
                MCQChoice(id=choice["id"], text=choice["text"])
                for choice in choices_json
            ]
        except:
            # If parsing fails, create empty choices
            choices = []

        # Create MCQQuestion object with parsed data
        question = MCQQuestion(
            id=db_question.id,
            question=db_question.question,
            choices=choices,
            correct_answer=db_question.correct_answer,
            explanation=db_question.explanation,
        )
        questions.append(question)

    return questions
