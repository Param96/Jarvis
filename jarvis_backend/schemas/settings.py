"""Settings API schemas."""

from pydantic import BaseModel
from typing import Optional

class SettingsUpdatePayload(BaseModel):
    cloud_api_key: Optional[str] = None
    fallback_api_key: Optional[str] = None
    cloud_model_name: Optional[str] = None
    cloud_coding_model_name: Optional[str] = None
    local_model_name: Optional[str] = None

class SettingsResponse(BaseModel):
    cloud_api_key_masked: Optional[str] = None
    fallback_api_key_masked: Optional[str] = None
    cloud_model_name: str
    cloud_coding_model_name: Optional[str] = None
    local_model_name: str
