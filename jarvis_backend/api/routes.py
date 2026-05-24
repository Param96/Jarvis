"""HTTP route definitions."""

from fastapi import APIRouter, Depends

from jarvis_backend.api.dependencies import get_container
from jarvis_backend.app.container import Container
from jarvis_backend.schemas.conversation import ConversationRequest, ConversationResponse

router = APIRouter()


@router.get("/health")
async def health(container: Container = Depends(get_container)) -> dict[str, str]:
    """Health endpoint for process supervisors."""

    return {"status": "ok", "app": container.settings.app_name}


@router.get("/tools")
async def tools(container: Container = Depends(get_container)) -> list[dict]:
    """Return registered tool specifications."""

    return [spec.model_dump() for spec in container.tools.specs()]


@router.post("/conversation", response_model=ConversationResponse)
async def conversation(
    request: ConversationRequest,
    container: Container = Depends(get_container),
) -> ConversationResponse:
    """Process a text conversation turn."""

    return await container.conversation.handle_text(request.text, request.session_id)

