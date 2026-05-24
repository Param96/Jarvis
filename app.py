import uvicorn

from jarvis_backend.app.factory import create_app
from jarvis_backend.config.settings import get_settings

app = create_app()

if __name__ == "__main__":
    settings = get_settings()
    uvicorn.run("app:app", host=settings.host, port=settings.port, reload=False)
