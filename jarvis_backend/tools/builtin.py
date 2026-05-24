"""Built-in tools for local automation."""

import asyncio
from datetime import datetime
from pathlib import Path
from typing import Any

from jarvis_backend.config.settings import Settings
from jarvis_backend.safety.permissions import PermissionService
from jarvis_backend.tools.base import Tool, ToolResult, ToolSpec


class CurrentTimeTool(Tool):
    """Return local system time."""

    spec = ToolSpec(
        name="current_time",
        description="Return the current local date and time.",
        parameters={},
    )

    async def run(self, arguments: dict[str, Any]) -> ToolResult:
        return ToolResult(
            name=self.spec.name,
            ok=True,
            output=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        )


class ReadTextFileTool(Tool):
    """Read a text file from allowed workspace roots."""

    spec = ToolSpec(
        name="read_text_file",
        description="Read a UTF-8 text file from an allowed local workspace path.",
        parameters={"path": {"type": "string"}},
    )

    def __init__(self, permissions: PermissionService) -> None:
        self._permissions = permissions

    async def run(self, arguments: dict[str, Any]) -> ToolResult:
        path = Path(str(arguments["path"]))
        self._permissions.require_filesystem_path(path)
        text = await asyncio.to_thread(path.read_text, encoding="utf-8")
        return ToolResult(name=self.spec.name, ok=True, output=text)


class TerminalCommandTool(Tool):
    """Run a terminal command when explicitly enabled."""

    spec = ToolSpec(
        name="terminal_command",
        description="Run a local terminal command. Disabled unless allowed by configuration.",
        parameters={"command": {"type": "array", "items": {"type": "string"}}},
        requires_confirmation=True,
    )

    def __init__(self, settings: Settings, permissions: PermissionService) -> None:
        self._settings = settings
        self._permissions = permissions

    async def run(self, arguments: dict[str, Any]) -> ToolResult:
        self._permissions.require_terminal()
        command = [str(part) for part in arguments["command"]]
        proc = await asyncio.create_subprocess_exec(
            *command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        try:
            stdout, stderr = await asyncio.wait_for(
                proc.communicate(),
                timeout=self._settings.terminal_timeout_seconds,
            )
        except TimeoutError:
            proc.kill()
            await proc.wait()
            return ToolResult(name=self.spec.name, ok=False, output="Command timed out.")

        output = stdout.decode(errors="replace")
        if stderr:
            output = f"{output}\n{stderr.decode(errors='replace')}".strip()
        return ToolResult(
            name=self.spec.name,
            ok=proc.returncode == 0,
            output=output.strip(),
            metadata={"returncode": proc.returncode},
        )

