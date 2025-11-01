import logging
from pathlib import Path
from typing import List

from pypdf import PdfReader

logger = logging.getLogger(__name__)


def extract_pdf_text_by_pages(file_path: str) -> List[str]:
    """
    Extract text from each page of a PDF file.

    Args:
        file_path (str): Path to the PDF file

    Returns:
        List[str]: List of text content for each page
    """
    pages_text = []
    try:
        reader = PdfReader(file_path)

        for page in reader.pages:
            text = page.extract_text()
            if text.strip():
                pages_text.append(text.strip())
            else:
                pages_text.append("")

    except Exception as e:
        logger.error(f"PDF extraction failed for {file_path}: {type(e).__name__} - {str(e)}")
        raise
    return pages_text


def extract_txt_text(file_path: str) -> List[str]:
    """
    Extract text from a TXT file as a single page.

    Args:
        file_path (str): Path to the TXT file

    Returns:
        List[str]: List containing the text content
    """
    try:
        with open(file_path, "r", encoding="utf-8") as file:
            content = file.read()
        return [content] if content.strip() else [""]
    except Exception as e:
        logger.error(f"TXT file read failed for {file_path}: {type(e).__name__} - {str(e)}")
        raise


def extract_docx_text(file_path: str) -> List[str]:
    """
    Extract text from a DOCX file as a single page.

    Args:
        file_path (str): Path to the DOCX file

    Returns:
        List[str]: List containing the text content
    """
    try:
        from docx import Document

        doc = Document(file_path)
        paragraphs = [
            paragraph.text for paragraph in doc.paragraphs if paragraph.text.strip()
        ]
        content = "\n".join(paragraphs)
        return [content] if content else [""]
    except ImportError:
        logger.error("python-docx library not installed")
        raise ImportError(
            "python-docx is not installed. Please install it with: pip install python-docx"
        )
    except Exception as e:
        logger.error(f"DOCX file read failed for {file_path}: {type(e).__name__} - {str(e)}")
        raise


def extract_text_from_file(file_path: str) -> List[str]:
    """
    Extract text from a file based on its extension.

    Args:
        file_path (str): Path to the file

    Returns:
        List[str]: List containing text content (by pages if PDF)
    """
    file_extension = Path(file_path).suffix.lower()

    if file_extension == ".pdf":
        return extract_pdf_text_by_pages(file_path)
    elif file_extension == ".txt":
        return extract_txt_text(file_path)
    elif file_extension == ".docx":
        return extract_docx_text(file_path)
    else:
        raise ValueError(f"Unsupported file type: {file_extension}")
