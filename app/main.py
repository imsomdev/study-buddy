from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.constants.paths import UPLOAD_DIRECTORY
from app.exceptions.exception_handlers import setup_exception_handlers
from app.routes import study
from app.database import create_tables
from app.auth.auth import auth_backend, fastapi_users
from app.schemas.user import UserRead, UserCreate

app = FastAPI(
    title="Study Buddy API", description="API for managing study resources and notes"
)
# Setup exception handlers
setup_exception_handlers(app)
# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database tables
create_tables()

# Auth routers
app.include_router(
    fastapi_users.get_auth_router(auth_backend),
    prefix="/api/v1/auth/jwt",
    tags=["auth"],
)
app.include_router(
    fastapi_users.get_register_router(UserRead, UserCreate),
    prefix="/api/v1/auth",
    tags=["auth"],
)

# Include routers for different services
app.include_router(study.router, prefix="/api/v1", tags=["studies"])


@app.get("/")
async def root():
    return {"message": "Welcome to Study Buddy API"}
