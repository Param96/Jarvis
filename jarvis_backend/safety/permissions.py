"""Permission checks for actions that touch the host computer."""

from dataclasses import dataclass
from pathlib import Path

from jarvis_backend.config.settings import Settings


class PermissionDeniedError(RuntimeError):
    """Raised when an action is outside the configured safety policy."""


@dataclass(frozen=True)
class PermissionDecision:
    """Result of a permission check."""

    allowed: bool
    reason: str


class PermissionService:
    """Central safety layer for tools and automation."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    def require_terminal(self) -> None:
        """Ensure terminal execution is enabled."""

        if not self._settings.allow_terminal_tools:
            raise PermissionDeniedError("Terminal tools are disabled by configuration.")

    def require_filesystem_path(self, path: Path) -> None:
        """Ensure a path is within an allowed workspace root."""

        if not self._settings.allow_filesystem_tools:
            raise PermissionDeniedError(
                "File system tools are disabled by configuration."
            )
        resolved = path.expanduser().resolve()
        roots = [
            root.expanduser().resolve()
            for root in self._settings.allowed_workspace_roots
        ]
        if not any(resolved == root or root in resolved.parents for root in roots):
            raise PermissionDeniedError(f"Path is outside allowed roots: {resolved}")
