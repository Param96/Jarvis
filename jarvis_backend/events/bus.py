"""Async in-process event bus."""

import asyncio
import logging
from collections import defaultdict
from collections.abc import Awaitable, Callable

from jarvis_backend.events.types import Event, EventType

Subscriber = Callable[[Event], Awaitable[None]]


class EventBus:
    """Small pub-sub bus for event-driven service coordination."""

    def __init__(self) -> None:
        self._subscribers: dict[EventType, list[Subscriber]] = defaultdict(list)
        self._all_subscribers: list[Subscriber] = []
        self._logger = logging.getLogger(__name__)

    def subscribe(self, event_type: EventType, subscriber: Subscriber) -> None:
        """Subscribe an async callable to a specific event type."""

        self._subscribers[event_type].append(subscriber)

    def subscribe_all(self, subscriber: Subscriber) -> None:
        """Subscribe an async callable to every event."""

        self._all_subscribers.append(subscriber)

    async def publish(self, event: Event) -> None:
        """Publish an event to matching subscribers concurrently."""

        subscribers = [*self._subscribers[event.type], *self._all_subscribers]
        if not subscribers:
            return

        results = await asyncio.gather(
            *(subscriber(event) for subscriber in subscribers),
            return_exceptions=True,
        )
        for result in results:
            if isinstance(result, Exception):
                self._logger.exception("event_subscriber_failed", exc_info=result)
