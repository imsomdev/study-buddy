from pydantic import BaseModel
from typing import List


class UploadResponse(BaseModel):
    """
    Schema for the response returned after a successful file upload.
    """

    filename: str
    content_type: str
    file_url: str
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
