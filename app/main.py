from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.exceptions.exception_handlers import setup_exception_handlers
from app.routes import study, auth
from app.database import create_tables

app = FastAPI(
    title="Study Buddy API", description="API for managing study resources and notes"
)
# Removed unprotected static files mount - files are now served via protected endpoint
# app.mount("/files", StaticFiles(directory=UPLOAD_DIRECTORY), name="uploads")

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

# Include routers for different services
app.include_router(auth.router, prefix="/api/v1/auth", tags=["authentication"])
app.include_router(study.router, prefix="/api/v1", tags=["studies"])


@app.get("/")
async def root():
    return {"message": "Welcome to Study Buddy API"}
