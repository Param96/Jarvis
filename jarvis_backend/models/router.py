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

    def __init__(self, settings: Settings, local_model: ChatModel, cloud_model: ChatModel | None) -> None:
        self._settings = settings
        self._local_model = local_model
        self._cloud_model = cloud_model

    def choose(self, user_text: str, context: list[Message]) -> RoutingDecision:
        """Choose the best configured model for the request."""

        text = user_text.lower()
        asks_for_complex_reasoning = any(
            keyword in text for keyword in self._settings.cloud_reasoning_keywords
        )
        long_context = sum(len(message.content) for message in context) > self._settings.local_max_prompt_chars

        if self._cloud_model and (asks_for_complex_reasoning or long_context):
            return RoutingDecision(self._cloud_model, "complex_or_long_context")

        return RoutingDecision(self._local_model, "fast_local_path")

