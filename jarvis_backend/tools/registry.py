"""Tool registry and execution engine."""

import logging
from typing import Any

from jarvis_backend.tools.base import Tool, ToolResult, ToolSpec


class ToolRegistry:
    """Register, list, and execute tools."""

    def __init__(self) -> None:
        self._tools: dict[str, Tool] = {}
        self._logger = logging.getLogger(__name__)

    def register(self, tool: Tool) -> None:
        """Register a tool by name."""

        self._tools[tool.spec.name] = tool

    def specs(self) -> list[ToolSpec]:
        """Return model-visible tool specs."""

        return [tool.spec for tool in self._tools.values()]

    async def run(self, name: str, arguments: dict[str, Any]) -> ToolResult:
        """Execute a registered tool."""

        tool = self._tools.get(name)
        if not tool:
            return ToolResult(name=name, ok=False, output=f"Unknown tool: {name}")
        try:
            return await tool.run(arguments)
        except Exception as exc:
            self._logger.exception("tool_execution_failed", extra={"tool": name})
            return ToolResult(name=name, ok=False, output=str(exc))

