from jarvis_backend.memory.store import SQLiteMemoryStore
from jarvis_backend.schemas.conversation import Message, Role


import pytest


@pytest.mark.asyncio
async def test_memory_round_trip(tmp_path):
    store = SQLiteMemoryStore(tmp_path / "jarvis.sqlite3")
    await store.initialize()
    session = await store.ensure_session()
    await store.add_message(
        session.id, Message(role=Role.USER, content="remember blue notebooks")
    )
    await store.add_semantic_memory("The user likes blue notebooks.")

    recent = await store.recent_messages(session.id)
    memories = await store.search_semantic_memory("blue notebooks")

    assert recent[0].content == "remember blue notebooks"
    assert memories == ["The user likes blue notebooks."]
