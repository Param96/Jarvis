"""FastAPI dependency accessors."""

from fastapi import Request

from jarvis_backend.app.container import Container


def get_container(request: Request) -> Container:
    """Return the application container."""

    return request.app.state.container

