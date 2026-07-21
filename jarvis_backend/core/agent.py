"""Agent abstraction for Swarm Orchestration."""

from dataclasses import dataclass
from jarvis_backend.models.providers import ChatModel

@dataclass
class Agent:
    """An AI persona that can participate in a swarm."""
    
    name: str
    instructions: str
    model: ChatModel
    allowed_tools: list[str]
    skills: list[str] = None

    def __post_init__(self):
        if self.skills is None:
            self.skills = []
