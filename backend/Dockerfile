FROM python:3.11-slim

WORKDIR /app

RUN pip install --no-cache-dir uv

# Copy lockfile first for layer caching
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

COPY . .

EXPOSE 8000

# Railway injects $PORT; fall back to 8000 locally
CMD uv run uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
