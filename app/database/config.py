import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from dotenv import load_dotenv
import logging

# Load environment variables
load_dotenv()

# Database URL
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql+psycopg://user:password@localhost:5432/studybuddy"
)

# Ensure postgresql URLs use psycopg (v3) which supports both sync and async
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://")

# Async Database URL
ASYNC_DATABASE_URL = DATABASE_URL
if DATABASE_URL.startswith("sqlite"):
    ASYNC_DATABASE_URL = DATABASE_URL.replace("sqlite:///", "sqlite+aiosqlite:///")

try:
    # Create the SQLAlchemy sync engine
    engine = create_engine(DATABASE_URL)
    
    # Create the SQLAlchemy async engine
    async_engine = create_async_engine(ASYNC_DATABASE_URL)
    
    logging.info("Database engines created successfully")
except Exception as e:
    logging.warning(f"Failed to connect to primary DB: {e}. Falling back to SQLite for development.")
    # Fallback to SQLite for development
    DATABASE_URL = "sqlite:///./studybuddy.db"
    ASYNC_DATABASE_URL = "sqlite+aiosqlite:///./studybuddy.db"
    
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    async_engine = create_async_engine(ASYNC_DATABASE_URL, connect_args={"check_same_thread": False})
    logging.info("Using SQLite database for development")

# Create session factories
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
AsyncSessionLocal = async_sessionmaker(autocommit=False, autoflush=False, bind=async_engine, class_=AsyncSession)

# Create a Base class for declarative models
Base = declarative_base()


def get_db():
    """
    Dependency function that provides synchronous database sessions
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def get_async_db():
    """
    Dependency function that provides asynchronous database sessions
    """
    async with AsyncSessionLocal() as session:
        yield session
