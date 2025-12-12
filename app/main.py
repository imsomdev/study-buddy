import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.logging_config import setup_logging

# Configure logging BEFORE importing app modules
setup_logging(log_level="INFO")

# Now import app modules (these may use logging during initialization)
from app.middleware.logging_middleware import LoggingMiddleware
from app.exceptions.exception_handlers import setup_exception_handlers
from app.routes import study, auth
from app.database import create_tables

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Study Buddy API", description="API for managing study resources and notes"
)
# Removed unprotected static files mount - files are now served via protected endpoint
# app.mount("/files", StaticFiles(directory=UPLOAD_DIRECTORY), name="uploads")

app.add_middleware(LoggingMiddleware)

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

logger.info("Study Buddy API started successfully")

# Include routers for different services
app.include_router(auth.router, prefix="/api/v1/auth", tags=["authentication"])
app.include_router(study.router, prefix="/api/v1", tags=["studies"])


@app.get("/")
async def root():
    return {"message": "Welcome to Study Buddy API"}


@app.get("/hi")
async def hi():
    return {"message": "hi"}
