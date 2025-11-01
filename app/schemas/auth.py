from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


class SignupRequest(BaseModel):
    """Schema for user signup"""
    email: EmailStr
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters")


class LoginRequest(BaseModel):
    """Schema for user login"""
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """Schema for JWT token response"""
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class UserResponse(BaseModel):
    """Schema for user data in responses"""
    id: int
    email: str
    is_active: bool
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True


class PasswordResetRequest(BaseModel):
    """Schema for requesting password reset"""
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    """Schema for confirming password reset with token"""
    token: str
    new_password: str = Field(..., min_length=8, description="New password must be at least 8 characters")


class ChangePasswordRequest(BaseModel):
    """Schema for changing password when logged in"""
    current_password: str
    new_password: str = Field(..., min_length=8, description="New password must be at least 8 characters")


class MessageResponse(BaseModel):
    """Generic message response"""
    message: str
