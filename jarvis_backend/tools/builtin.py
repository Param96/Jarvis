"""Built-in tools for local automation."""

import asyncio
from datetime import datetime
from pathlib import Path
from typing import Any

from jarvis_backend.config.settings import Settings
from jarvis_backend.safety.permissions import PermissionService
from jarvis_backend.tools.base import Tool, ToolResult, ToolSpec
from jarvis_backend.memory.pgvector_store import PgVectorMemoryStore
from jarvis_backend.memory.store import MemoryStore
from jarvis_backend.workers.tasks import BackgroundTaskQueue


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
            return ToolResult(
                name=self.spec.name, ok=False, output="Command timed out."
            )

        output = stdout.decode(errors="replace")
        if stderr:
            output = f"{output}\n{stderr.decode(errors='replace')}".strip()
        return ToolResult(
            name=self.spec.name,
            ok=proc.returncode == 0,
            output=output.strip(),
            metadata={"returncode": proc.returncode},
        )


class WriteTextFileTool(Tool):
    """Write text to a file in allowed workspace roots."""

    spec = ToolSpec(
        name="write_text_file",
        description="Write UTF-8 text to a file in an allowed local workspace path.",
        parameters={"path": {"type": "string"}, "content": {"type": "string"}},
        requires_confirmation=True,
    )

    def __init__(self, permissions: PermissionService) -> None:
        self._permissions = permissions

    async def run(self, arguments: dict[str, Any]) -> ToolResult:
        path = Path(str(arguments["path"]))
        self._permissions.require_filesystem_path(path)
        content = str(arguments.get("content", ""))
        await asyncio.to_thread(path.write_text, content, encoding="utf-8")
        return ToolResult(
            name=self.spec.name, ok=True, output=f"Successfully wrote to {path}"
        )


class WebSearchTool(Tool):
    """Search the web using DuckDuckGo."""

    spec = ToolSpec(
        name="web_search",
        description="Search the web for information using DuckDuckGo.",
        parameters={"query": {"type": "string"}},
    )

    async def run(self, arguments: dict[str, Any]) -> ToolResult:
        query = str(arguments["query"])
        try:
            from duckduckgo_search import DDGS

            def _search():
                results = []
                with DDGS() as ddgs:
                    for r in ddgs.text(query, max_results=5):
                        results.append(
                            f"Title: {r.get('title')}\nURL: {r.get('href')}\nSnippet: {r.get('body')}\n"
                        )
                return "\n".join(results)

            output = await asyncio.to_thread(_search)
            return ToolResult(
                name=self.spec.name, ok=True, output=output or "No results found."
            )
        except Exception as e:
            return ToolResult(
                name=self.spec.name, ok=False, output=f"Search failed: {e}"
            )


class TransferAgentTool(Tool):
    """Transfer the conversation to another specialized agent."""

    spec = ToolSpec(
        name="transfer_agent",
        description="Transfer the conversation to a different specialized agent. Use this when the user needs a different agent's expertise.",
        parameters={
            "agent_name": {
                "type": "string",
                "description": "The name of the agent to transfer to (e.g. 'CoderAgent')",
            }
        },
    )

    async def run(self, arguments: dict[str, Any]) -> ToolResult:
        agent_name = str(arguments["agent_name"])
        return ToolResult(
            name=self.spec.name,
            ok=True,
            output=f"Transferred to agent: {agent_name}",
            metadata={"transfer_to": agent_name},
        )


class IndexCodebaseTool(Tool):
    """Index a file or directory into vector memory."""

    spec = ToolSpec(
        name="index_codebase",
        description="Index a source code file into the vector memory for semantic search.",
        parameters={
            "path": {
                "type": "string",
                "description": "Absolute path to the file to index.",
            }
        },
    )

    def __init__(self, memory: MemoryStore, permissions: PermissionService) -> None:
        self._memory = memory
        self._permissions = permissions

    async def run(self, arguments: dict[str, Any]) -> ToolResult:
        if not isinstance(self._memory, PgVectorMemoryStore):
            return ToolResult(
                name=self.spec.name,
                ok=False,
                output="Codebase indexing requires PgVectorMemoryStore.",
            )

        path = Path(str(arguments["path"]))
        self._permissions.require_filesystem_path(path)

        try:
            content = await asyncio.to_thread(path.read_text, encoding="utf-8")
            # Simple chunking logic (in a real app, use AST or intelligent splitting)
            await self._memory.add_code_chunk(str(path), content)
            return ToolResult(
                name=self.spec.name, ok=True, output=f"Successfully indexed {path}"
            )
        except Exception as e:
            return ToolResult(
                name=self.spec.name, ok=False, output=f"Failed to index {path}: {e}"
            )


class SearchCodebaseTool(Tool):
    """Search indexed codebase using semantic RAG."""

    spec = ToolSpec(
        name="search_codebase",
        description="Search the indexed codebase using a semantic query.",
        parameters={"query": {"type": "string"}},
    )

    def __init__(self, memory: MemoryStore) -> None:
        self._memory = memory

    async def run(self, arguments: dict[str, Any]) -> ToolResult:
        if not isinstance(self._memory, PgVectorMemoryStore):
            return ToolResult(
                name=self.spec.name,
                ok=False,
                output="Codebase search requires PgVectorMemoryStore.",
            )

        query = str(arguments["query"])
        try:
            results = await self._memory.search_code(query)
            if not results:
                return ToolResult(
                    name=self.spec.name, ok=True, output="No relevant code found."
                )

            output = ""
            for res in results:
                output += f"\n--- {res['file_path']} ---\n{res['content']}\n"
            return ToolResult(name=self.spec.name, ok=True, output=output.strip())
        except Exception as e:
            return ToolResult(
                name=self.spec.name, ok=False, output=f"Search failed: {e}"
            )


class FetchUrlTool(Tool):
    """Fetch and extract text from a webpage."""

    spec = ToolSpec(
        name="fetch_url",
        description="Fetch a webpage by URL and extract its text content.",
        parameters={"url": {"type": "string"}},
    )

    async def run(self, arguments: dict[str, Any]) -> ToolResult:
        url = str(arguments["url"])
        try:
            import urllib.request
            import re

            def _fetch():
                req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req, timeout=10) as response:
                    html = response.read().decode("utf-8", errors="ignore")
                    # Strip script and style tags
                    html = re.sub(
                        r"<(script|style)[^>]*>.*?</\1>",
                        "",
                        html,
                        flags=re.IGNORECASE | re.DOTALL,
                    )
                    # Strip all HTML tags
                    text = re.sub(r"<[^>]+>", " ", html)
                    # Collapse whitespace
                    return re.sub(r"\s+", " ", text).strip()

            output = await asyncio.to_thread(_fetch)
            if len(output) > 15000:
                output = output[:15000] + "\n... (truncated)"

            return ToolResult(name=self.spec.name, ok=True, output=output)
        except Exception as e:
            return ToolResult(
                name=self.spec.name, ok=False, output=f"Failed to fetch {url}: {e}"
            )


class RunBackgroundCommandTool(Tool):
    """Run a terminal command asynchronously in the background."""

    spec = ToolSpec(
        name="run_background_command",
        description="Run a long-running terminal command in the background. Does not block the conversation. Cannot return stdout/stderr.",
        parameters={"command": {"type": "string"}},
        requires_confirmation=True,
    )

    def __init__(
        self,
        settings: Settings,
        permissions: PermissionService,
        task_queue: BackgroundTaskQueue,
    ) -> None:
        self._settings = settings
        self._permissions = permissions
        self._task_queue = task_queue

    async def run(self, arguments: dict[str, Any]) -> ToolResult:
        command = str(arguments["command"])

        async def _run_cmd():
            proc = await asyncio.create_subprocess_shell(
                command,
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.DEVNULL,
            )
            await proc.wait()

        task_id = await self._task_queue.enqueue(f"Command: {command[:20]}", _run_cmd)
        return ToolResult(
            name=self.spec.name,
            ok=True,
            output=f"Started in background. Task ID: {task_id}",
        )
