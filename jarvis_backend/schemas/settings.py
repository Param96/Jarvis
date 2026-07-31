"""Settings API schemas."""

from pydantic import BaseModel
from typing import Optional


class SettingsUpdatePayload(BaseModel):
    cloud_api_key: Optional[str] = None
    fallback_api_key: Optional[str] = None
    cloud_model_name: Optional[str] = None
    cloud_coding_model_name: Optional[str] = None
    local_model_name: Optional[str] = None
    wake_word_enabled: Optional[bool] = None
    tts_provider: Optional[str] = None
    local_model_provider: Optional[str] = None
    cloud_model_provider: Optional[str] = None
    cloud_model_base_url: Optional[str] = None


class SettingsResponse(BaseModel):
    cloud_api_key_masked: Optional[str] = None
    fallback_api_key_masked: Optional[str] = None
    cloud_model_name: str
    cloud_coding_model_name: Optional[str] = None
    local_model_name: str
    wake_word_enabled: bool
    tts_provider: str
    local_model_provider: str
    cloud_model_provider: str
    cloud_model_base_url: Optional[str] = None


class SystemStatsResponse(BaseModel):
    active_model: str
    cloud_provider: str
    local_provider: str
    agents_registered: int
    skills_loaded: int
    tools_registered: int
    tts_provider: str
    wake_word_enabled: bool
    memory_backend: str
    uptime_seconds: float
