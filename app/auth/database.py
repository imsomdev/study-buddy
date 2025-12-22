from fastapi import Depends
from fastapi_users_db_sqlalchemy import SQLAlchemyUserDatabase
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.config import get_async_db
from app.database.models import User


async def get_user_db(session: AsyncSession = Depends(get_async_db)):
    yield SQLAlchemyUserDatabase(session, User)
