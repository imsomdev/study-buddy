# Database package initialization
from . import models
from .config import Base, engine, get_db


def create_tables():
    """
    Create all database tables
    """
    Base.metadata.create_all(bind=engine)


__all__ = ["engine", "Base", "get_db", "create_tables", "models"]
