FROM python:3.12-slim

WORKDIR /app

# Install dependencies
COPY services/orchestrator/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy shared packages
COPY packages /app/packages

# Copy service source code
COPY services/orchestrator /app/services/orchestrator

ENV PYTHONPATH="/app"

# Run the FastAPI app
CMD ["uvicorn", "services.orchestrator.main:app", "--host", "0.0.0.0", "--port", "8002"]
