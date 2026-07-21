"""WebSocket communication for realtime clients."""

import json
import logging
from collections import defaultdict
from typing import TYPE_CHECKING

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from jarvis_backend.events.types import Event
from jarvis_backend.schemas.conversation import ConversationRequest

if TYPE_CHECKING:
    from jarvis_backend.app.container import Container

router = APIRouter()


class WebSocketHub:
    """Broadcast backend events to connected WebSocket clients."""

    def __init__(self) -> None:
        self._connections: set[WebSocket] = set()
        self._logger = logging.getLogger(__name__)
        self._session_subscribers: dict[str, set[WebSocket]] = defaultdict(set)

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections.add(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        self._connections.discard(websocket)
        for subscribers in self._session_subscribers.values():
            subscribers.discard(websocket)

    async def broadcast_event(self, event: Event) -> None:
        message = event.model_dump(mode="json")
        stale: list[WebSocket] = []
        for websocket in self._connections:
            try:
                await websocket.send_json(message)
            except Exception:
                stale.append(websocket)
        for websocket in stale:
            self.disconnect(websocket)


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    """Realtime channel.

    Client messages:
    - {"type": "conversation.text", "text": "...", "session_id": "..."}
    - {"type": "control.interrupt"}
    """

    container: "Container" = websocket.app.state.container
    await container.websocket_hub.connect(websocket)
    await websocket.send_json({"type": "system.connected", "payload": {"message": "Connected to Jarvis."}})
    try:
        while True:
            message = await websocket.receive()
            
            if "bytes" in message:
                audio_data = message["bytes"]
                try:
                    transcript = await container.stt.transcribe_buffer(audio_data)
                    if transcript and transcript.strip():
                        # The user just spoke this text! Handle it as if they typed it.
                        request = ConversationRequest(
                            text=transcript,
                            session_id="voice-session",
                        )
                        # Optionally echo back what was heard
                        await websocket.send_json({"type": "conversation.transcript", "payload": {"text": transcript}})
                        
                        response = await container.conversation.handle_text(request.text, request.session_id)
                        await websocket.send_json({"type": "conversation.done", "payload": response.model_dump()})
                except Exception as e:
                    import logging
                    logging.getLogger(__name__).error(f"STT Error: {e}")
                    await websocket.send_json({"type": "error", "payload": {"message": f"Transcription failed: {e}"}})
                    
            elif "text" in message:
                raw = message["text"]
            data = json.loads(raw)
            message_type = data.get("type")
            if message_type == "conversation.text":
                request = ConversationRequest(
                    text=str(data.get("text", "")),
                    session_id=data.get("session_id"),
                    metadata=data.get("metadata", {}),
                )
                response = await container.conversation.handle_text(request.text, request.session_id)
                await websocket.send_json({"type": "conversation.done", "payload": response.model_dump()})
            elif message_type == "control.interrupt":
                await container.tts.stop()
                await websocket.send_json({"type": "control.interrupted", "payload": {}})
            else:
                await websocket.send_json({"type": "error", "payload": {"message": "Unknown message type."}})
    except WebSocketDisconnect:
        container.websocket_hub.disconnect(websocket)
