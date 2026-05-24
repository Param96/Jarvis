"""Dependency container for Jarvis services."""

from dataclasses import dataclass

from jarvis_backend.api.websocket import WebSocketHub
from jarvis_backend.audio.pipeline import AudioPipeline
from jarvis_backend.audio.tts import DisabledTTS, PiperTTS, SystemTTS, TextToSpeech
from jarvis_backend.config.settings import Settings
from jarvis_backend.events.bus import EventBus
from jarvis_backend.memory.store import SQLiteMemoryStore
from jarvis_backend.models.providers import DisabledModel, OllamaChatModel, OpenAICompatibleChatModel
from jarvis_backend.models.router import ModelRouter
from jarvis_backend.safety.permissions import PermissionService
from jarvis_backend.services.conversation import ConversationService
from jarvis_backend.services.speech import SpeechService
from jarvis_backend.tools.builtin import CurrentTimeTool, ReadTextFileTool, TerminalCommandTool
from jarvis_backend.tools.registry import ToolRegistry
from jarvis_backend.workers.tasks import BackgroundTaskQueue


@dataclass
class Container:
    """Application object graph."""

    settings: Settings
    bus: EventBus
    websocket_hub: WebSocketHub
    memory: SQLiteMemoryStore
    tools: ToolRegistry
    permissions: PermissionService
    router: ModelRouter
    conversation: ConversationService
    tts: TextToSpeech
    speech: SpeechService
    audio: AudioPipeline
    tasks: BackgroundTaskQueue

    async def start(self) -> None:
        """Start services in dependency order."""

        await self.memory.initialize()
        self.bus.subscribe_all(self.websocket_hub.broadcast_event)
        await self.conversation.start()
        await self.speech.start()
        await self.tasks.start()
        await self.audio.start()

    async def stop(self) -> None:
        """Stop long-running services."""

        await self.audio.stop()
        await self.tasks.stop()
        await self.tts.stop()


def build_container(settings: Settings) -> Container:
    """Build the dependency container."""

    bus = EventBus()
    websocket_hub = WebSocketHub()
    memory = SQLiteMemoryStore(settings.session_db_path)
    permissions = PermissionService(settings)
    tools = ToolRegistry()
    tools.register(CurrentTimeTool())
    tools.register(ReadTextFileTool(permissions))
    tools.register(TerminalCommandTool(settings, permissions))

    local_model = (
        OllamaChatModel(settings.local_model_base_url, settings.local_model_name)
        if settings.local_model_provider == "ollama"
        else DisabledModel()
    )
    cloud_model = None
    if settings.cloud_model_provider != "disabled" and settings.cloud_api_key:
        base_url = settings.cloud_model_base_url or "https://api.openai.com/v1"
        cloud_model = OpenAICompatibleChatModel(base_url, settings.cloud_api_key, settings.cloud_model_name)
    router = ModelRouter(settings, local_model, cloud_model)

    tts = _build_tts(settings)
    conversation = ConversationService(bus, memory, router, tools)
    speech = SpeechService(bus, tts)
    audio = AudioPipeline(settings, bus)
    tasks = BackgroundTaskQueue()

    return Container(
        settings=settings,
        bus=bus,
        websocket_hub=websocket_hub,
        memory=memory,
        tools=tools,
        permissions=permissions,
        router=router,
        conversation=conversation,
        tts=tts,
        speech=speech,
        audio=audio,
        tasks=tasks,
    )


def _build_tts(settings: Settings) -> TextToSpeech:
    if settings.tts_provider == "system":
        return SystemTTS()
    if settings.tts_provider == "piper" and settings.piper_voice_path:
        return PiperTTS(settings.piper_voice_path)
    return DisabledTTS()
