import os
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

# Load .env from project root
env_path = Path(__file__).parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

# JWT Configuration
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise ValueError("SECRET_KEY must be set in .env file - JWT tokens cannot work without it")
print(f"[SECRET_KEY DEBUG] Loaded SECRET_KEY: {SECRET_KEY[:20]}...")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 14  # Token valid for 14 days

# Security scheme
security = HTTPBearer()


def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    # Encode password to bytes
    password_bytes = password.encode("utf-8")
    # Generate salt and hash password
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    # Return as string
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash using bcrypt"""
    # Encode inputs to bytes
    password_bytes = plain_password.encode("utf-8")
    hashed_bytes = hashed_password.encode("utf-8")
    # Verify password
    return bcrypt.checkpw(password_bytes, hashed_bytes)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def create_reset_token() -> str:
    """Create a secure random token for password reset"""
    return secrets.token_urlsafe(32)


def verify_token(token: str) -> Optional[dict]:
    """Verify and decode a JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError as e:
        print(f"[AUTH DEBUG] JWT decode error: {type(e).__name__}: {str(e)}")
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
        print(f"[AUTH DEBUG] Received credentials: {credentials}")
        print(f"[AUTH DEBUG] Token: {credentials.credentials[:20]}...")

        token = credentials.credentials
        payload = verify_token(token)
        print(f"[AUTH DEBUG] Decoded payload: {payload}")

        if payload is None:
            print("[AUTH DEBUG] Payload is None - token verification failed")
            raise credentials_exception

        user_id_str: str = payload.get("sub")
        print(f"[AUTH DEBUG] User ID from token: {user_id_str}")

        if user_id_str is None:
            print("[AUTH DEBUG] No user_id in payload")
            raise credentials_exception

        try:
            user_id = int(user_id_str)
        except (ValueError, TypeError):
            print(f"[AUTH DEBUG] Invalid user_id format: {user_id_str}")
            raise credentials_exception

        user = db.query(User).filter(User.id == user_id).first()
        print(f"[AUTH DEBUG] User found: {user is not None}")

        if user is None:
            print("[AUTH DEBUG] User not found in database")
            raise credentials_exception

        if not user.is_active:
            print("[AUTH DEBUG] User is not active")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user account"
            )

        print(f"[AUTH DEBUG] Authentication successful for user: {user.email}")
        return user
    except HTTPException:
        raise
    except Exception as e:
        print(f"[AUTH DEBUG] Unexpected error: {type(e).__name__}: {str(e)}")
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
