import logging
import os
import tempfile
from contextlib import asynccontextmanager
from typing import AsyncGenerator, Optional

import aioboto3
from botocore.config import Config
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# R2 Configuration
R2_ACCOUNT_ID = os.getenv("R2_ACCOUNT_ID")
R2_ACCESS_KEY_ID = os.getenv("R2_ACCESS_KEY_ID")
R2_SECRET_ACCESS_KEY = os.getenv("R2_SECRET_ACCESS_KEY")
R2_BUCKET_NAME = os.getenv("R2_BUCKET_NAME", "study-buddy-uploads")
R2_ENDPOINT_URL = f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com"

# Presigned URL expiration (seconds)
PRESIGNED_URL_EXPIRATION = 3600  # 1 hour


class StorageService:
    """
    Service for managing file storage in Cloudflare R2.
    Uses S3-compatible API via boto3.
    """

    def __init__(self):
        self.session = aioboto3.Session()
        self.config = Config(
            signature_version="s3v4",
            s3={"addressing_style": "path"},
        )

    @asynccontextmanager
    async def _get_client(self):
        """Get an async S3 client configured for R2."""
        async with self.session.client(
            "s3",
            endpoint_url=R2_ENDPOINT_URL,
            aws_access_key_id=R2_ACCESS_KEY_ID,
            aws_secret_access_key=R2_SECRET_ACCESS_KEY,
            config=self.config,
        ) as client:
            yield client

    async def upload_file(
        self,
        file_content: bytes,
        object_key: str,
        content_type: str,
    ) -> str:
        """
        Upload a file to R2.

        Args:
            file_content: The file bytes to upload
            object_key: The key (path) in R2 bucket
            content_type: MIME type of the file

        Returns:
            The object key of the uploaded file
        """
        async with self._get_client() as client:
            await client.put_object(
                Bucket=R2_BUCKET_NAME,
                Key=object_key,
                Body=file_content,
                ContentType=content_type,
            )
            logger.info(f"Uploaded file to R2: {object_key}")
            return object_key

    async def get_presigned_url(
        self,
        object_key: str,
        expiration: int = PRESIGNED_URL_EXPIRATION,
    ) -> str:
        """
        Generate a presigned URL for downloading a file.

        Args:
            object_key: The key (path) in R2 bucket
            expiration: URL expiration time in seconds

        Returns:
            Presigned URL string
        """
        async with self._get_client() as client:
            url = await client.generate_presigned_url(
                "get_object",
                Params={"Bucket": R2_BUCKET_NAME, "Key": object_key},
                ExpiresIn=expiration,
            )
            logger.info(f"Generated presigned URL for: {object_key}")
            return url

    async def download_file(self, object_key: str) -> bytes:
        """
        Download a file from R2.

        Args:
            object_key: The key (path) in R2 bucket

        Returns:
            File content as bytes
        """
        async with self._get_client() as client:
            response = await client.get_object(
                Bucket=R2_BUCKET_NAME,
                Key=object_key,
            )
            content = await response["Body"].read()
            logger.info(f"Downloaded file from R2: {object_key}")
            return content

    async def delete_file(self, object_key: str) -> None:
        """
        Delete a file from R2.

        Args:
            object_key: The key (path) in R2 bucket
        """
        async with self._get_client() as client:
            await client.delete_object(
                Bucket=R2_BUCKET_NAME,
                Key=object_key,
            )
            logger.info(f"Deleted file from R2: {object_key}")

    async def file_exists(self, object_key: str) -> bool:
        """
        Check if a file exists in R2.

        Args:
            object_key: The key (path) in R2 bucket

        Returns:
            True if file exists, False otherwise
        """
        async with self._get_client() as client:
            try:
                await client.head_object(
                    Bucket=R2_BUCKET_NAME,
                    Key=object_key,
                )
                return True
            except Exception:
                return False

    @asynccontextmanager
    async def download_to_temp_file(
        self, object_key: str, suffix: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """
        Download a file to a temporary location for processing.
        Automatically cleans up after use.

        Args:
            object_key: The key (path) in R2 bucket
            suffix: Optional file suffix (e.g., '.pdf')

        Yields:
            Path to the temporary file
        """
        content = await self.download_file(object_key)

        # Create temp file with proper suffix for file type detection
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            temp_file.write(content)
            temp_path = temp_file.name

        try:
            yield temp_path
        finally:
            # Clean up temp file
            if os.path.exists(temp_path):
                os.unlink(temp_path)
                logger.debug(f"Cleaned up temp file: {temp_path}")


# Singleton instance
storage_service = StorageService()
