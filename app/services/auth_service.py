import os
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
import bcrypt
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database.config import get_db
from app.database.models import User
from dotenv import load_dotenv
import secrets
from pathlib import Path

env_path = Path(__file__).parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

logger = logging.getLogger(__name__)

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    logger.critical("SECRET_KEY not found in environment variables")
    raise ValueError("SECRET_KEY must be set in .env file - JWT tokens cannot work without it")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 14

security = HTTPBearer()


def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    try:
        password_bytes = password.encode("utf-8")
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password_bytes, salt)
        return hashed.decode("utf-8")
    except Exception as e:
        logger.error(f"Password hashing failed: {type(e).__name__}")
        raise


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash using bcrypt"""
    try:
        password_bytes = plain_password.encode("utf-8")
        hashed_bytes = hashed_password.encode("utf-8")
        result = bcrypt.checkpw(password_bytes, hashed_bytes)
        return result
    except Exception as e:
        logger.error(f"Password verification failed: {type(e).__name__}")
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token"""
    try:
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)

        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    except Exception as e:
        logger.error(f"JWT token creation failed: {type(e).__name__}")
        raise


def create_reset_token() -> str:
    """Create a secure random token for password reset"""
    token = secrets.token_urlsafe(32)
    return token


def verify_token(token: str) -> Optional[dict]:
    """Verify and decode a JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """
    Dependency to get the current authenticated user from JWT token
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        token = credentials.credentials

        payload = verify_token(token)

        if payload is None:
            raise credentials_exception

        user_id_str: str = payload.get("sub")

        if user_id_str is None:
            raise credentials_exception

        try:
            user_id = int(user_id_str)
        except (ValueError, TypeError):
            raise credentials_exception

        user = db.query(User).filter(User.id == user_id).first()

        if user is None:
            logger.warning(f"Authentication failed: User not found - user_id: {user_id}")
            raise credentials_exception

        if not user.is_active:
            logger.warning(f"Authentication failed: Inactive user - user_id: {user_id}, email: {user.email}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user account"
            )

        return user
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Authentication error: {type(e).__name__} - {str(e)}")
        raise credentials_exception


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Dependency to ensure the current user is active
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user account"
        )
    return current_user
