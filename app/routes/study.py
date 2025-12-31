import asyncio
import logging
import os
import threading
from typing import List
from urllib.parse import unquote

from fastapi import APIRouter, Depends, File, Request, UploadFile, status
from sqlalchemy.orm import Session

from app.constants.file_types import ALLOWED_EXTENSIONS, ALLOWED_MIME_TYPES
from app.constants.paths import UPLOAD_DIRECTORY
from app.database.config import get_db
from app.database.models import MCQQuestion as DBMCQQuestion
from app.database.models import StudyDocument
from app.exceptions.custom_exceptions import (
    FileUploadException,
    FileValidationException,
    LLMProcessingException,
)
from app.schemas.study import (
    MCQGenerationResponse,
    MCQQuestion,
    MCQRequest,
    UploadResponse,
    AnswerValidationRequest,
    AnswerValidationResponse,
    FlashcardResponse,
    FlashcardGenerationResponse,
)
from app.services.extraction_service import extract_text_from_file
from app.services.llm_service import (
    generate_mcq_questions_from_pages,
    generate_flashcards_from_pages,
)
from app.auth.auth import current_active_user
from app.database.models import User

logger = logging.getLogger(__name__)

router = APIRouter(dependencies=[Depends(current_active_user)])


@router.post(
    "/uploadfile/",
    response_model=UploadResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_upload_file(
    file: UploadFile = File(...),
    request: Request = Request,
    db: Session = Depends(get_db),
    user: User = Depends(current_active_user),
):
    logger.info(f"POST /uploadfile/ - user_id: {user.id}, filename: {file.filename}")

    # 1. Validate the file extension
    if not file.filename:
        logger.warning(f"POST /uploadfile/ - No file provided for user_id: {user.id}")
        raise FileValidationException("No file provided or filename is missing.")

    file_extension = os.path.splitext(file.filename)[1].lower()
    if file_extension not in ALLOWED_EXTENSIONS:
        logger.warning(
            f"POST /uploadfile/ - Invalid extension '{file_extension}' for user_id: {user.id}"
        )
        raise FileValidationException(
            f"File extension '{file_extension}' is not allowed. Allowed extensions are: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # 2. Validate the MIME type
    if file.content_type not in ALLOWED_MIME_TYPES:
        logger.warning(
            f"POST /uploadfile/ - Invalid MIME type '{file.content_type}' for user_id: {user.id}"
        )
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
        file_url = f"{request.base_url}api/v1/files/{safe_filename}"
        pages_text = extract_text_from_file(UPLOAD_DIRECTORY + "/" + safe_filename)
        page_count = len(pages_text) if pages_text else 0

        # Create a new study document record in the database
        db_document = StudyDocument(
            filename=safe_filename,
            content_type=file.content_type,
            file_path=file_location,
            file_url=file_url,
            page_count=page_count,
            user_id=user.id,
        )
        db.add(db_document)
        db.commit()
        db.refresh(db_document)

        logger.info(
            f"POST /uploadfile/ - Successfully uploaded file '{safe_filename}' (id: {db_document.id}, pages: {page_count}) for user_id: {user.id}"
        )

    except Exception as e:
        db.rollback()
        logger.error(
            f"POST /uploadfile/ - Upload failed for user_id: {user.id}, error: {str(e)}"
        )
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
    request: MCQRequest,
    db: Session = Depends(get_db),
    user: User = Depends(current_active_user),
):
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
    logger.info(
        f"POST /generate-mcq/ - user_id: {user.id}, filename: {filename}, num_questions: {request.num_questions}"
    )

    # Validate the file extension
    file_extension = os.path.splitext(filename)[1].lower()
    if file_extension not in ALLOWED_EXTENSIONS:
        logger.warning(
            f"POST /generate-mcq/ - Invalid extension '{file_extension}' for user_id: {user.id}"
        )
        raise FileValidationException(
            f"File extension '{file_extension}' is not allowed. Allowed extensions are: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Construct the full file path
    file_location = os.path.join(UPLOAD_DIRECTORY, filename)

    try:
        # Check if the file exists
        if not os.path.exists(file_location):
            logger.warning(f"POST /generate-mcq/ - File not found: {file_location}")
            raise FileValidationException(f"File not found: {file_location}")

        # Extract text from the existing file
        pages_text = extract_text_from_file(file_location)

        # Get the document from the database based on the filename and user
        db_document = (
            db.query(StudyDocument)
            .filter(
                StudyDocument.filename == filename, StudyDocument.user_id == user.id
            )
            .first()
        )
        if not db_document:
            logger.warning(
                f"POST /generate-mcq/ - Document not found in DB: {filename} for user_id: {user.id}"
            )
            raise FileValidationException(
                f"Document not found or access denied: {filename}"
            )

        # Process first page and return results immediately
        first_page_questions = []
        if pages_text:
            first_page_text = pages_text[0]
            if first_page_text.strip():
                logger.info(
                    f"POST /generate-mcq/ - Generating questions for first page of {filename}"
                )
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
                logger.info(
                    f"POST /generate-mcq/ - Generated {len(first_page_questions)} questions for first page of {filename}"
                )

        # Process remaining pages in the background if there are more than one page
        if len(pages_text) > 1:
            logger.info(
                f"POST /generate-mcq/ - Starting background processing for {len(pages_text) - 1} remaining pages"
            )
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
                        logger.warning(
                            f"Background MCQ - Document {filename} not found in background session"
                        )
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
                        logger.info(
                            f"Background MCQ - Generated questions for page {page_idx} of {filename}"
                        )

                    logger.info(
                        f"Background MCQ - Completed processing all pages for {filename}"
                    )
                except Exception as e:
                    logger.error(
                        f"Background MCQ - Error processing remaining pages for {filename}: {str(e)}"
                    )
                    background_db.rollback()
                finally:
                    background_db.close()

            # Start the background thread
            thread = threading.Thread(target=process_remaining_pages)
            thread.start()

    except Exception as e:
        db.rollback()
        logger.error(
            f"POST /generate-mcq/ - Error generating MCQ for {filename}: {str(e)}"
        )
        raise LLMProcessingException(f"Error generating MCQ questions: {str(e)}")

    return MCQGenerationResponse(
        filename=filename,
        page_count=len(pages_text),
        questions=first_page_questions,
        message="MCQ questions generated for first page. Remaining pages will be processed in the background.",
    )


@router.get("/mcq-questions/{document_filename}", response_model=List[MCQQuestion])
async def get_mcq_questions(
    document_filename: str,
    db: Session = Depends(get_db),
    user: User = Depends(current_active_user),
):
    """
    Retrieve all MCQ questions for a specific document.

    Args:
        document_filename: The filename of the document to retrieve questions for
        db: Database session

    Returns:
        List of MCQQuestion objects
    """
    logger.info(f"GET /mcq-questions/{document_filename} - user_id: {user.id}")

    # Get the document from the database based on the filename and user
    db_document = (
        db.query(StudyDocument)
        .filter(
            StudyDocument.filename == document_filename,
            StudyDocument.user_id == user.id,
        )
        .first()
    )
    if not db_document:
        logger.warning(
            f"GET /mcq-questions/{document_filename} - Document not found for user_id: {user.id}"
        )
        raise FileValidationException(
            f"Document not found or access denied: {document_filename}"
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
        except Exception as e:
            logger.warning(
                f"GET /mcq-questions/{document_filename} - Error parsing choices JSON for question_id {db_question.id}: {str(e)}"
            )
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

    logger.info(
        f"GET /mcq-questions/{document_filename} - Returning {len(questions)} questions"
    )
    return questions


@router.post("/validate-answer/", response_model=AnswerValidationResponse)
async def validate_answer(
    request: AnswerValidationRequest,
    db: Session = Depends(get_db),
    user: User = Depends(current_active_user),
):
    """
    Validate a user's answer for a specific question.

    Args:
        request: Contains question_id and user_answer
        db: Database session

    Returns:
        AnswerValidationResponse with correctness and explanation
    """
    logger.info(
        f"POST /validate-answer/ - user_id: {user.id}, question_id: {request.question_id}, selected: {request.selected_choice}"
    )

    # Get the question and verify ownership via document
    db_question = (
        db.query(DBMCQQuestion)
        .join(StudyDocument)
        .filter(
            DBMCQQuestion.id == request.question_id, StudyDocument.user_id == user.id
        )
        .first()
    )
    if not db_question:
        logger.warning(
            f"POST /validate-answer/ - Question not found: {request.question_id} for user_id: {user.id}"
        )
        raise FileValidationException(
            f"Question not found or access denied: {request.question_id}"
        )

    # Check if the user's answer is correct
    is_correct = db_question.correct_answer == request.selected_choice

    # Parse the choices from JSON strings back to proper format
    import json
    from app.schemas.study import MCQChoice

    try:
        choices_json = json.loads(db_question.choices.replace("'", '"'))
        choices = [
            MCQChoice(id=choice["id"], text=choice["text"]) for choice in choices_json
        ]
    except Exception as e:
        logger.warning(
            f"POST /validate-answer/ - Error parsing choices JSON for question_id {db_question.id}: {str(e)}"
        )
        # If parsing fails, create empty choices
        choices = []

    logger.info(
        f"POST /validate-answer/ - question_id: {request.question_id}, is_correct: {is_correct}"
    )
    return AnswerValidationResponse(
        question_id=db_question.id,
        is_correct=is_correct,
        correct_answer=db_question.correct_answer,
        explanation=db_question.explanation,
        choices=choices,
        question=db_question.question,
    )


@router.get(
    "/mcq-questions/{document_filename}/{question_index}", response_model=MCQQuestion
)
async def get_specific_mcq_question(
    document_filename: str,
    question_index: int,
    db: Session = Depends(get_db),
    user: User = Depends(current_active_user),
):
    """
    Retrieve a specific MCQ question for a document by index.

    Args:
        document_filename: The filename of the document to retrieve questions for
        question_index: The zero-based index of the question to retrieve
        db: Database session

    Returns:
        A single MCQQuestion object at the specified index
    """
    logger.info(
        f"GET /mcq-questions/{document_filename}/{question_index} - user_id: {user.id}"
    )

    # Get the document from the database based on the filename and user
    db_document = (
        db.query(StudyDocument)
        .filter(
            StudyDocument.filename == document_filename,
            StudyDocument.user_id == user.id,
        )
        .first()
    )
    if not db_document:
        logger.warning(
            f"GET /mcq-questions/{document_filename}/{question_index} - Document not found for user_id: {user.id}"
        )
        raise FileValidationException(
            f"Document not found or access denied: {document_filename}"
        )

    # Retrieve MCQ questions for this document ordered by id
    db_questions = (
        db.query(DBMCQQuestion)
        .filter(DBMCQQuestion.document_id == db_document.id)
        .order_by(DBMCQQuestion.id)
        .all()
    )

    # Check if the index is valid
    if question_index < 0 or question_index >= len(db_questions):
        logger.warning(
            f"GET /mcq-questions/{document_filename}/{question_index} - Index out of range (total: {len(db_questions)})"
        )
        raise FileValidationException(
            f"Question index {question_index} is out of range. Available range: 0 to {len(db_questions) - 1}"
        )

    db_question = db_questions[question_index]

    # Parse the choices from JSON strings back to proper format
    import json
    from app.schemas.study import MCQChoice

    try:
        choices_json = json.loads(db_question.choices.replace("'", '"'))
        choices = [
            MCQChoice(id=choice["id"], text=choice["text"]) for choice in choices_json
        ]
    except Exception as e:
        logger.warning(
            f"GET /mcq-questions/{document_filename}/{question_index} - Error parsing choices JSON: {str(e)}"
        )
        # If parsing fails, create empty choices
        choices = []

    # Create MCQQuestion object with parsed data
    question = MCQQuestion(
        id=db_question.id,
        question=db_question.question,
        choices=choices,
        correct_answer=db_question.correct_answer,
        explanation=db_question.explanation,
        page_number=db_question.page_number,
    )

    logger.info(
        f"GET /mcq-questions/{document_filename}/{question_index} - Returning question_id: {db_question.id}"
    )
    return question


@router.get("/mcq-question-count/{document_filename}", response_model=int)
async def get_mcq_question_count(
    document_filename: str,
    db: Session = Depends(get_db),
    user: User = Depends(current_active_user),
):
    """
    Retrieve the total count of MCQ questions for a specific document.

    Args:
        document_filename: The filename of the document to count questions for
        db: Database session

    Returns:
        The total number of questions for the specified document
    """
    logger.info(f"GET /mcq-question-count/{document_filename} - user_id: {user.id}")

    # Get the document from the database based on the filename and user
    db_document = (
        db.query(StudyDocument)
        .filter(
            StudyDocument.filename == document_filename,
            StudyDocument.user_id == user.id,
        )
        .first()
    )
    if not db_document:
        logger.warning(
            f"GET /mcq-question-count/{document_filename} - Document not found for user_id: {user.id}"
        )
        raise FileValidationException(
            f"Document not found or access denied: {document_filename}"
        )

    # Count MCQ questions for this document
    question_count = (
        db.query(DBMCQQuestion)
        .filter(DBMCQQuestion.document_id == db_document.id)
        .count()
    )

    logger.info(
        f"GET /mcq-question-count/{document_filename} - count: {question_count}"
    )
    return question_count


from fastapi.responses import FileResponse


@router.get("/files/{filename}")
async def get_file(
    filename: str,
    user: User = Depends(current_active_user),
    db: Session = Depends(get_db),
):
    """
    Serve uploaded files securely, ensuring the user owns the file.
    """
    logger.info(f"GET /files/{filename} - user_id: {user.id}")

    # Verify ownership
    db_document = (
        db.query(StudyDocument)
        .filter(StudyDocument.filename == filename, StudyDocument.user_id == user.id)
        .first()
    )
    if not db_document:
        logger.warning(
            f"GET /files/{filename} - File not found or access denied for user_id: {user.id}"
        )
        raise FileValidationException("File not found or access denied")

    file_path = os.path.join(UPLOAD_DIRECTORY, filename)
    if not os.path.exists(file_path):
        logger.error(f"GET /files/{filename} - File not found on disk: {file_path}")
        raise FileValidationException("File not found on disk")

    logger.info(f"GET /files/{filename} - Serving file for user_id: {user.id}")
    return FileResponse(file_path)


@router.get("/documents", response_model=List[dict])
async def get_documents(
    db: Session = Depends(get_db), user: User = Depends(current_active_user)
):
    """
    Get all documents uploaded by the current user.

    Returns a list of documents with their metadata including
    question count and flashcard count.
    """
    logger.info(f"GET /documents - user_id: {user.id}")

    from app.database.models import Flashcard

    # Get all documents for this user
    documents = (
        db.query(StudyDocument)
        .filter(StudyDocument.user_id == user.id, StudyDocument.is_active == True)
        .order_by(StudyDocument.created_at.desc())
        .all()
    )

    result = []
    for doc in documents:
        # Count questions for this document
        questions_count = (
            db.query(DBMCQQuestion).filter(DBMCQQuestion.document_id == doc.id).count()
        )

        # Count flashcards for this document
        flashcards_count = (
            db.query(Flashcard).filter(Flashcard.document_id == doc.id).count()
        )

        result.append(
            {
                "id": doc.id,
                "filename": doc.filename,
                "created_at": doc.created_at.isoformat() if doc.created_at else None,
                "summary": doc.summary,
                "key_concepts": doc.key_concepts,
                "questions_count": questions_count,
                "flashcards_count": flashcards_count,
            }
        )

    logger.info(
        f"GET /documents - Returning {len(result)} documents for user_id: {user.id}"
    )
    return result


@router.post(
    "/generate-flashcards/{filename}", response_model=FlashcardGenerationResponse
)
async def generate_flashcards(
    filename: str,
    db: Session = Depends(get_db),
    user: User = Depends(current_active_user),
):
    """
    Generate flashcards from a document.

    If flashcards already exist for this document, returns the existing ones.
    Otherwise, generates new flashcards using AI and stores them in the database.
    """
    logger.info(f"POST /generate-flashcards/{filename} - user_id: {user.id}")

    from app.database.models import Flashcard

    # Get the document from the database
    db_document = (
        db.query(StudyDocument)
        .filter(StudyDocument.filename == filename, StudyDocument.user_id == user.id)
        .first()
    )
    if not db_document:
        logger.warning(
            f"POST /generate-flashcards/{filename} - Document not found for user_id: {user.id}"
        )
        raise FileValidationException(
            f"Document not found or access denied: {filename}"
        )

    # Check if flashcards already exist for this document
    existing_flashcards = (
        db.query(Flashcard).filter(Flashcard.document_id == db_document.id).all()
    )

    if existing_flashcards:
        logger.info(
            f"POST /generate-flashcards/{filename} - Returning {len(existing_flashcards)} cached flashcards"
        )
        # Return existing flashcards
        flashcard_responses = [
            FlashcardResponse(
                id=card.id,
                front=card.front,
                back=card.back,
                explanation=card.explanation or "",
            )
            for card in existing_flashcards
        ]
        return FlashcardGenerationResponse(
            filename=filename,
            flashcards=flashcard_responses,
            message="Flashcards retrieved from cache",
        )

    # Generate new flashcards
    file_location = os.path.join(UPLOAD_DIRECTORY, filename)

    if not os.path.exists(file_location):
        logger.error(f"POST /generate-flashcards/{filename} - File not found on disk")
        raise FileValidationException(f"File not found on disk: {filename}")

    try:
        # Extract text from the file
        pages_text = extract_text_from_file(file_location)

        if not pages_text:
            logger.warning(
                f"POST /generate-flashcards/{filename} - No text extracted from document"
            )
            raise LLMProcessingException("No text could be extracted from the document")

        logger.info(
            f"POST /generate-flashcards/{filename} - Generating flashcards from {len(pages_text)} pages"
        )
        # Generate flashcards using AI
        generated_flashcards = await generate_flashcards_from_pages(
            pages_text, num_cards_per_page=5
        )

        if not generated_flashcards:
            logger.warning(
                f"POST /generate-flashcards/{filename} - AI could not generate flashcards"
            )
            raise LLMProcessingException(
                "Could not generate flashcards from the document"
            )

        # Store flashcards in database
        flashcard_responses = []
        for idx, card_data in enumerate(generated_flashcards):
            db_flashcard = Flashcard(
                document_id=db_document.id,
                front=card_data["front"],
                back=card_data["back"],
                explanation=card_data.get("explanation", ""),
            )
            db.add(db_flashcard)
            db.flush()  # Get the ID

            flashcard_responses.append(
                FlashcardResponse(
                    id=db_flashcard.id,
                    front=db_flashcard.front,
                    back=db_flashcard.back,
                    explanation=db_flashcard.explanation or "",
                )
            )

        db.commit()

        logger.info(
            f"POST /generate-flashcards/{filename} - Generated {len(flashcard_responses)} flashcards successfully"
        )
        return FlashcardGenerationResponse(
            filename=filename,
            flashcards=flashcard_responses,
            message=f"Generated {len(flashcard_responses)} flashcards successfully",
        )

    except Exception as e:
        db.rollback()
        logger.error(f"POST /generate-flashcards/{filename} - Error: {str(e)}")
        raise LLMProcessingException(f"Error generating flashcards: {str(e)}")
