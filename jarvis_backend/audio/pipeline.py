"""Real-time audio pipeline with wake-word and command capture."""

import asyncio
import logging
import tempfile
import wave
from pathlib import Path

from jarvis_backend.config.settings import Settings
from jarvis_backend.core.lifecycle import Service
from jarvis_backend.events.bus import EventBus
from jarvis_backend.events.types import AssistantState, Event, EventType


class AudioPipeline(Service):
    """Continuously listens for wake word and emits transcript events."""

    def __init__(self, settings: Settings, bus: EventBus) -> None:
        self._settings = settings
        self._bus = bus
        self._task: asyncio.Task[None] | None = None
        self._running = asyncio.Event()
        self._loop: asyncio.AbstractEventLoop | None = None
        self._logger = logging.getLogger(__name__)

    async def start(self) -> None:
        self._running.set()
        self._loop = asyncio.get_running_loop()
        if self._settings.wake_word_enabled:
            self._task = asyncio.create_task(self._run(), name="audio-pipeline")
            await self._bus.publish(
                Event(
                    type=EventType.STATE_CHANGED,
                    payload={
                        "state": AssistantState.IDLE,
                        "task": "Waiting for 'Hey Jarvis'",
                    },
                )
            )

    async def stop(self) -> None:
        self._running.clear()
        if self._task:
            self._task.cancel()
            await asyncio.gather(self._task, return_exceptions=True)

    async def _run(self) -> None:
        """Run blocking microphone work in a worker thread."""

        while self._running.is_set():
            try:
                await asyncio.to_thread(self._listen_sync)
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                self._logger.exception("audio_pipeline_failed")
                await self._bus.publish(
                    Event(
                        type=EventType.ERROR,
                        payload={"source": "audio", "error": str(exc)},
                    )
                )
                await asyncio.sleep(2)

    def _listen_sync(self) -> None:
        import numpy as np
        import openwakeword
        import pyaudio
        import speech_recognition as sr
        from openwakeword.model import Model

        openwakeword.utils.download_models()
        model = Model(
            wakeword_models=[self._settings.wake_word_name],
            inference_framework="onnx",
        )
        recognizer = sr.Recognizer()
        audio = pyaudio.PyAudio()
        stream = audio.open(
            format=pyaudio.paInt16,
            channels=1,
            rate=self._settings.audio_sample_rate,
            input=True,
            frames_per_buffer=self._settings.audio_chunk_size,
        )
        try:
            self._threadsafe_event(
                EventType.STATE_CHANGED, {"state": AssistantState.IDLE}
            )
            while self._running.is_set():
                data = stream.read(
                    self._settings.audio_chunk_size, exception_on_overflow=False
                )
                frame = np.frombuffer(data, dtype=np.int16)
                model.predict(frame)
                for name in model.prediction_buffer.keys():
                    score = list(model.prediction_buffer[name])[-1]
                    if score < self._settings.wake_word_threshold:
                        continue
                    self._threadsafe_event(
                        EventType.WAKE_WORD_DETECTED, {"name": name, "score": score}
                    )
                    self._threadsafe_event(
                        EventType.STATE_CHANGED,
                        {
                            "state": AssistantState.LISTENING,
                            "task": "Wake word detected. Listening...",
                        },
                    )
                    stream.stop_stream()
                    try:
                        transcript = self._capture_command(recognizer)
                        self._threadsafe_event(
                            EventType.USER_TRANSCRIPT, {"text": transcript}
                        )
                    except sr.WaitTimeoutError:
                        self._threadsafe_event(
                            EventType.STATE_CHANGED,
                            {
                                "state": AssistantState.IDLE,
                                "task": "Listening timed out.",
                            },
                        )
                    except sr.UnknownValueError:
                        self._threadsafe_event(
                            EventType.STATE_CHANGED,
                            {
                                "state": AssistantState.IDLE,
                                "task": "Could not understand audio.",
                            },
                        )
                    finally:
                        model.reset()
                        stream.start_stream()
        finally:
            stream.stop_stream()
            stream.close()
            audio.terminate()

    def _capture_command(self, recognizer: object) -> str:
        import speech_recognition as sr

        with sr.Microphone(sample_rate=self._settings.audio_sample_rate) as source:
            audio_input = recognizer.listen(
                source,
                timeout=self._settings.speech_timeout_seconds,
                phrase_time_limit=self._settings.phrase_time_limit_seconds,
            )
        return recognizer.recognize_google(audio_input)

    def _threadsafe_event(self, event_type: EventType, payload: dict) -> None:
        if self._loop is None:
            return
        asyncio.run_coroutine_threadsafe(
            self._bus.publish(Event(type=event_type, payload=payload)),
            self._loop,
        )


def write_pcm_wav(path: Path, pcm: bytes, sample_rate: int = 16000) -> None:
    """Write raw PCM bytes to a mono 16-bit WAV file."""

    with wave.open(str(path), "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(sample_rate)
        wav.writeframes(pcm)


def temporary_wav_path() -> Path:
    """Return a temporary WAV path for WebSocket audio chunks."""

    return Path(tempfile.mkstemp(suffix=".wav")[1])
