from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class ProgressRecordRequest(BaseModel):
    """
    Schema for recording a user's progress on a question.
    """

    document_id: int
    question_id: int
    selected_choice: str
    is_correct: bool


class ProgressRecordResponse(BaseModel):
    """
    Schema for the response returned after recording progress.
    """

    id: int
    user_id: int
    document_id: int
    question_id: int
    is_correct: bool
    selected_choice: Optional[str] = None
    timestamp: datetime
    message: str = "Progress recorded successfully"

    class Config:
        from_attributes = True


class QuestionProgressItem(BaseModel):
    """
    Schema for individual question progress history.
    """

    id: int
    question_id: int
    is_correct: bool
    selected_choice: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True


class DocumentProgressResponse(BaseModel):
    """
    Schema for user's progress on a specific document.
    """

    document_id: int
    document_filename: str
    total_questions: int
    questions_attempted: int
    questions_correct: int
    questions_incorrect: int
    accuracy_percentage: float
    last_attempt: Optional[datetime] = None


class OverallStatsResponse(BaseModel):
    """
    Schema for user's overall statistics across all documents.
    """

    total_documents_studied: int
    total_questions_attempted: int
    total_correct: int
    total_incorrect: int
    overall_accuracy: float
    documents_progress: List[DocumentProgressResponse]


class QuestionHistoryResponse(BaseModel):
    """
    Schema for the history of attempts on a specific question.
    """

    question_id: int
    question_text: str
    total_attempts: int
    correct_attempts: int
    incorrect_attempts: int
    accuracy_percentage: float
    history: List[QuestionProgressItem]
