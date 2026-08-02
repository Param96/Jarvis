"""Conversation orchestration service."""

import logging

from jarvis_backend.events.bus import EventBus
from jarvis_backend.events.types import AssistantState, Event, EventType
from jarvis_backend.memory.store import MemoryStore
from jarvis_backend.services.swarm import SwarmCoordinator
from jarvis_backend.schemas.conversation import ConversationResponse, Message, Role
from jarvis_backend.tools.registry import ToolRegistry


class ConversationService:
    """Coordinates memory retrieval, tool execution, model streaming, and persistence."""

    def __init__(
        self,
        bus: EventBus,
        memory: MemoryStore,
        swarm: SwarmCoordinator,
        tools: ToolRegistry,
    ) -> None:
        self._bus = bus
        self._memory = memory
        self._swarm = swarm
        self._tools = tools
        self._logger = logging.getLogger(__name__)

    async def start(self) -> None:
        self._bus.subscribe(EventType.USER_TRANSCRIPT, self._on_user_transcript)

    async def handle_text(
        self, text: str, session_id: str | None = None
    ) -> ConversationResponse:
        """Handle a text turn and stream progress through the event bus."""

        session = await self._memory.ensure_session(session_id)
        await self._bus.publish(
            Event(
                type=EventType.STATE_CHANGED,
                session_id=session.id,
                payload={"state": AssistantState.PROCESSING, "task": "Thinking"},
            )
        )
        user_message = Message(role=Role.USER, content=text)
        await self._memory.add_message(session.id, user_message)

        memories = await self._memory.search_semantic_memory(text)
        recent = await self._memory.recent_messages(session.id)
        context = self._build_context(session.id, text, recent, memories)

        tool_result = await self._maybe_run_builtin_tool(text)
        used_tools: list[str] = []
        if tool_result:
            used_tools.append(tool_result.name)
            context.append(
                Message(
                    role=Role.TOOL,
                    content=tool_result.output,
                    metadata={"tool": tool_result.name},
                )
            )

            # Handle handoff tool explicitly
            if tool_result.name == "transfer_agent" and tool_result.metadata:
                target_agent = tool_result.metadata.get("transfer_to")
                if target_agent:
                    self._swarm.set_active_agent(session.id, target_agent)
                    context.append(
                        Message(
                            role=Role.SYSTEM,
                            content=f"Conversation transferred to {target_agent}",
                        )
                    )

        active_agent = self._swarm.get_active_agent(session.id)

        # In a real swarm, the LLM itself calls the tools via ReAct or native function calling.
        # For now, we simulate swarm triage by having the SwarmCoordinator natively route based on intent if it's the Triage agent.
        # If the user asks for code while in Triage, we transfer to Coder.
        if active_agent.name == "TriageAgent" and not tool_result:
            lowered = text.lower()
            if "code" in lowered or "python" in lowered or "script" in lowered:
                self._swarm.set_active_agent(session.id, "CoderAgent")
                active_agent = self._swarm.get_active_agent(session.id)
                context.append(
                    Message(
                        role=Role.SYSTEM,
                        content="Swarm Orchestrator auto-transferred request to CoderAgent for specialized handling.",
                    )
                )
                used_tools.append("transfer_agent")

        chunks: list[str] = []
        async for token in active_agent.model.stream(context):
            chunks.append(token)
            await self._bus.publish(
                Event(
                    type=EventType.MODEL_TOKEN,
                    session_id=session.id,
                    payload={"token": token, "model": active_agent.name},
                )
            )

        response_text = "".join(chunks).strip()
        if not response_text and tool_result:
            response_text = tool_result.output
        assistant_message = Message(
            role=Role.ASSISTANT,
            content=response_text,
            metadata={"model": active_agent.model.name, "agent": active_agent.name},
        )
        await self._memory.add_message(session.id, assistant_message)
        await self._memory.add_semantic_memory(
            f"User: {text}\nAssistant: {response_text}", {"session_id": session.id}
        )

        response = ConversationResponse(
            text=response_text,
            session_id=session.id,
            model=f"{active_agent.name} ({active_agent.model.name})",
            used_tools=used_tools,
            memories=memories,
        )
        await self._bus.publish(
            Event(
                type=EventType.ASSISTANT_RESPONSE,
                session_id=session.id,
                payload=response.model_dump(),
            )
        )
        await self._bus.publish(
            Event(
                type=EventType.STATE_CHANGED,
                session_id=session.id,
                payload={
                    "state": AssistantState.IDLE,
                    "task": "Waiting for 'Hey Jarvis'",
                },
            )
        )
        return response

    async def _on_user_transcript(self, event: Event) -> None:
        text = str(event.payload.get("text", "")).strip()
        if not text:
            return
        try:
            await self.handle_text(text, event.session_id)
        except Exception as exc:
            self._logger.exception("conversation_turn_failed")
            await self._bus.publish(
                Event(
                    type=EventType.ERROR,
                    session_id=event.session_id,
                    payload={"error": str(exc)},
                )
            )

    def _build_context(
        self, session_id: str, text: str, recent: list[Message], memories: list[str]
    ) -> list[Message]:
        base_system = self._swarm.get_agent_system_prompt(session_id)

        system = (
            f"{base_system}\n\n"
            "You are Jarvis, a local-first AI operating system assistant. "
            "Be concise, useful, and explicit before taking computer actions. "
            "Use retrieved memory only when it is relevant."
        )
        if memories:
            system += "\nRelevant long-term memory:\n" + "\n".join(
                f"- {memory}" for memory in memories
            )
        return [
            Message(role=Role.SYSTEM, content=system),
            *recent,
            Message(role=Role.USER, content=text),
        ]

    async def _maybe_run_builtin_tool(self, text: str):
        lowered = text.lower()
        if "time" in lowered or "date" in lowered:
            return await self._tools.run("current_time", {})
        return None
