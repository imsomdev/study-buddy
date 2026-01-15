import logging
from datetime import datetime
from pathlib import Path


def setup_logging(log_level: str = "INFO", log_dir: str = "logs"):
    """
    Setup logging configuration for file output only.
    Use absolute paths to ensure logs are written to the correct location.

    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_dir: Directory to store log files
    """
    # 1. Determine absolute paths
    # This file is in app/, so parent is 'app', parent.parent is project root
    base_dir = Path(__file__).resolve().parent.parent
    log_path = base_dir / log_dir
    log_path.mkdir(parents=True, exist_ok=True)

    # 2. Define log file name with date
    log_file = log_path / f"app_{datetime.now().strftime('%Y%m%d')}.log"

    # 3. Define formatter
    log_format = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )

    # 4. Configure Root Logger
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, log_level.upper()))

    # Clear existing handlers (important if reloading or uvicorn setup handlers)
    if root_logger.hasHandlers():
        root_logger.handlers.clear()

    # 5. Add File Handler
    file_handler = logging.FileHandler(log_file, encoding="utf-8")
    file_handler.setFormatter(log_format)
    root_logger.addHandler(file_handler)

    # 6. Silence noisy libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.error").setLevel(logging.INFO)
    logging.getLogger("watchfiles").setLevel(logging.WARNING)

    # 7. Log a startup message to verify it works
    # We use the root logger directly here to ensure it goes to the handler we just set
    root_logger.info(f"Logging setup complete. Writing to: {log_file}")


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance.
    """
    return logging.getLogger(name)
