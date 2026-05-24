FROM python:3.12-slim

WORKDIR /app

# Install dependencies
COPY services/tunnel_relay/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy shared packages
COPY packages /app/packages

# Copy service source code
COPY services/tunnel_relay /app/services/tunnel_relay

ENV PYTHONPATH="/app"

# Run the FastAPI app
CMD ["uvicorn", "services.tunnel_relay.main:app", "--host", "0.0.0.0", "--port", "8001"]
