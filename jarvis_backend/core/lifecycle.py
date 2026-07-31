"""Lifecycle helpers for long-running async services."""

from abc import ABC, abstractmethod


class Service(ABC):
    """Base contract for services managed by the application runtime."""

    @abstractmethod
    async def start(self) -> None:
        """Start the service."""

    @abstractmethod
    async def stop(self) -> None:
        """Stop the service and release resources."""
