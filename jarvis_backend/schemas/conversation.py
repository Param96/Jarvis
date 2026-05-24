"""Conversation DTOs."""

from datetime import UTC, datetime
from enum import StrEnum
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, Field


class Role(StrEnum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"
    TOOL = "tool"


class Message(BaseModel):
    """A single conversation message."""

    role: Role
    content: str
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class Session(BaseModel):
    """Persistent assistant session."""

    id: str = Field(default_factory=lambda: str(uuid4()))
    title: str | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class ConversationRequest(BaseModel):
    """Text request accepted over HTTP or WebSocket."""

    text: str
    session_id: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class ConversationResponse(BaseModel):
    """Assistant response returned to clients."""

    text: str
    session_id: str
    model: str
    used_tools: list[str] = Field(default_factory=list)
    memories: list[str] = Field(default_factory=list)
