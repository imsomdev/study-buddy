#!/bin/bash
set -e

echo "Running migrations..."
uv run alembic upgrade head

echo "Starting application..."
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000
