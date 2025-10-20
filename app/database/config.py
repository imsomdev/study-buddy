import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import logging

# Load environment variables
load_dotenv()

# Database URL - you can change this to match your PostgreSQL setup
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql+psycopg://user:password@localhost:5432/studybuddy"
)

try:
    # Create the SQLAlchemy engine
    engine = create_engine(DATABASE_URL)
    logging.info("Database engine created successfully with PostgreSQL")
except Exception as e:
    logging.warning(f"Failed to connect to PostgreSQL: {e}. Falling back to SQLite for development.")
    # Fallback to SQLite for development when PostgreSQL is not available
    DATABASE_URL = "sqlite:///./studybuddy.db"
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    logging.info("Using SQLite database for development")

# Create a configured "SessionLocal" class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create a Base class for declarative models
Base = declarative_base()


def get_db():
    """
    Dependency function that provides database sessions for FastAPI endpoints
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
