import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database.config import get_db
from app.database.models import (
    UserProgress,
    StudyDocument,
    MCQQuestion as DBMCQQuestion,
    User,
)
from app.schemas.progress import (
    ProgressRecordRequest,
    ProgressRecordResponse,
    DocumentProgressResponse,
    OverallStatsResponse,
    QuestionProgressItem,
    QuestionHistoryResponse,
)
from app.auth.auth import current_active_user

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/progress", tags=["progress"], dependencies=[Depends(current_active_user)]
)


@router.post(
    "/record",
    response_model=ProgressRecordResponse,
    status_code=status.HTTP_201_CREATED,
)
async def record_progress(
    request: ProgressRecordRequest,
    db: Session = Depends(get_db),
    user: User = Depends(current_active_user),
):
    """
    Record a user's answer to a MCQ question.

    This endpoint saves the user's response including whether they got it correct.
    Multiple attempts for the same question are allowed and tracked.
    """
    logger.info(
        f"POST /progress/record - user_id: {user.id}, question_id: {request.question_id}, document_id: {request.document_id}"
    )

    # Verify the document belongs to the user
    db_document = (
        db.query(StudyDocument)
        .filter(
            StudyDocument.id == request.document_id, StudyDocument.user_id == user.id
        )
        .first()
    )
    if not db_document:
        logger.warning(
            f"POST /progress/record - Document not found: {request.document_id} for user_id: {user.id}"
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document not found or access denied: {request.document_id}",
        )

    # Verify the question belongs to the document
    db_question = (
        db.query(DBMCQQuestion)
        .filter(
            DBMCQQuestion.id == request.question_id,
            DBMCQQuestion.document_id == request.document_id,
        )
        .first()
    )
    if not db_question:
        logger.warning(
            f"POST /progress/record - Question not found: {request.question_id} for document_id: {request.document_id}"
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Question not found or doesn't belong to document: {request.question_id}",
        )

    # Create progress record
    progress = UserProgress(
        user_id=user.id,
        document_id=request.document_id,
        question_id=request.question_id,
        is_correct=request.is_correct,
        selected_choice=request.selected_choice,
    )

    db.add(progress)
    db.commit()
    db.refresh(progress)

    logger.info(
        f"POST /progress/record - Recorded progress_id: {progress.id}, is_correct: {request.is_correct}"
    )
    return ProgressRecordResponse(
        id=progress.id,
        user_id=progress.user_id,
        document_id=progress.document_id,
        question_id=progress.question_id,
        is_correct=progress.is_correct,
        selected_choice=progress.selected_choice,
        timestamp=progress.timestamp,
    )


@router.get("/document/{document_id}", response_model=DocumentProgressResponse)
async def get_document_progress(
    document_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(current_active_user),
):
    """
    Get user's progress for a specific document.

    Returns statistics including total questions, attempted, correct, and accuracy.
    """
    logger.info(f"GET /progress/document/{document_id} - user_id: {user.id}")

    # Verify the document belongs to the user
    db_document = (
        db.query(StudyDocument)
        .filter(StudyDocument.id == document_id, StudyDocument.user_id == user.id)
        .first()
    )
    if not db_document:
        logger.warning(
            f"GET /progress/document/{document_id} - Document not found for user_id: {user.id}"
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document not found or access denied: {document_id}",
        )

    # Get total questions for this document
    total_questions = (
        db.query(DBMCQQuestion).filter(DBMCQQuestion.document_id == document_id).count()
    )

    # Get unique questions attempted by the user
    questions_attempted = (
        db.query(func.count(func.distinct(UserProgress.question_id)))
        .filter(
            UserProgress.user_id == user.id, UserProgress.document_id == document_id
        )
        .scalar()
    )

    # Get counts of correct answers (latest attempt per question)
    # Using a subquery to get the latest attempt for each question
    latest_attempts_subquery = (
        db.query(UserProgress.question_id, func.max(UserProgress.id).label("latest_id"))
        .filter(
            UserProgress.user_id == user.id, UserProgress.document_id == document_id
        )
        .group_by(UserProgress.question_id)
        .subquery()
    )

    correct_count = (
        db.query(func.count(UserProgress.id))
        .join(
            latest_attempts_subquery,
            UserProgress.id == latest_attempts_subquery.c.latest_id,
        )
        .filter(UserProgress.is_correct)
        .scalar()
    )

    incorrect_count = questions_attempted - correct_count if questions_attempted else 0
    accuracy = (
        (correct_count / questions_attempted * 100) if questions_attempted > 0 else 0.0
    )

    # Get last attempt timestamp
    last_attempt = (
        db.query(func.max(UserProgress.timestamp))
        .filter(
            UserProgress.user_id == user.id, UserProgress.document_id == document_id
        )
        .scalar()
    )

    logger.info(
        f"GET /progress/document/{document_id} - Returning stats: attempted={questions_attempted}, correct={correct_count}, accuracy={round(accuracy, 2)}%"
    )
    return DocumentProgressResponse(
        document_id=document_id,
        document_filename=db_document.filename,
        total_questions=total_questions,
        questions_attempted=questions_attempted,
        questions_correct=correct_count,
        questions_incorrect=incorrect_count,
        accuracy_percentage=round(accuracy, 2),
        last_attempt=last_attempt,
    )


@router.get("/stats", response_model=OverallStatsResponse)
async def get_overall_stats(
    db: Session = Depends(get_db), user: User = Depends(current_active_user)
):
    """
    Get user's overall statistics across all documents.

    Returns aggregate statistics and per-document breakdown.
    """
    logger.info(f"GET /progress/stats - user_id: {user.id}")

    # Get all documents studied by this user
    documents_with_progress = (
        db.query(StudyDocument).filter(StudyDocument.user_id == user.id).all()
    )

    documents_progress = []
    total_questions_attempted = 0
    total_correct = 0
    total_incorrect = 0

    for doc in documents_with_progress:
        # Get total questions for this document
        total_questions = (
            db.query(DBMCQQuestion).filter(DBMCQQuestion.document_id == doc.id).count()
        )

        # Get unique questions attempted by the user
        questions_attempted = (
            db.query(func.count(func.distinct(UserProgress.question_id)))
            .filter(UserProgress.user_id == user.id, UserProgress.document_id == doc.id)
            .scalar()
        )

        if questions_attempted == 0:
            continue  # Skip documents with no progress

        # Get latest attempt results per question
        latest_attempts_subquery = (
            db.query(
                UserProgress.question_id, func.max(UserProgress.id).label("latest_id")
            )
            .filter(UserProgress.user_id == user.id, UserProgress.document_id == doc.id)
            .group_by(UserProgress.question_id)
            .subquery()
        )

        correct_count = (
            db.query(func.count(UserProgress.id))
            .join(
                latest_attempts_subquery,
                UserProgress.id == latest_attempts_subquery.c.latest_id,
            )
            .filter(UserProgress.is_correct)
            .scalar()
        )

        incorrect_count = (
            questions_attempted - correct_count if questions_attempted else 0
        )
        accuracy = (
            (correct_count / questions_attempted * 100)
            if questions_attempted > 0
            else 0.0
        )

        # Get last attempt timestamp
        last_attempt = (
            db.query(func.max(UserProgress.timestamp))
            .filter(UserProgress.user_id == user.id, UserProgress.document_id == doc.id)
            .scalar()
        )

        doc_progress = DocumentProgressResponse(
            document_id=doc.id,
            document_filename=doc.filename,
            total_questions=total_questions,
            questions_attempted=questions_attempted,
            questions_correct=correct_count,
            questions_incorrect=incorrect_count,
            accuracy_percentage=round(accuracy, 2),
            last_attempt=last_attempt,
        )
        documents_progress.append(doc_progress)

        total_questions_attempted += questions_attempted
        total_correct += correct_count
        total_incorrect += incorrect_count

    overall_accuracy = (
        (total_correct / total_questions_attempted * 100)
        if total_questions_attempted > 0
        else 0.0
    )

    logger.info(
        f"GET /progress/stats - user_id: {user.id}, documents_studied: {len(documents_progress)}, total_attempted: {total_questions_attempted}, overall_accuracy: {round(overall_accuracy, 2)}%"
    )
    return OverallStatsResponse(
        total_documents_studied=len(documents_progress),
        total_questions_attempted=total_questions_attempted,
        total_correct=total_correct,
        total_incorrect=total_incorrect,
        overall_accuracy=round(overall_accuracy, 2),
        documents_progress=documents_progress,
    )


@router.get("/question/{question_id}", response_model=QuestionHistoryResponse)
async def get_question_history(
    question_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(current_active_user),
):
    """
    Get the history of all attempts for a specific question.

    Returns all attempts made by the user on this question.
    """
    logger.info(f"GET /progress/question/{question_id} - user_id: {user.id}")

    # Verify the question exists and belongs to user's document
    db_question = (
        db.query(DBMCQQuestion)
        .join(StudyDocument)
        .filter(DBMCQQuestion.id == question_id, StudyDocument.user_id == user.id)
        .first()
    )
    if not db_question:
        logger.warning(
            f"GET /progress/question/{question_id} - Question not found for user_id: {user.id}"
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Question not found or access denied: {question_id}",
        )

    # Get all progress records for this question
    progress_records = (
        db.query(UserProgress)
        .filter(
            UserProgress.user_id == user.id, UserProgress.question_id == question_id
        )
        .order_by(UserProgress.timestamp.desc())
        .all()
    )

    history = [
        QuestionProgressItem(
            id=record.id,
            question_id=record.question_id,
            is_correct=record.is_correct,
            selected_choice=record.selected_choice,
            timestamp=record.timestamp,
        )
        for record in progress_records
    ]

    total_attempts = len(history)
    correct_attempts = sum(1 for h in history if h.is_correct)
    incorrect_attempts = total_attempts - correct_attempts
    accuracy = (correct_attempts / total_attempts * 100) if total_attempts > 0 else 0.0

    logger.info(
        f"GET /progress/question/{question_id} - Returning history: {total_attempts} attempts, accuracy: {round(accuracy, 2)}%"
    )
    return QuestionHistoryResponse(
        question_id=question_id,
        question_text=db_question.question,
        total_attempts=total_attempts,
        correct_attempts=correct_attempts,
        incorrect_attempts=incorrect_attempts,
        accuracy_percentage=round(accuracy, 2),
        history=history,
    )


@router.delete("/document/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def clear_document_progress(
    document_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(current_active_user),
):
    """
    Clear all progress for a specific document.

    This deletes all progress records for the specified document.
    """
    logger.info(f"DELETE /progress/document/{document_id} - user_id: {user.id}")

    # Verify the document belongs to the user
    db_document = (
        db.query(StudyDocument)
        .filter(StudyDocument.id == document_id, StudyDocument.user_id == user.id)
        .first()
    )
    if not db_document:
        logger.warning(
            f"DELETE /progress/document/{document_id} - Document not found for user_id: {user.id}"
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document not found or access denied: {document_id}",
        )

    # Delete all progress for this document
    deleted_count = (
        db.query(UserProgress)
        .filter(
            UserProgress.user_id == user.id, UserProgress.document_id == document_id
        )
        .delete()
    )

    db.commit()

    logger.info(
        f"DELETE /progress/document/{document_id} - Cleared {deleted_count} progress records for user_id: {user.id}"
    )
    return None
