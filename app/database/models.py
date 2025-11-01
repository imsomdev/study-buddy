from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.config import Base


class User(Base):
    """
    Model for storing user information
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    reset_token = Column(String, nullable=True)
    reset_token_expires = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    study_documents = relationship("StudyDocument", back_populates="user")


class StudyDocument(Base):
    """
    Model for storing information about uploaded study documents
    """
    __tablename__ = "study_documents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    filename = Column(String, index=True, nullable=False)
    content_type = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_url = Column(String, nullable=False)
    page_count = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    is_active = Column(Boolean, default=True)

    # Relationships
    user = relationship("User", back_populates="study_documents")
    questions = relationship("MCQQuestion", back_populates="document")


class MCQQuestion(Base):
    """
    Model for storing generated MCQ questions
    """
    __tablename__ = "mcq_questions"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("study_documents.id"), nullable=False, index=True)
    question = Column(Text, nullable=False)
    choices = Column(Text, nullable=False)  # JSON string of choices
    correct_answer = Column(String, nullable=False)
    explanation = Column(Text, nullable=True)
    page_number = Column(Integer, nullable=True)  # Page from which the question was generated
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    document = relationship("StudyDocument", back_populates="questions")