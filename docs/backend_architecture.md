# Jarvis Backend Architecture

## Architecture Decisions

Jarvis is organized as an event-driven backend rather than a monolithic listener. Audio, conversation, model routing, memory, speech, tools, and client communication are independent services wired through a small dependency container. This keeps latency-sensitive audio work isolated while allowing the assistant to grow into cloud models, vector memory, screen understanding, and automation without rewriting the core loop.

The default memory store is SQLite because it is local-first, durable, and zero-ops. The `MemoryStore` interface is intentionally narrow so ChromaDB or PostgreSQL with pgvector can replace or augment semantic retrieval later.

The model router prefers a local Ollama model for short or simple turns and escalates to a cloud-compatible provider only when the prompt is long or reasoning-heavy and a cloud API key is configured.

Automation is mediated through a permission service. Tools declare metadata, run through a registry, and can be disabled or constrained by environment variables.

## Folder Structure

```text
Jarvis/
  app.py                         FastAPI entry point
  listener.py                    Standalone microphone runner
  requirements.txt               Backend dependencies
  docs/backend_architecture.md   System design notes
  data/                          Local runtime state
  jarvis_backend/
    api/                         HTTP and WebSocket routes
    app/                         App factory and dependency container
    audio/                       Wake word, STT, TTS, audio helpers
    config/                      Environment settings
    core/                        Lifecycle contracts
    events/                      Typed events and async bus
    memory/                      Session and semantic memory stores
    models/                      Local/cloud model adapters and router
    observability/               Logging setup
    safety/                      Permission enforcement
    schemas/                     Pydantic request/response objects
    services/                    Conversation and speech orchestration
    tools/                       Tool interface, registry, built-ins
    workers/                     Reserved for background processors
  tests/                         Unit tests
```

## Event Flow

```text
AudioPipeline
  -> audio.wake_word_detected
  -> state.changed: LISTENING
  -> conversation.user_transcript

ConversationService
  -> state.changed: PROCESSING
  -> persist user message
  -> retrieve recent messages and semantic memory
  -> optional tool execution
  -> ModelRouter chooses local or cloud model
  -> model.token events stream to WebSocket clients
  -> persist assistant response and semantic memory
  -> conversation.assistant_response
  -> state.changed: IDLE

SpeechService
  -> state.changed: SPEAKING
  -> TTS speak
  -> audio.tts_finished
```

## Memory Architecture

Short-term memory is session-scoped chat history stored in SQLite. Long-term memory is a semantic-memory table with lightweight lexical retrieval today. The interface supports replacing retrieval with ChromaDB or pgvector embeddings while keeping conversation orchestration unchanged.

## Model Routing

`ModelRouter` receives the user turn and assembled context. It chooses:

- Local Ollama for low-latency default responses.
- Cloud OpenAI-compatible chat completions when enabled and the request suggests complex reasoning or the assembled context exceeds `JARVIS_LOCAL_MAX_PROMPT_CHARS`.
- Deterministic disabled fallback when no model service is available.

## Audio Pipeline

The microphone path runs blocking audio capture in a worker thread and publishes events back onto the asyncio event loop. OpenWakeWord detects `hey_jarvis`, SpeechRecognition captures a command by default, and Faster-Whisper is available as a file-based adapter for higher quality STT integration.

TTS is pluggable:

- `disabled` for backend-only operation.
- `system` for macOS `say`.
- `piper` for a local Piper voice model.

## Tool Execution Framework

Tools implement `Tool.run()` and expose a `ToolSpec`. The registry provides a single execution surface for agents and future model tool calls. Built-ins include current time, text file reading within allowed roots, and terminal command execution when explicitly enabled.

## FastAPI Structure

HTTP routes live under `/api`:

- `GET /api/health`
- `GET /api/tools`
- `POST /api/conversation`

The realtime channel is `/ws`.

## WebSocket Design

Clients send:

```json
{"type": "conversation.text", "text": "what time is it?", "session_id": "optional"}
```

Clients receive typed backend events:

```json
{"type": "model.token", "payload": {"token": "...", "model": "ollama:llama3.2"}}
```

The server also emits `conversation.done` for direct WebSocket text requests.

## Configuration

Settings are loaded from environment variables prefixed with `JARVIS_` and optional `.env`.

Common settings:

```bash
JARVIS_WAKE_WORD_ENABLED=true
JARVIS_TTS_PROVIDER=disabled
JARVIS_LOCAL_MODEL_PROVIDER=ollama
JARVIS_LOCAL_MODEL_NAME=llama3.2
JARVIS_LOCAL_MODEL_BASE_URL=http://localhost:11434
JARVIS_CLOUD_MODEL_PROVIDER=disabled
JARVIS_CLOUD_API_KEY=
JARVIS_ALLOW_TERMINAL_TOOLS=false
```

## Setup

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --reload
```

For local model responses, start Ollama separately and pull the configured model:

```bash
ollama pull llama3.2
ollama serve
```

For backend-only testing without microphone access:

```bash
JARVIS_WAKE_WORD_ENABLED=false uvicorn app:app --reload
```

## Testing

```bash
pytest
python -m compileall jarvis_backend app.py listener.py
```

