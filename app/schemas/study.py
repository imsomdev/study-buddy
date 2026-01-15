from typing import List

from pydantic import BaseModel


class UploadResponse(BaseModel):
    """
    Schema for the response returned after a successful file upload.
    """

    filename: str
    content_type: str
    message: str = "File uploaded successfully"


class TextExtractionResponse(BaseModel):
    """
    Schema for the response returned after text extraction from a file.
    """

    filename: str
    page_count: int
    pages_text: List[str]
    message: str = "Text extracted successfully"


class ProcessedTextResponse(BaseModel):
    """
    Schema for the response returned after processing text with LLM.
    """

    filename: str
    page_count: int
    processed_pages: List[str]
    processing_type: str
    message: str = "Text processed successfully"


class MCQChoice(BaseModel):
    """
    Schema for a multiple choice question option.
    """

    id: str
    text: str


class MCQQuestion(BaseModel):
    """
    Schema for a multiple choice question with answers.
    """

    id: int
    question: str
    choices: List[MCQChoice]
    correct_answer: str  # ID of the correct choice
    explanation: str = ""
    page_number: int = None


class MCQGenerationResponse(BaseModel):
    """
    Schema for the response returned after generating MCQ questions from text.
    """

    filename: str
    page_count: int
    questions: List[MCQQuestion]
    message: str = "MCQ questions generated successfully"


class MCQRequest(BaseModel):
    file_url: str
    num_questions: int = 3  # Default value, optional


class AnswerValidationRequest(BaseModel):
    """
    Schema for validating a user's answer to a question.
    """

    question_id: int
    selected_choice: str


class AnswerValidationResponse(BaseModel):
    """
    Schema for the response returned after validating a user's answer.
    """

    question_id: int
    is_correct: bool
    correct_answer: str
    explanation: str = ""
    choices: List[MCQChoice]
    question: str


class DocumentResponse(BaseModel):
    """
    Schema for document information in the documents list.
    """

    id: int
    filename: str
    created_at: str
    summary: str | None = None
    key_concepts: str | None = None
    questions_count: int = 0
    flashcards_count: int = 0

    class Config:
        from_attributes = True


class FlashcardResponse(BaseModel):
    """
    Schema for a single flashcard.
    """

    id: int
    front: str
    back: str
    explanation: str = ""


class FlashcardGenerationResponse(BaseModel):
    """
    Schema for the response returned after generating flashcards.
    """

    filename: str
    flashcards: List[FlashcardResponse]
    message: str = "Flashcards generated successfully"
