"""LLM provider abstractions and concrete adapters."""

import json
import logging
from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Protocol

from jarvis_backend.schemas.conversation import Message


@dataclass(frozen=True)
class ModelResponse:
    """Completed model response."""

    text: str
    model: str


class ChatModel(Protocol):
    """Streaming chat model contract."""

    name: str

    async def stream(self, messages: list[Message]) -> AsyncIterator[str]:
        """Stream response tokens."""


class DisabledModel:
    """Deterministic fallback used when no model backend is configured."""

    name = "disabled"

    async def stream(self, messages: list[Message]) -> AsyncIterator[str]:
        last = next((m.content for m in reversed(messages) if m.role == "user"), "")
        yield (
            "I am online, but no language model is configured yet. "
            f"I heard: {last}"
        )


class OllamaChatModel:
    """Ollama chat adapter using the local HTTP API."""

    def __init__(self, base_url: str, model: str, timeout: float = 60.0) -> None:
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.name = f"ollama:{model}"
        self.timeout = timeout
        self._logger = logging.getLogger(__name__)

    async def stream(self, messages: list[Message]) -> AsyncIterator[str]:
        payload = {
            "model": self.model,
            "messages": [
                {"role": message.role.value, "content": message.content}
                for message in messages
            ],
            "stream": True,
        }
        try:
            import httpx

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                async with client.stream("POST", f"{self.base_url}/api/chat", json=payload) as response:
                    response.raise_for_status()
                    async for line in response.aiter_lines():
                        if not line:
                            continue
                        data = json.loads(line)
                        token = data.get("message", {}).get("content")
                        if token:
                            yield token
        except Exception:
            self._logger.exception("ollama_stream_failed")
            yield "I could not reach the local model service."


class OpenAICompatibleChatModel:
    """OpenAI-compatible chat completions adapter."""

    def __init__(self, base_url: str, api_key: str, model: str, timeout: float = 90.0) -> None:
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.model = model
        self.name = f"openai-compatible:{model}"
        self.timeout = timeout

    async def stream(self, messages: list[Message]) -> AsyncIterator[str]:
        payload = {
            "model": self.model,
            "messages": [
                {"role": message.role.value, "content": message.content}
                for message in messages
            ],
            "stream": True,
        }
        headers = {"Authorization": f"Bearer {self.api_key}"}
        try:
            import httpx

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                async with client.stream(
                    "POST",
                    f"{self.base_url}/chat/completions",
                    json=payload,
                    headers=headers,
                ) as response:
                    response.raise_for_status()
                    async for line in response.aiter_lines():
                        if not line.startswith("data: "):
                            continue
                        data = line.removeprefix("data: ").strip()
                        if data == "[DONE]":
                            break
                        chunk = json.loads(data)
                        token = chunk["choices"][0].get("delta", {}).get("content")
                        if token:
                            yield token
        except Exception:
            yield "I could not reach the cloud model service."
