# Jarvis

Jarvis is a project with a backend API and various microservices including authentication, tunnel relay, and orchestrator. It uses FastAPI, Redis, PostgreSQL (with pgvector), and Traefik. It also has a standalone microphone listener for local testing.

## Prerequisites

- Docker and Docker Compose
- Python 3.9+ (for running the standalone listener)

## Running the Services

To run the backend services (API Gateway, Core Databases, Auth Service, Tunnel Relay, Orchestrator), use Docker Compose:

```bash
docker-compose up -d
```

### Services

- **Traefik (API Gateway)**: Port 80 and 8080
- **Postgres**: Port 5432
- **Auth Service**: Port 8000
- **Tunnel Relay**: Port 8001
- **Orchestrator**: Port 8002
- **Redis**: Port 6379

## Running the Standalone Listener

For local testing of the audio pipeline without the HTTP API, you can run the standalone listener.

1. Install requirements:
```bash
pip install -r requirements.txt
```

2. Run the listener:
```bash
python listener.py
```

## Running the API

You can run the FastAPI app directly:

```bash
python app.py
```
