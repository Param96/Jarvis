"""PostgreSQL pgvector implementation of the memory store."""

import json
from uuid import uuid4

import asyncpg
from pgvector.asyncpg import register_vector
import openai

from jarvis_backend.schemas.conversation import Message, Role, Session


class PgVectorMemoryStore:
    """PostgreSQL pgvector store with semantic retrieval."""

    def __init__(
        self,
        dsn: str,
        cloud_api_key: str | None = None,
        cloud_base_url: str | None = None,
    ) -> None:
        self.dsn = dsn
        self.pool: asyncpg.Pool | None = None
        self._openai_client = None
        if cloud_api_key:
            self._openai_client = openai.AsyncOpenAI(
                api_key=cloud_api_key, base_url=cloud_base_url
            )
        self.embedding_model = "text-embedding-3-small"

    async def initialize(self) -> None:
        """Create tables and connect."""
        self.pool = await asyncpg.create_pool(self.dsn)

        async with self.pool.acquire() as conn:
            await conn.execute("CREATE EXTENSION IF NOT EXISTS vector")
            await register_vector(conn)

            await conn.execute("""
                CREATE TABLE IF NOT EXISTS sessions (
                    id TEXT PRIMARY KEY,
                    title TEXT,
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
                    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
                )
            """)

            await conn.execute("""
                CREATE TABLE IF NOT EXISTS messages (
                    id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL REFERENCES sessions(id),
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    metadata JSONB NOT NULL DEFAULT '{}',
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL
                )
            """)

            await conn.execute("""
                CREATE TABLE IF NOT EXISTS semantic_memories (
                    id TEXT PRIMARY KEY,
                    text TEXT NOT NULL,
                    metadata JSONB NOT NULL DEFAULT '{}',
                    embedding vector(1536),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )
            """)

            await conn.execute("""
                CREATE TABLE IF NOT EXISTS semantic_code (
                    id TEXT PRIMARY KEY,
                    file_path TEXT NOT NULL,
                    content TEXT NOT NULL,
                    embedding vector(1536),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )
            """)

    async def _get_embedding(self, text: str) -> list[float]:
        if not self._openai_client:
            # Fallback for local dev if openai is not configured
            # For a real offline setup, you'd use sentence-transformers here
            return [0.0] * 1536

        try:
            response = await self._openai_client.embeddings.create(
                input=text, model=self.embedding_model
            )
            return response.data[0].embedding
        except Exception:
            return [0.0] * 1536

    async def ensure_session(self, session_id: str | None = None) -> Session:
        session = Session(id=session_id) if session_id else Session()
        async with self.pool.acquire() as conn:
            existing = await conn.fetchval(
                "SELECT id FROM sessions WHERE id = $1", session.id
            )
            if existing:
                await conn.execute(
                    "UPDATE sessions SET updated_at = $1 WHERE id = $2",
                    session.updated_at,
                    session.id,
                )
            else:
                await conn.execute(
                    "INSERT INTO sessions (id, title, created_at, updated_at) VALUES ($1, $2, $3, $4)",
                    session.id,
                    session.title,
                    session.created_at,
                    session.updated_at,
                )
        return session

    async def add_message(self, session_id: str, message: Message) -> None:
        async with self.pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO messages (id, session_id, role, content, metadata, created_at)
                VALUES ($1, $2, $3, $4, $5, $6)
                """,
                str(uuid4()),
                session_id,
                message.role.value,
                message.content,
                json.dumps(message.metadata),
                message.created_at,
            )
            await conn.execute(
                "UPDATE sessions SET updated_at = $1 WHERE id = $2",
                message.created_at,
                session_id,
            )

    async def clear_messages(self, session_id: str) -> None:
        async with self.pool.acquire() as conn:
            await conn.execute("DELETE FROM messages WHERE session_id = $1", session_id)

    async def recent_messages(self, session_id: str, limit: int = 12) -> list[Message]:
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT role, content, metadata FROM messages
                WHERE session_id = $1
                ORDER BY created_at DESC
                LIMIT $2
                """,
                session_id,
                limit,
            )

        return [
            Message(
                role=Role(row["role"]),
                content=row["content"],
                metadata=(
                    json.loads(row["metadata"])
                    if isinstance(row["metadata"], str)
                    else row["metadata"]
                ),
            )
            for row in reversed(rows)
        ]

    async def add_semantic_memory(
        self,
        text: str,
        metadata: dict[str, str] | None = None,
    ) -> str:
        memory_id = str(uuid4())
        embedding = await self._get_embedding(text)

        async with self.pool.acquire() as conn:
            await conn.execute(
                "INSERT INTO semantic_memories (id, text, metadata, embedding) VALUES ($1, $2, $3, $4)",
                memory_id,
                text,
                json.dumps(metadata or {}),
                embedding,
            )

        return memory_id

    async def search_semantic_memory(self, query: str, limit: int = 5) -> list[str]:
        embedding = await self._get_embedding(query)

        async with self.pool.acquire() as conn:
            await register_vector(conn)
            # `<=>` is cosine distance in pgvector
            rows = await conn.fetch(
                """
                SELECT text FROM semantic_memories 
                ORDER BY embedding <=> $1 
                LIMIT $2
                """,
                embedding,
                limit,
            )
        return [row["text"] for row in rows]

    async def add_code_chunk(self, file_path: str, content: str) -> None:
        chunk_id = str(uuid4())
        embedding = await self._get_embedding(content)

        async with self.pool.acquire() as conn:
            # Delete old chunks for this file
            await conn.execute(
                "DELETE FROM semantic_code WHERE file_path = $1", file_path
            )
            await conn.execute(
                "INSERT INTO semantic_code (id, file_path, content, embedding) VALUES ($1, $2, $3, $4)",
                chunk_id,
                file_path,
                content,
                embedding,
            )

    async def search_code(self, query: str, limit: int = 5) -> list[dict[str, str]]:
        embedding = await self._get_embedding(query)

        async with self.pool.acquire() as conn:
            await register_vector(conn)
            rows = await conn.fetch(
                """
                SELECT file_path, content FROM semantic_code 
                ORDER BY embedding <=> $1 
                LIMIT $2
                """,
                embedding,
                limit,
            )

        return [
            {"file_path": row["file_path"], "content": row["content"]} for row in rows
        ]
