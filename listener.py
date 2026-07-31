"""Standalone microphone listener entry point for local Jarvis testing."""

import asyncio

from jarvis_backend.app.container import build_container
from jarvis_backend.config.settings import get_settings
from jarvis_backend.events.types import Event, EventType
from jarvis_backend.observability.logging import configure_logging


async def main() -> None:
    """Run the audio pipeline without starting the HTTP API."""

    settings = get_settings()
    configure_logging(settings.log_level)
    container = build_container(settings)
    await container.start()
    print("Jarvis listener is running. Press Ctrl+C to stop.")
    await container.bus.publish(
        Event(type=EventType.SYSTEM_READY, payload={"mode": "listener"})
    )
    try:
        while True:
            await asyncio.sleep(3600)
    finally:
        await container.stop()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Jarvis listener stopped.")
