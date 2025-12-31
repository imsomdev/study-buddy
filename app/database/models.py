from fastapi_users_db_sqlalchemy import SQLAlchemyBaseUserTable
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database.config import Base


class User(SQLAlchemyBaseUserTable[int], Base):
    """
    Model for storing user information, integrated with FastAPI Users
    """

    __tablename__ = "user"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    documents = relationship("StudyDocument", back_populates="owner")
    progress = relationship(
        "UserProgress", back_populates="user", cascade="all, delete-orphan"
    )


class StudyDocument(Base):
    """
    Model for storing information about uploaded study documents
    """

    __tablename__ = "study_documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True, nullable=False)
    content_type = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_url = Column(String, nullable=False)
    page_count = Column(Integer, nullable=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    is_active = Column(Boolean, default=True)
    summary = Column(Text, nullable=True)  # AI-generated summary of the document
    key_concepts = Column(Text, nullable=True)  # JSON string of key concepts extracted

    # Relationships
    owner = relationship("User", back_populates="documents")
    questions = relationship(
        "MCQQuestion", back_populates="document", cascade="all, delete-orphan"
    )
    flashcards = relationship(
        "Flashcard", back_populates="document", cascade="all, delete-orphan"
    )
    progress = relationship(
        "UserProgress", back_populates="document", cascade="all, delete-orphan"
    )


class MCQQuestion(Base):
    """
    Model for storing generated MCQ questions
    """

    __tablename__ = "mcq_questions"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("study_documents.id"), nullable=False)
    question = Column(Text, nullable=False)
    choices = Column(Text, nullable=False)  # JSON string of choices
    correct_answer = Column(String, nullable=False)
    explanation = Column(Text, nullable=True)
    page_number = Column(
        Integer, nullable=True
    )  # Page from which the question was generated
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    document = relationship("StudyDocument", back_populates="questions")
    progress = relationship(
        "UserProgress", back_populates="question", cascade="all, delete-orphan"
    )


class Flashcard(Base):
    """
    Model for storing generated flashcards for study documents
    """

    __tablename__ = "flashcards"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("study_documents.id"), nullable=False)
    front = Column(Text, nullable=False)  # Question/term on the front of the card
    back = Column(Text, nullable=False)  # Answer/definition on the back of the card
    explanation = Column(Text, nullable=True)  # Additional explanation or context
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    document = relationship("StudyDocument", back_populates="flashcards")


class UserProgress(Base):
    """
    Model for tracking user progress on MCQ questions
    """

    __tablename__ = "user_progress"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    document_id = Column(Integer, ForeignKey("study_documents.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("mcq_questions.id"), nullable=False)
    is_correct = Column(Boolean, nullable=False)
    selected_choice = Column(String, nullable=True)  # The choice the user selected
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="progress")
    document = relationship("StudyDocument", back_populates="progress")
    question = relationship("MCQQuestion", back_populates="progress")
