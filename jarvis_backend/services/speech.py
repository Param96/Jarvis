"""Speech response service."""

import logging

from jarvis_backend.audio.tts import TextToSpeech
from jarvis_backend.events.bus import EventBus
from jarvis_backend.events.types import AssistantState, Event, EventType


class SpeechService:
    """Speaks assistant responses and supports interruption."""

    def __init__(self, bus: EventBus, tts: TextToSpeech) -> None:
        self._bus = bus
        self._tts = tts
        self._logger = logging.getLogger(__name__)

    async def start(self) -> None:
        self._bus.subscribe(EventType.ASSISTANT_RESPONSE, self._on_response)
        self._bus.subscribe(EventType.WAKE_WORD_DETECTED, self._on_interrupt)

    async def _on_response(self, event: Event) -> None:
        text = str(event.payload.get("text", ""))
        if not text:
            return
        await self._bus.publish(
            Event(
                type=EventType.STATE_CHANGED,
                session_id=event.session_id,
                payload={"state": AssistantState.SPEAKING, "task": "Speaking"},
            )
        )
        await self._bus.publish(
            Event(type=EventType.TTS_STARTED, session_id=event.session_id)
        )
        try:
            await self._tts.speak(text)
        finally:
            await self._bus.publish(
                Event(type=EventType.TTS_FINISHED, session_id=event.session_id)
            )

    async def _on_interrupt(self, event: Event) -> None:
        await self._tts.stop()
