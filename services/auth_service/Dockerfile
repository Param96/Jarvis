FROM python:3.12-slim

WORKDIR /app

# Install dependencies
COPY services/auth_service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy shared packages
COPY packages /app/packages

# Copy auth_service source code
COPY services/auth_service /app/services/auth_service

ENV PYTHONPATH="/app"

# Run the FastAPI app
CMD ["uvicorn", "services.auth_service.main:app", "--host", "0.0.0.0", "--port", "8000"]
