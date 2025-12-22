from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from fastapi_users_db_sqlalchemy import SQLAlchemyBaseUserTable
from app.database.config import Base


class User(SQLAlchemyBaseUserTable[int], Base):
    """
    Model for storing user information, integrated with FastAPI Users
    """
    __tablename__ = "user"
    
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationship to study documents
    documents = relationship("StudyDocument", back_populates="owner")


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

    # Relationships
    owner = relationship("User", back_populates="documents")
    questions = relationship("MCQQuestion", back_populates="document", cascade="all, delete-orphan")


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
    page_number = Column(Integer, nullable=True)  # Page from which the question was generated
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    document = relationship("StudyDocument", back_populates="questions")