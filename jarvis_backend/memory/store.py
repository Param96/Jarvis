"""Memory storage abstractions and SQLite-backed implementation."""

import asyncio
import json
import math
import sqlite3
from collections import Counter
from pathlib import Path
from typing import Protocol
from uuid import uuid4

from jarvis_backend.schemas.conversation import Message, Role, Session


class MemoryStore(Protocol):
    """Persistent memory interface."""

    async def ensure_session(self, session_id: str | None = None) -> Session:
        """Create or return a session."""

    async def add_message(self, session_id: str, message: Message) -> None:
        """Persist a message."""

    async def recent_messages(self, session_id: str, limit: int = 12) -> list[Message]:
        """Return recent short-term memory."""

    async def add_semantic_memory(
        self,
        text: str,
        metadata: dict[str, str] | None = None,
    ) -> str:
        """Persist a long-term memory item."""

    async def search_semantic_memory(self, query: str, limit: int = 5) -> list[str]:
        """Return relevant long-term memories."""


class SQLiteMemoryStore:
    """SQLite store with session history and lightweight lexical retrieval."""

    def __init__(self, db_path: Path) -> None:
        self._db_path = db_path
        self._db_path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = asyncio.Lock()

    async def initialize(self) -> None:
        """Create tables."""

        async with self._lock:
            await asyncio.to_thread(self._initialize_sync)

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _initialize_sync(self) -> None:
        with self._connect() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS sessions (
                    id TEXT PRIMARY KEY,
                    title TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS messages (
                    id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    metadata TEXT NOT NULL DEFAULT '{}',
                    created_at TEXT NOT NULL,
                    FOREIGN KEY(session_id) REFERENCES sessions(id)
                );
                CREATE TABLE IF NOT EXISTS semantic_memories (
                    id TEXT PRIMARY KEY,
                    text TEXT NOT NULL,
                    metadata TEXT NOT NULL DEFAULT '{}',
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                );
                """
            )

    async def ensure_session(self, session_id: str | None = None) -> Session:
        session = Session(id=session_id) if session_id else Session()
        async with self._lock:
            await asyncio.to_thread(self._ensure_session_sync, session)
        return session

    def _ensure_session_sync(self, session: Session) -> None:
        with self._connect() as conn:
            existing = conn.execute("SELECT id FROM sessions WHERE id = ?", (session.id,)).fetchone()
            if existing:
                conn.execute(
                    "UPDATE sessions SET updated_at = ? WHERE id = ?",
                    (session.updated_at.isoformat(), session.id),
                )
                return
            conn.execute(
                "INSERT INTO sessions (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)",
                (session.id, session.title, session.created_at.isoformat(), session.updated_at.isoformat()),
            )

    async def add_message(self, session_id: str, message: Message) -> None:
        async with self._lock:
            await asyncio.to_thread(self._add_message_sync, session_id, message)

    def _add_message_sync(self, session_id: str, message: Message) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO messages (id, session_id, role, content, metadata, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    str(uuid4()),
                    session_id,
                    message.role.value,
                    message.content,
                    json.dumps(message.metadata),
                    message.created_at.isoformat(),
                ),
            )
            conn.execute(
                "UPDATE sessions SET updated_at = ? WHERE id = ?",
                (message.created_at.isoformat(), session_id),
            )

    async def recent_messages(self, session_id: str, limit: int = 12) -> list[Message]:
        async with self._lock:
            return await asyncio.to_thread(self._recent_messages_sync, session_id, limit)

    def _recent_messages_sync(self, session_id: str, limit: int) -> list[Message]:
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT role, content, metadata FROM messages
                WHERE session_id = ?
                ORDER BY created_at DESC
                LIMIT ?
                """,
                (session_id, limit),
            ).fetchall()
        return [
            Message(role=Role(row["role"]), content=row["content"], metadata=json.loads(row["metadata"]))
            for row in reversed(rows)
        ]

    async def add_semantic_memory(
        self,
        text: str,
        metadata: dict[str, str] | None = None,
    ) -> str:
        memory_id = str(uuid4())
        async with self._lock:
            await asyncio.to_thread(self._add_semantic_memory_sync, memory_id, text, metadata or {})
        return memory_id

    def _add_semantic_memory_sync(self, memory_id: str, text: str, metadata: dict[str, str]) -> None:
        with self._connect() as conn:
            conn.execute(
                "INSERT INTO semantic_memories (id, text, metadata) VALUES (?, ?, ?)",
                (memory_id, text, json.dumps(metadata)),
            )

    async def search_semantic_memory(self, query: str, limit: int = 5) -> list[str]:
        async with self._lock:
            memories = await asyncio.to_thread(self._all_memories_sync)
        scored = sorted(
            ((self._score(query, memory), memory) for memory in memories),
            key=lambda item: item[0],
            reverse=True,
        )
        return [memory for score, memory in scored[:limit] if score > 0]

    def _all_memories_sync(self) -> list[str]:
        with self._connect() as conn:
            rows = conn.execute("SELECT text FROM semantic_memories").fetchall()
        return [row["text"] for row in rows]

    @staticmethod
    def _score(query: str, text: str) -> float:
        query_terms = Counter(query.lower().split())
        text_terms = Counter(text.lower().split())
        if not query_terms or not text_terms:
            return 0.0
        dot = sum(query_terms[t] * text_terms[t] for t in query_terms)
        q_norm = math.sqrt(sum(v * v for v in query_terms.values()))
        t_norm = math.sqrt(sum(v * v for v in text_terms.values()))
        return dot / (q_norm * t_norm)
