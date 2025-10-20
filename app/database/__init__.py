# Database package initialization
from .config import engine, Base, get_db
from . import models


def create_tables():
    """
    Create all database tables
    """
    Base.metadata.create_all(bind=engine)


__all__ = ["engine", "Base", "get_db", "create_tables", "models"]
