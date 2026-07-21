"""Speech-to-text adapters."""

import asyncio
import logging
from pathlib import Path
from typing import Protocol


class SpeechToText(Protocol):
    """Speech-to-text contract."""

    async def transcribe_file(self, path: Path) -> str:
        """Transcribe audio from a file."""

    async def transcribe_buffer(self, data: bytes) -> str:
        """Transcribe audio from an in-memory buffer."""


class FasterWhisperSTT:
    """Faster-Whisper adapter loaded lazily to keep startup light."""

    def __init__(self, model_name: str) -> None:
        self._model_name = model_name
        self._model = None

    async def transcribe_file(self, path: Path) -> str:
        return await asyncio.to_thread(self._transcribe_sync, path)

    async def transcribe_buffer(self, data: bytes) -> str:
        return await asyncio.to_thread(self._transcribe_buffer_sync, data)

    def _transcribe_sync(self, path: Path) -> str:
        if self._model is None:
            from faster_whisper import WhisperModel

            self._model = WhisperModel(self._model_name, device="auto", compute_type="int8")
        segments, _ = self._model.transcribe(str(path), vad_filter=True)
        return " ".join(segment.text.strip() for segment in segments).strip()

    def _transcribe_buffer_sync(self, data: bytes) -> str:
        import io
        if self._model is None:
            from faster_whisper import WhisperModel

            self._model = WhisperModel(self._model_name, device="auto", compute_type="int8")
        # Write to a temp file or use a BytesIO wrapper since faster-whisper accepts file-like objects for audio
        segments, _ = self._model.transcribe(io.BytesIO(data), vad_filter=True)
        return " ".join(segment.text.strip() for segment in segments).strip()


class SpeechRecognitionSTT:
    """SpeechRecognition adapter for microphone captures and WAV files."""

    def __init__(self) -> None:
        import speech_recognition as sr

        self._sr = sr
        self._recognizer = sr.Recognizer()
        self._logger = logging.getLogger(__name__)

    async def transcribe_file(self, path: Path) -> str:
        return await asyncio.to_thread(self._transcribe_sync, path)

    async def transcribe_buffer(self, data: bytes) -> str:
        return await asyncio.to_thread(self._transcribe_buffer_sync, data)

    def _transcribe_sync(self, path: Path) -> str:
        with self._sr.AudioFile(str(path)) as source:
            audio = self._recognizer.record(source)
        return self._recognizer.recognize_google(audio)

    def _transcribe_buffer_sync(self, data: bytes) -> str:
        import io
        with self._sr.AudioFile(io.BytesIO(data)) as source:
            audio = self._recognizer.record(source)
        return self._recognizer.recognize_google(audio)

