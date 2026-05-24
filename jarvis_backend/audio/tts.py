"""Text-to-speech adapters."""

import asyncio
import logging
import shutil
import subprocess
from pathlib import Path
from typing import Protocol


class TextToSpeech(Protocol):
    """Text-to-speech contract."""

    async def speak(self, text: str) -> None:
        """Speak text, or no-op when disabled."""

    async def stop(self) -> None:
        """Stop current speech when supported."""


class DisabledTTS:
    """No-op TTS for servers without a local voice runtime."""

    async def speak(self, text: str) -> None:
        return None

    async def stop(self) -> None:
        return None


class SystemTTS:
    """macOS `say` adapter for quick local voice feedback."""

    def __init__(self) -> None:
        self._process: asyncio.subprocess.Process | None = None

    async def speak(self, text: str) -> None:
        await self.stop()
        if not shutil.which("say"):
            return
        self._process = await asyncio.create_subprocess_exec("say", text)
        await self._process.wait()

    async def stop(self) -> None:
        if self._process and self._process.returncode is None:
            self._process.terminate()
            await self._process.wait()
        self._process = None


class PiperTTS:
    """Piper CLI adapter. Requires `piper` binary and a voice model path."""

    def __init__(self, voice_path: Path) -> None:
        self._voice_path = voice_path
        self._logger = logging.getLogger(__name__)

    async def speak(self, text: str) -> None:
        if not shutil.which("piper"):
            self._logger.warning("piper_binary_missing")
            return
        await asyncio.to_thread(self._speak_sync, text)

    def _speak_sync(self, text: str) -> None:
        subprocess.run(
            ["piper", "--model", str(self._voice_path), "--output-raw"],
            input=text.encode(),
            check=False,
            stdout=subprocess.DEVNULL,
        )

    async def stop(self) -> None:
        return None

