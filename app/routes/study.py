import os

import aiofiles
from fastapi import APIRouter, File, HTTPException, Request, UploadFile, status

from app.constants.file_types import ALLOWED_EXTENSIONS, ALLOWED_MIME_TYPES
from app.constants.paths import UPLOAD_DIRECTORY
from app.schemas.study import UploadResponse

router = APIRouter()


@router.post(
    "/uploadfile/",
    response_model=UploadResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_upload_file(file: UploadFile = File(...), request: Request = Request):
    # 1. Validate the file extension
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No file provided or filename is missing.",
        )

    file_extension = os.path.splitext(file.filename)[1].lower()
    if file_extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File extension '{file_extension}' is not allowed. Allowed extensions are: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    # 2. Validate the MIME type
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File content type '{file.content_type}' is not allowed.",
        )

    safe_filename = os.path.basename(file.filename)
    file_location = os.path.join(UPLOAD_DIRECTORY, safe_filename)
    if not os.path.exists(UPLOAD_DIRECTORY):
        os.makedirs(UPLOAD_DIRECTORY)
    try:
        async with aiofiles.open(file_location, "wb") as f:
            while chunk := await file.read(1024 * 1024):  # Read in 1MB chunks
                await f.write(chunk)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"There was an error uploading the file: {e}",
        )
    finally:
        await file.close()  # Ensure the file is closed
    file_url = f"{request.base_url}files/{safe_filename}"
    return UploadResponse(
        filename=safe_filename,
        content_type=file.content_type,
        file_url=file_url,
        file_path=file_location,
    )
