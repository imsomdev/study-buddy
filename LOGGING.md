# Logging System Documentation

## Overview
This application implements a comprehensive logging system that captures all exceptions, requests, and important events with detailed context.

## Features

### 1. **Dual Format Logging**
- **Console Output**: Human-readable format with timestamps, log levels, and detailed exception traces
- **File Output**: JSON format for easy parsing and analysis by log aggregation tools

### 2. **Log Files**
Located in `logs/` directory:
- `app_YYYYMMDD.log` - All logs (DEBUG level and above) in JSON format
- `error_YYYYMMDD.log` - Only ERROR and CRITICAL logs in JSON format

### 3. **Noise Filtering**
Automatically filters out noisy development logs from:
- File watchers (watchfiles) during development
- Multipart form parsing details
- Other verbose third-party library logs
- Keeps your logs clean and focused on your application logic

### 4. **Request Tracking**
Every request is assigned a unique `request_id` that's:
- Logged with all related operations
- Returned in response headers as `X-Request-ID`
- Useful for tracing requests through the system

### 5. **Logged Information**

#### Requests
- HTTP method, endpoint, query parameters
- Client IP and user agent
- Request processing time
- Response status code

#### Exceptions
- Full exception type and message
- Complete stack trace
- Request context (endpoint, method, user)
- Additional context data

#### Authentication
- Login attempts and results
- Token creation and verification
- User access patterns
- Failed authentication attempts

#### Business Operations
- File uploads and processing
- Text extraction from documents
- LLM API calls and responses
- MCQ generation progress

## Usage

### Basic Logging
```python
import logging

logger = logging.getLogger(__name__)

# Different log levels
logger.debug("Detailed debug information")
logger.info("General information")
logger.warning("Warning message")
logger.error("Error occurred", exc_info=True)  # Includes stack trace
logger.critical("Critical system error")
```

### With Extra Context
```python
logger.info(
    "User action completed",
    extra={
        "user_id": user.id,
        "action": "file_upload",
        "file_size": file_size
    }
)
```

### Exception Logging
```python
try:
    # some operation
    pass
except Exception as e:
    logger.error(
        "Operation failed",
        exc_info=True,  # Includes full traceback
        extra={
            "operation": "data_processing",
            "input_data": data_id
        }
    )
    raise
```

## Log Levels

- **DEBUG**: Detailed diagnostic information (not written to console in production)
- **INFO**: General informational messages about system operation
- **WARNING**: Warning messages for potentially harmful situations
- **ERROR**: Error events that might still allow the application to continue
- **CRITICAL**: Severe error events that might cause the application to abort

## Configuration

Configure logging in `app/logging_config.py`:
```python
setup_logging(log_level="INFO", log_dir="logs")
```

## Best Practices

1. **Always log exceptions with context**:
   ```python
   logger.error("Failed to process file", exc_info=True, extra={"filename": filename})
   ```

2. **Use appropriate log levels**:
   - INFO for normal operations
   - WARNING for unexpected but handled situations
   - ERROR for exceptions that need attention
   - CRITICAL for severe failures

3. **Include relevant context**:
   - User IDs
   - Resource identifiers
   - Operation parameters
   - Error codes

4. **Don't log sensitive data**:
   - Passwords
   - API keys
   - Personal identification information
   - Full credit card numbers

## Monitoring

- Check `logs/error_*.log` regularly for system issues
- Use request_id to trace specific user issues
- Monitor log file size and implement rotation if needed
- Consider integrating with log aggregation services (ELK, Splunk, etc.)
