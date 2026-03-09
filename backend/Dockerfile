# ---------- Stage 1: Builder ----------
FROM python:3.10-slim AS builder

WORKDIR /install

COPY requirements.txt .

RUN pip install --prefix=/install/deps -r requirements.txt


# ---------- Stage 2: Runtime ----------
FROM python:3.10-slim

WORKDIR /app

# Copy installed dependencies from builder
COPY --from=builder /install/deps /usr/local

# Copy application
COPY . .

# Expose port
EXPOSE 8000

# Start FastAPI with 2 workers
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]