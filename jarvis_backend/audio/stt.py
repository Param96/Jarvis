"""Speech-to-text adapters."""

import asyncio
import logging
from pathlib import Path
from typing import Protocol


class SpeechToText(Protocol):
    """Speech-to-text contract."""

    async def transcribe_file(self, path: Path) -> str:
        """Transcribe audio from a file."""


class FasterWhisperSTT:
    """Faster-Whisper adapter loaded lazily to keep startup light."""

    def __init__(self, model_name: str) -> None:
        self._model_name = model_name
        self._model = None

    async def transcribe_file(self, path: Path) -> str:
        return await asyncio.to_thread(self._transcribe_sync, path)

    def _transcribe_sync(self, path: Path) -> str:
        if self._model is None:
            from faster_whisper import WhisperModel

            self._model = WhisperModel(self._model_name, device="auto", compute_type="auto")
        segments, _ = self._model.transcribe(str(path), vad_filter=True)
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

    def _transcribe_sync(self, path: Path) -> str:
        with self._sr.AudioFile(str(path)) as source:
            audio = self._recognizer.record(source)
        return self._recognizer.recognize_google(audio)

