"""Skill loader for dynamic agent capabilities."""

import logging
from pathlib import Path
from dataclasses import dataclass


@dataclass
class Skill:
    name: str
    instructions: str


class SkillLoader:
    def __init__(self, skills_dir: str | Path):
        self._skills_dir = Path(skills_dir)
        self._logger = logging.getLogger(__name__)

    def load_all_skills(self) -> dict[str, Skill]:
        skills = {}
        if not self._skills_dir.exists():
            return skills

        for skill_dir in self._skills_dir.iterdir():
            if not skill_dir.is_dir():
                continue

            skill_md = skill_dir / "SKILL.md"
            if skill_md.exists():
                try:
                    content = skill_md.read_text(encoding="utf-8")
                    name = skill_dir.name
                    skills[name] = Skill(name=name, instructions=content)
                except Exception as e:
                    self._logger.error(f"Failed to load skill {skill_dir.name}: {e}")

        return skills
