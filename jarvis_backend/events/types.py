"""Typed events passed between Jarvis services."""

from datetime import UTC, datetime
from enum import StrEnum
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, Field


class EventType(StrEnum):
    SYSTEM_READY = "system.ready"
    STATE_CHANGED = "state.changed"
    WAKE_WORD_DETECTED = "audio.wake_word_detected"
    SPEECH_CAPTURED = "audio.speech_captured"
    USER_TRANSCRIPT = "conversation.user_transcript"
    MEMORY_RETRIEVED = "memory.retrieved"
    MODEL_TOKEN = "model.token"
    ASSISTANT_RESPONSE = "conversation.assistant_response"
    TOOL_REQUESTED = "tool.requested"
    TOOL_COMPLETED = "tool.completed"
    TOOL_FAILED = "tool.failed"
    TTS_STARTED = "audio.tts_started"
    TTS_FINISHED = "audio.tts_finished"
    ERROR = "system.error"


class Event(BaseModel):
    """A durable domain event for async fan-out."""

    type: EventType
    payload: dict[str, Any] = Field(default_factory=dict)
    session_id: str | None = None
    correlation_id: str = Field(default_factory=lambda: str(uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class AssistantState(StrEnum):
    BOOTING = "BOOTING"
    IDLE = "IDLE"
    LISTENING = "LISTENING"
    PROCESSING = "PROCESSING"
    SPEAKING = "SPEAKING"
    ERROR = "ERROR"

