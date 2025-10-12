from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.constants.paths import UPLOAD_DIRECTORY
from app.routes import user, study, note

app = FastAPI(
    title="Study Buddy API", description="API for managing study resources and notes"
)
app.mount("/files", StaticFiles(directory=UPLOAD_DIRECTORY), name="uploads")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers for different services
# app.include_router(user.router, prefix="/users", tags=["users"])
app.include_router(study.router, prefix="/studies", tags=["studies"])
# app.include_router(note.router, prefix="/notes", tags=["notes"])


@app.get("/")
async def root():
    return {"message": "Welcome to Study Buddy API"}
