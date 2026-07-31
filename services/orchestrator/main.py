from fastapi import FastAPI, Depends, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from services.orchestrator.router import AIOrchestrator
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("OrchestratorAPI")

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Jarvis Cloud Orchestrator", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow dashboard to connect
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

orchestrator = AIOrchestrator()


class TaskRequest(BaseModel):
    intent: str
    device_id: str
    context: Optional[dict] = None
    model_override: Optional[str] = None


# A simple dependency to verify internal microservice requests
# In production, this would validate a service-to-service JWT
async def verify_internal_token(x_internal_token: str = Header(...)):
    if x_internal_token != "internal-service-secret":
        raise HTTPException(status_code=403, detail="Forbidden")
    return x_internal_token


@app.post("/api/v1/orchestrate")
async def orchestrate_task(
    request: TaskRequest, token: str = Depends(verify_internal_token)
):
    """
    Receives an intent from a device (via the tunnel or API Gateway),
    retrieves memory context, and routes it to the appropriate AI model.
    """
    logger.info(f"Received orchestration request for device {request.device_id}")

    # 1. Fetch memory context (Placeholder for Memory Service)
    # memory_context = memory_service.get_relevant_context(request.intent)

    # 2. Route the task
    result = await orchestrator.route_task(
        device_id=request.device_id,
        intent=request.intent,
        context=request.context,
        model_override=request.model_override,
    )

    return result


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "orchestrator"}
