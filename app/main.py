from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.constants.paths import UPLOAD_DIRECTORY
from app.exceptions.exception_handlers import setup_exception_handlers
from app.routes import study

app = FastAPI(
    title="Study Buddy API", description="API for managing study resources and notes"
)
app.mount("/files", StaticFiles(directory=UPLOAD_DIRECTORY), name="uploads")
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

# Include routers for different services
app.include_router(study.router, prefix="/studies", tags=["studies"])


@app.get("/")
async def root():
    return {"message": "Welcome to Study Buddy API"}
