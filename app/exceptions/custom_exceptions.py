from fastapi import HTTPException, status


class FileUploadException(HTTPException):
    def __init__(self, detail: str):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"There was an error uploading the file: {detail}",
        )


class FileValidationException(HTTPException):
    def __init__(self, detail: str):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
        )


class FileNotFoundException(HTTPException):
    def __init__(self, filename: str):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File {filename} not found in uploads directory.",
        )


class TextExtractionException(HTTPException):
    def __init__(self, detail: str):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error extracting text from file: {detail}",
        )


class LLMProcessingException(HTTPException):
    def __init__(self, detail: str):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing file with LLM: {detail}",
        )
