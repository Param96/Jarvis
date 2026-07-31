"""FastAPI application factory."""

from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from jarvis_backend.api.routes import router as http_router
from jarvis_backend.api.websocket import router as websocket_router
from jarvis_backend.app.container import build_container
from jarvis_backend.config.settings import get_settings
from jarvis_backend.events.types import AssistantState, Event, EventType
from jarvis_backend.observability.logging import configure_logging


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Initialize and shut down application services."""

    settings = get_settings()
    configure_logging(settings.log_level)
    container = build_container(settings)
    app.state.container = container
    await container.start()
    await container.bus.publish(
        Event(type=EventType.SYSTEM_READY, payload={"state": AssistantState.IDLE})
    )
    try:
        yield
    finally:
        await container.stop()


def create_app() -> FastAPI:
    """Create the FastAPI app."""

    settings = get_settings()
    app = FastAPI(title=settings.app_name, lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["*"],
        allow_headers=["*"],
        allow_credentials=True,
    )
    app.include_router(http_router, prefix="/api")
    app.include_router(websocket_router)
    return app
