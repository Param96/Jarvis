"""Environment-driven settings for the Jarvis backend."""

from functools import lru_cache
import json
import os
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, Field


class Settings(BaseModel):
    """Application settings loaded from environment variables and `.env`."""

    app_name: str = "Jarvis OS Backend"
    environment: Literal["local", "development", "production"] = "local"
    host: str = "0.0.0.0"
    port: int = 8000
    cors_origins: list[str] = Field(default_factory=lambda: ["*"])
    log_level: str = "INFO"

    data_dir: Path = Path("data")
    session_db_path: Path = Path("data/jarvis.sqlite3")

    wake_word_enabled: bool = True
    wake_word_name: str = "hey_jarvis"
    wake_word_threshold: float = 0.5
    audio_sample_rate: int = 16000
    audio_chunk_size: int = 1280
    speech_timeout_seconds: float = 5.0
    phrase_time_limit_seconds: float = 15.0

    stt_provider: Literal["speech_recognition", "faster_whisper"] = "speech_recognition"
    faster_whisper_model: str = "base.en"
    tts_provider: Literal["system", "piper", "kokoro", "disabled"] = "system"
    piper_voice_path: Path | None = None

    memory_backend: Literal["sqlite", "chromadb"] = "sqlite"
    chroma_path: Path = Path("data/memory/chroma")
    memory_top_k: int = 5

    local_model_provider: Literal["ollama", "openai_compatible", "disabled"] = "ollama"
    local_model_name: str = "llama3.2"
    local_model_base_url: str = "http://localhost:11434"
    cloud_model_provider: Literal["openai", "openai_compatible", "disabled"] = "disabled"
    cloud_model_name: str = "gpt-4.1"
    cloud_model_base_url: str | None = None
    cloud_api_key: str | None = None

    local_max_prompt_chars: int = 1800
    cloud_reasoning_keywords: list[str] = Field(
        default_factory=lambda: [
            "analyze",
            "architect",
            "debug",
            "plan",
            "complex",
            "research",
            "write code",
        ]
    )

    allow_terminal_tools: bool = False
    allow_filesystem_tools: bool = True
    allowed_workspace_roots: list[Path] = Field(default_factory=lambda: [Path.cwd()])
    terminal_timeout_seconds: float = 20.0

    def __init__(self, **data):
        env_data = _load_dotenv()
        env_data.update(os.environ)
        merged = {}
        for field_name, field in self.__class__.model_fields.items():
            env_name = f"JARVIS_{field_name.upper()}"
            if env_name in env_data:
                merged[field_name] = _parse_env_value(env_data[env_name], field.annotation)
        merged.update(data)
        super().__init__(**merged)


def _load_dotenv() -> dict[str, str]:
    path = Path(".env")
    if not path.exists():
        return {}
    values: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def _parse_env_value(raw: str, annotation):
    if annotation is bool:
        return raw.lower() in {"1", "true", "yes", "on"}
    if annotation is int:
        return int(raw)
    if annotation is float:
        return float(raw)
    if annotation is Path or str(annotation).endswith("Path | None"):
        return Path(raw) if raw else None
    if str(annotation).startswith("list["):
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return [item.strip() for item in raw.split(",") if item.strip()]
    return raw


@lru_cache
def get_settings() -> Settings:
    """Return cached application settings."""

    settings = Settings()
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    settings.session_db_path.parent.mkdir(parents=True, exist_ok=True)
    settings.chroma_path.mkdir(parents=True, exist_ok=True)
    return settings
