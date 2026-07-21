"""Swarm Orchestration Service."""

import logging
from typing import Dict, Optional

from jarvis_backend.core.agent import Agent
from jarvis_backend.core.skills import SkillLoader

class SwarmCoordinator:
    """Manages handoffs between specialized agents."""

    def __init__(self, skill_loader: SkillLoader) -> None:
        self._agents: Dict[str, Agent] = {}
        self._active_agent_by_session: Dict[str, str] = {}
        self._default_agent_name: str | None = None
        self._logger = logging.getLogger(__name__)
        self._skill_loader = skill_loader
        self._loaded_skills = self._skill_loader.load_all_skills()

    def register_agent(self, agent: Agent, is_default: bool = False) -> None:
        self._agents[agent.name] = agent
        if is_default or not self._default_agent_name:
            self._default_agent_name = agent.name

    def get_agent(self, name: str) -> Optional[Agent]:
        return self._agents.get(name)

    def get_active_agent(self, session_id: str) -> Agent:
        agent_name = self._active_agent_by_session.get(session_id, self._default_agent_name)
        if agent_name and agent_name in self._agents:
            return self._agents[agent_name]
        
        # Fallback to first registered agent if any
        return next(iter(self._agents.values()))

    def set_active_agent(self, session_id: str, agent_name: str) -> bool:
        if agent_name in self._agents:
            self._active_agent_by_session[session_id] = agent_name
            self._logger.info(f"Session {session_id} transferred to agent {agent_name}")
            return True
        self._logger.warning(f"Failed to transfer session {session_id} to unknown agent {agent_name}")
        return False

    def get_agent_system_prompt(self, session_id: str) -> str:
        agent = self.get_active_agent(session_id)
        prompt = agent.instructions
        
        if agent.skills:
            prompt += "\n\n# Your Skills:\n"
            for skill_name in agent.skills:
                skill = self._loaded_skills.get(skill_name)
                if skill:
                    prompt += f"\n## Skill: {skill.name}\n{skill.instructions}\n"
        
        return prompt
