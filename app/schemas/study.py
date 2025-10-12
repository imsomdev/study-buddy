from pydantic import BaseModel


class UploadResponse(BaseModel):
    """
    Schema for the response returned after a successful file upload.
    """

    filename: str
    content_type: str
    file_url: str
    message: str = "File uploaded successfully"
