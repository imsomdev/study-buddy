from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from app.database.config import get_db
from app.database.models import User
from app.schemas.auth import (
    SignupRequest,
    LoginRequest,
    TokenResponse,
    UserResponse,
    PasswordResetRequest,
    PasswordResetConfirm,
    ChangePasswordRequest,
    MessageResponse,
)
from app.services.auth_service import (
    hash_password,
    verify_password,
    create_access_token,
    create_reset_token,
    get_current_active_user,
)

router = APIRouter()


@router.post(
    "/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED
)
async def signup(user_data: SignupRequest, db: Session = Depends(get_db)):
    """
    Register a new user
    """
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered"
        )

    # Create new user
    hashed_pwd = hash_password(user_data.password)
    new_user = User(
        email=user_data.email,
        hashed_password=hashed_pwd,
        is_active=True,
        is_verified=False,  # Can be set to True if email verification is not required
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Create access token
    access_token = create_access_token(data={"sub": new_user.id})

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(new_user),
    )


@router.post("/login", response_model=TokenResponse)
async def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate a user and return a JWT token
    """
    # Find user by email
    user = db.query(User).filter(User.email == credentials.email).first()

    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Account is inactive"
        )

    # Create access token
    access_token = create_access_token(data={"sub": user.id})

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    """
    Get current authenticated user information
    """
    return UserResponse.model_validate(current_user)


@router.post("/password-reset/request", response_model=MessageResponse)
async def request_password_reset(
    request: PasswordResetRequest, db: Session = Depends(get_db)
):
    """
    Request a password reset token (sent via email in production)
    """
    user = db.query(User).filter(User.email == request.email).first()

    # Always return success to prevent email enumeration
    if not user:
        return MessageResponse(
            message="If the email exists, a reset link has been sent"
        )

    # Generate reset token
    reset_token = create_reset_token()
    user.reset_token = reset_token
    user.reset_token_expires = datetime.now(timezone.utc) + timedelta(
        hours=1
    )  # Token valid for 1 hour

    db.commit()

    # TODO: In production, send email with reset link containing the token
    # For now, return the token in the response (ONLY FOR DEVELOPMENT)
    # In production, remove the token from response and send it via email
    return MessageResponse(
        message=f"Password reset requested. Token (DEV ONLY): {reset_token}"
    )


@router.post("/password-reset/confirm", response_model=MessageResponse)
async def confirm_password_reset(
    reset_data: PasswordResetConfirm, db: Session = Depends(get_db)
):
    """
    Reset password using the reset token
    """
    user = db.query(User).filter(User.reset_token == reset_data.token).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )

    # Check if token is expired
    if user.reset_token_expires < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Reset token has expired"
        )

    # Update password
    user.hashed_password = hash_password(reset_data.new_password)
    user.reset_token = None
    user.reset_token_expires = None

    db.commit()

    return MessageResponse(message="Password has been reset successfully")


@router.post("/password/change", response_model=MessageResponse)
async def change_password(
    password_data: ChangePasswordRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Change password for authenticated user
    """
    # Verify current password
    if not verify_password(
        password_data.current_password, current_user.hashed_password
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    # Update password
    current_user.hashed_password = hash_password(password_data.new_password)
    db.commit()

    return MessageResponse(message="Password changed successfully")
