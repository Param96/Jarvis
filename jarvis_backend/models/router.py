"""Model routing policy."""

from dataclasses import dataclass

from jarvis_backend.config.settings import Settings
from jarvis_backend.models.providers import ChatModel
from jarvis_backend.schemas.conversation import Message


@dataclass(frozen=True)
class RoutingDecision:
    """Model selected for a request."""

    model: ChatModel
    reason: str


class ModelRouter:
    """Route simple tasks locally and complex tasks to cloud when available."""

    def __init__(
        self, 
        settings: Settings, 
        local_model: ChatModel, 
        cloud_model: ChatModel | None,
        cloud_coding_model: ChatModel | None = None
    ) -> None:
        self._settings = settings
        self._local_model = local_model
        self._cloud_model = cloud_model
        self._cloud_coding_model = cloud_coding_model

    def choose(self, user_text: str, context: list[Message]) -> RoutingDecision:
        """Choose the best configured model for the request."""

        text = user_text.lower()
        asks_for_complex_reasoning = any(
            keyword in text for keyword in self._settings.cloud_reasoning_keywords
        )
        long_context = sum(len(message.content) for message in context) > self._settings.local_max_prompt_chars

        asks_for_coding = any(
            keyword in text for keyword in getattr(self._settings, "cloud_coding_keywords", [])
        )

        if asks_for_coding and self._cloud_coding_model:
            return RoutingDecision(self._cloud_coding_model, "specialized_coding_model")

        if self._cloud_model and (asks_for_complex_reasoning or long_context):
            return RoutingDecision(self._cloud_model, "complex_or_long_context")

        return RoutingDecision(self._local_model, "fast_local_path")

