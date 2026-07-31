"""Simple asyncio background task queue."""

import asyncio
import logging
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from uuid import uuid4

from jarvis_backend.core.lifecycle import Service

TaskCallable = Callable[[], Awaitable[None]]


@dataclass(frozen=True)
class BackgroundTask:
    """Queued background job."""

    id: str
    name: str
    run: TaskCallable


class BackgroundTaskQueue(Service):
    """In-process async worker for non-latency-critical work."""

    def __init__(self) -> None:
        self._queue: asyncio.Queue[BackgroundTask] = asyncio.Queue()
        self._worker: asyncio.Task[None] | None = None
        self._running = asyncio.Event()
        self._logger = logging.getLogger(__name__)

    async def start(self) -> None:
        self._running.set()
        self._worker = asyncio.create_task(self._run(), name="background-task-queue")

    async def stop(self) -> None:
        self._running.clear()
        if self._worker:
            self._worker.cancel()
            await asyncio.gather(self._worker, return_exceptions=True)

    async def enqueue(self, name: str, run: TaskCallable) -> str:
        task_id = str(uuid4())
        await self._queue.put(BackgroundTask(id=task_id, name=name, run=run))
        return task_id

    async def _run(self) -> None:
        while self._running.is_set():
            task = await self._queue.get()
            try:
                await task.run()
            except Exception:
                self._logger.exception(
                    "background_task_failed", extra={"task": task.name, "id": task.id}
                )
            finally:
                self._queue.task_done()
