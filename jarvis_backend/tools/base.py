"""Tool abstractions."""

from abc import ABC, abstractmethod
from typing import Any

from pydantic import BaseModel, Field


class ToolSpec(BaseModel):
    """Metadata exposed to models and clients."""

    name: str
    description: str
    parameters: dict[str, Any] = Field(default_factory=dict)
    requires_confirmation: bool = False


class ToolResult(BaseModel):
    """Tool execution result."""

    name: str
    ok: bool
    output: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class Tool(ABC):
    """Base tool interface."""

    spec: ToolSpec

    @abstractmethod
    async def run(self, arguments: dict[str, Any]) -> ToolResult:
        """Execute the tool."""
