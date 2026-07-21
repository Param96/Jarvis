"""HTTP route definitions."""

from fastapi import APIRouter, Depends

from jarvis_backend.api.dependencies import get_container
from jarvis_backend.app.container import Container
from jarvis_backend.schemas.conversation import ConversationRequest, ConversationResponse
from jarvis_backend.schemas.settings import SettingsUpdatePayload, SettingsResponse
from pathlib import Path

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


@router.get("/settings", response_model=SettingsResponse)
async def get_settings(container: Container = Depends(get_container)) -> SettingsResponse:
    def mask_key(key: str | None) -> str | None:
        if not key: return None
        return key[:4] + "*" * (len(key) - 8) + key[-4:] if len(key) > 8 else "***"
        
    return SettingsResponse(
        cloud_api_key_masked=mask_key(container.settings.cloud_api_key),
        fallback_api_key_masked=mask_key(container.settings.fallback_api_key),
        cloud_model_name=container.settings.cloud_model_name,
        cloud_coding_model_name=container.settings.cloud_coding_model_name,
        local_model_name=container.settings.local_model_name,
    )


@router.post("/settings", response_model=SettingsResponse)
async def update_settings(
    payload: SettingsUpdatePayload,
    container: Container = Depends(get_container)
) -> SettingsResponse:
    env_path = Path(".env")
    env_content = env_path.read_text() if env_path.exists() else ""
    lines = env_content.splitlines()
    
    updates = {}
    if payload.cloud_api_key is not None:
        updates["JARVIS_CLOUD_API_KEY"] = payload.cloud_api_key
    if payload.fallback_api_key is not None:
        updates["JARVIS_FALLBACK_API_KEY"] = payload.fallback_api_key
    if payload.cloud_model_name is not None:
        updates["JARVIS_CLOUD_MODEL_NAME"] = payload.cloud_model_name
    if payload.cloud_coding_model_name is not None:
        updates["JARVIS_CLOUD_CODING_MODEL_NAME"] = payload.cloud_coding_model_name
    if payload.local_model_name is not None:
        updates["JARVIS_LOCAL_MODEL_NAME"] = payload.local_model_name
        
    new_lines = []
    updated_keys = set()
    for line in lines:
        if "=" in line and not line.strip().startswith("#"):
            key = line.split("=")[0].strip()
            if key in updates:
                new_lines.append(f"{key}={updates[key]}")
                updated_keys.add(key)
            else:
                new_lines.append(line)
        else:
            new_lines.append(line)
            
    for key, value in updates.items():
        if key not in updated_keys:
            new_lines.append(f"{key}={value}")
            
    env_path.write_text("\\n".join(new_lines) + "\\n")
    return await get_settings(container)

