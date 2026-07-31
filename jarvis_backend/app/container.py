"""Dependency container for Jarvis services."""

from dataclasses import dataclass

from jarvis_backend.api.websocket import WebSocketHub
from jarvis_backend.audio.pipeline import AudioPipeline
from jarvis_backend.audio.stt import (
    SpeechToText,
    FasterWhisperSTT,
    SpeechRecognitionSTT,
)
from jarvis_backend.audio.tts import DisabledTTS, PiperTTS, SystemTTS, TextToSpeech
from jarvis_backend.config.settings import Settings
from jarvis_backend.events.bus import EventBus
from jarvis_backend.memory.store import MemoryStore, SQLiteMemoryStore
from jarvis_backend.memory.pgvector_store import PgVectorMemoryStore
from jarvis_backend.models.providers import (
    DisabledModel,
    OllamaChatModel,
    OpenAICompatibleChatModel,
)
from jarvis_backend.core.agent import Agent
from jarvis_backend.core.skills import SkillLoader
from jarvis_backend.services.swarm import SwarmCoordinator
from jarvis_backend.safety.permissions import PermissionService
from jarvis_backend.services.conversation import ConversationService
from jarvis_backend.services.speech import SpeechService
from jarvis_backend.tools.builtin import (
    CurrentTimeTool,
    ReadTextFileTool,
    TerminalCommandTool,
    TransferAgentTool,
    WebSearchTool,
    WriteTextFileTool,
    IndexCodebaseTool,
    SearchCodebaseTool,
    FetchUrlTool,
    RunBackgroundCommandTool,
)
from jarvis_backend.tools.registry import ToolRegistry
from jarvis_backend.workers.tasks import BackgroundTaskQueue


@dataclass
class Container:
    """Application object graph."""

    settings: Settings
    bus: EventBus
    websocket_hub: WebSocketHub
    memory: MemoryStore
    tools: ToolRegistry
    permissions: PermissionService
    swarm: SwarmCoordinator
    conversation: ConversationService
    tts: TextToSpeech
    stt: SpeechToText
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


def _build_stt(settings: Settings) -> SpeechToText:
    if settings.stt_provider == "faster_whisper":
        return FasterWhisperSTT(model_name=settings.faster_whisper_model)
    return SpeechRecognitionSTT()


def build_container(settings: Settings) -> Container:
    """Build the dependency container."""
    from pathlib import Path

    bus = EventBus()
    websocket_hub = WebSocketHub()
    if settings.memory_backend == "pgvector":
        memory = PgVectorMemoryStore(
            dsn=settings.postgres_dsn,
            cloud_api_key=settings.cloud_api_key,
            cloud_base_url=settings.cloud_model_base_url,
        )
    else:
        memory = SQLiteMemoryStore(settings.session_db_path)
    permissions = PermissionService(settings)
    tasks = BackgroundTaskQueue()
    tools = ToolRegistry()
    tools.register(CurrentTimeTool())
    tools.register(ReadTextFileTool(permissions))
    tools.register(WriteTextFileTool(permissions))
    tools.register(TerminalCommandTool(settings, permissions))
    tools.register(WebSearchTool())
    tools.register(TransferAgentTool())
    tools.register(IndexCodebaseTool(memory, permissions))
    tools.register(SearchCodebaseTool(memory))
    tools.register(FetchUrlTool())
    tools.register(RunBackgroundCommandTool(settings, permissions, tasks))

    local_model = (
        OllamaChatModel(settings.local_model_base_url, settings.local_model_name)
        if settings.local_model_provider == "ollama"
        else DisabledModel()
    )
    cloud_model = None
    cloud_coding_model = None
    if settings.cloud_model_provider != "disabled" and settings.cloud_api_key:
        base_url = settings.cloud_model_base_url or "https://api.openai.com/v1"
        cloud_model = OpenAICompatibleChatModel(
            base_url, settings.cloud_api_key, settings.cloud_model_name
        )
        if settings.cloud_coding_model_name:
            cloud_coding_model = OpenAICompatibleChatModel(
                base_url, settings.cloud_api_key, settings.cloud_coding_model_name
            )

    skills_dir = Path(__file__).parent.parent / "skills"
    skills_dir.mkdir(parents=True, exist_ok=True)
    skill_loader = SkillLoader(skills_dir)
    swarm = SwarmCoordinator(skill_loader)

    triage_model = cloud_model if cloud_model else local_model
    triage_agent = Agent(
        name="TriageAgent",
        instructions="You are the Triage Agent. You answer general questions.",
        model=triage_model,
        allowed_tools=[
            "current_time",
            "read_text_file",
            "web_search",
            "transfer_agent",
        ],
        skills=["hello_world"],
    )
    swarm.register_agent(triage_agent, is_default=True)

    coder_model = cloud_coding_model if cloud_coding_model else triage_model
    coder_agent = Agent(
        name="CoderAgent",
        instructions="You are the Coder Agent. You write and execute code.",
        model=coder_model,
        allowed_tools=[
            "write_text_file",
            "terminal_command",
            "read_text_file",
            "index_codebase",
            "search_codebase",
            "run_background_command",
        ],
        skills=["project_researcher", "background_execution"],
    )
    swarm.register_agent(coder_agent)

    researcher_agent = Agent(
        name="ResearcherAgent",
        instructions="You are the Researcher Agent. You search the internet and read web pages to answer questions.",
        model=triage_model,
        allowed_tools=["web_search", "fetch_url", "transfer_agent"],
        skills=["web_surfer"],
    )
    swarm.register_agent(researcher_agent)

    tts = _build_tts(settings)
    stt = _build_stt(settings)
    conversation = ConversationService(bus, memory, swarm, tools)
    speech = SpeechService(bus, tts)
    audio = AudioPipeline(settings, bus)

    return Container(
        settings=settings,
        bus=bus,
        websocket_hub=websocket_hub,
        memory=memory,
        tools=tools,
        permissions=permissions,
        swarm=swarm,
        conversation=conversation,
        tts=tts,
        stt=stt,
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
