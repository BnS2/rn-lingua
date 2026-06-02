---
name: Agent
description: Use when building real-time voice or video AI agents, integrating with LLMs and speech services, deploying agents to production, or adding function calling and tool integration to agents
metadata:
    mintlify-proj: agent
    version: "1.0"
---

# Vision Agents Skill

## Product Summary

Vision Agents is an open-source Python framework for building real-time voice and video AI agents. It orchestrates LLMs, speech-to-text (STT), text-to-speech (TTS), video processors, and external tools via a modular `Agent` class. The framework ships with Stream's global edge network for low-latency WebRTC transport but is transport-agnostic. Key files: `main.py` (agent definition), `.env` (API keys), `pyproject.toml` (dependencies). CLI commands: `uv run agent.py run` (console mode), `uv run agent.py serve` (HTTP server). 30+ integrations for LLMs (OpenAI, Gemini, Anthropic), STT (Deepgram, ElevenLabs), TTS, vision models, and avatars. Primary docs: https://visionagents.ai

## When to Use

Reach for this skill when:
- **Building voice agents**: Custom STT/LLM/TTS pipelines, realtime speech-to-speech models, phone integration via Twilio
- **Building video agents**: Real-time video analysis with VLMs, object detection with YOLO, pose estimation, video processors
- **Adding function calling**: Register Python functions as tools, integrate MCP servers for external APIs
- **Deploying to production**: Docker/Kubernetes setup, HTTP server for multi-session deployments, horizontal scaling with Redis
- **Monitoring agents**: OpenTelemetry metrics, Prometheus/Jaeger tracing, event subscriptions for debugging
- **Testing agents**: Text-only testing without audio/video infrastructure, LLM-as-judge evaluation
- **Integrating external services**: Phone calls (Twilio), knowledge bases (RAG), avatars, custom plugins

## Quick Reference

### Agent Constructor

```python
Agent(
    edge=getstream.Edge(),                    # Transport layer
    agent_user=User(name="...", id="..."),    # Agent identity
    instructions="...",                        # System prompt
    llm=gemini.Realtime() or openai.LLM(),    # Language model
    stt=deepgram.STT(),                       # Speech-to-text (optional in realtime)
    tts=elevenlabs.TTS(),                     # Text-to-speech (optional in realtime)
    processors=[yolo_processor],              # Video processors
    mcp_servers=[server1, server2],           # External tools
)
```

### Core Methods

| Method | Purpose |
|--------|---------|
| `await agent.join(call)` | Join a call (async context manager) |
| `await agent.simple_response(text)` | Send prompt to LLM, speak response |
| `await agent.say(text)` | Speak text directly (bypass LLM) |
| `await agent.finish()` | Wait for call to end |
| `await agent.close()` | Clean up resources |
| `@agent.events.subscribe` | Subscribe to events (ParticipantJoined, UserTranscript, etc.) |
| `@llm.register_function()` | Register Python function as tool |

### CLI Commands

```bash
uv run agent.py run                           # Console mode (single agent)
uv run agent.py serve --host 0.0.0.0 --port 8000  # HTTP server
uv run agent.py run --video-track-override=/path/to/video.mp4  # Debug with local video
```

### Environment Variables

Store API keys in `.env`:
```bash
STREAM_API_KEY=...
STREAM_API_SECRET=...
GOOGLE_API_KEY=...
DEEPGRAM_API_KEY=...
ELEVENLABS_API_KEY=...
OPENAI_API_KEY=...
```

Vision Agents auto-loads these for each plugin.

### Plugin Installation

```bash
uv add "vision-agents[getstream,gemini,deepgram,elevenlabs]"
```

Common extras: `getstream` (transport), `gemini`/`openai` (LLM), `deepgram`/`elevenlabs` (STT/TTS), `ultralytics` (YOLO), `anthropic`/`xai` (LLM).

## Decision Guidance

### Realtime vs Custom Pipeline

| Scenario | Use | Why |
|----------|-----|-----|
| Fastest path, lowest latency | `gemini.Realtime()` or `openai.Realtime()` | Built-in STT/TTS, ~50ms latency, simplest code |
| Full control over STT/LLM/TTS | `deepgram.STT()` + `gemini.LLM()` + `elevenlabs.TTS()` | Mix providers, custom turn detection, function calling |
| Video understanding | `gemini.Realtime(fps=3)` | Stream frames directly to model |
| Computer vision detection | `ultralytics.YOLOPoseProcessor()` | Run local ML models, annotate frames |

### Deployment Mode

| Scenario | Use | Why |
|----------|-----|-----|
| Development, testing | `uv run agent.py run` | Single agent, console output, easy debugging |
| Production, multi-session | `uv run agent.py serve` + HTTP API | Spawn agents on demand, session limits, metrics |
| Custom transport (gRPC, etc.) | `AgentLauncher` directly | Transport-agnostic, build your own interface |

### Function Calling

| Scenario | Use | Why |
|----------|-----|-----|
| Simple Python functions | `@llm.register_function()` | Automatic conversion to LLM format |
| External APIs, tools | MCP servers (`MCPServerLocal`, `MCPServerRemote`) | Standardized tool discovery, multiple servers |

## Workflow

### 1. Build a Voice Agent

1. **Initialize project**: `uv init --python 3.12 my-agent && cd my-agent && uv add "vision-agents[getstream,gemini,deepgram,elevenlabs]" python-dotenv`
2. **Add `.env`**: Set `STREAM_API_KEY`, `STREAM_API_SECRET`, `GOOGLE_API_KEY`, `DEEPGRAM_API_KEY`, `ELEVENLABS_API_KEY`
3. **Write `main.py`**:
   - Define `async def create_agent(**kwargs) -> Agent` — factory function
   - Define `async def join_call(agent, call_type, call_id, **kwargs)` — join logic
   - Create `Runner(AgentLauncher(create_agent=..., join_call=...)).cli()`
4. **Test locally**: `uv run main.py run` — opens browser, test in console
5. **Register tools** (optional): Use `@llm.register_function()` for function calling
6. **Deploy**: Docker + Kubernetes or `uv run main.py serve` for HTTP server

### 2. Add Function Calling

1. **Register function**:
   ```python
   @llm.register_function(description="Get weather for a location")
   async def get_weather(location: str) -> dict:
       return {"temp": "22C", "condition": "Sunny"}
   ```
2. **LLM calls automatically** when relevant to conversation
3. **Test with TestSession**:
   ```python
   async with TestSession(llm=llm, instructions="...") as session:
       response = await session.simple_response("Weather in London?")
       response.assert_function_called("get_weather", arguments={"location": "London"})
   ```

### 3. Deploy to Production

1. **Create Dockerfile** (CPU):
   ```dockerfile
   FROM python:3.13-slim
   WORKDIR /app
   RUN pip install uv
   COPY pyproject.toml uv.lock agent.py ./
   ENV UV_LINK_MODE=copy
   CMD ["sh", "-c", "uv sync --frozen && uv run agent.py serve --host 0.0.0.0 --port 8080"]
   ```
2. **Build for Linux**: `docker buildx build --platform linux/amd64 -t vision-agent .`
3. **Set environment variables** in container (API keys via secrets)
4. **For scaling**: Use HTTP server with Redis session registry (see Horizontal Scaling guide)
5. **Monitor**: Enable Prometheus metrics, set up Jaeger tracing

### 4. Subscribe to Events

1. **Import event type**: `from vision_agents.core.edge.events import ParticipantJoinedEvent`
2. **Define async handler**:
   ```python
   @agent.events.subscribe
   async def on_join(event: ParticipantJoinedEvent):
       await agent.simple_response(f"Welcome, {event.participant.user_id}!")
   ```
3. **Common events**: `ParticipantJoinedEvent`, `UserTranscriptEvent`, `LLMResponseFinalEvent`, `ToolStartEvent`, `ToolEndEvent`

## Common Gotchas

- **Async-only functions**: `@llm.register_function()` only accepts async functions. Sync functions raise `ValueError`.
- **Event handlers are fire-and-forget**: Handlers run concurrently; don't rely on completion order. Use `agent.simple_response(..., interrupt=True)` for sequencing.
- **STT/TTS auto-disabled in realtime mode**: When using `gemini.Realtime()`, don't pass `stt` or `tts` — they're ignored.
- **Turn detection conflicts**: If STT has built-in turn detection (Deepgram, ElevenLabs), don't pass a separate `turn_detection` plugin.
- **Call IDs must match pattern**: `^[a-z0-9_-]+$` (lowercase alphanumeric, hyphens, underscores). Invalid IDs return HTTP 400.
- **Video override loops**: When using `--video-track-override`, the video plays at 30 FPS in a loop. Useful for testing, not production.
- **Agent idle timeout**: By default, agents disconnect after 60 seconds alone on a call. Set `agent_idle_timeout` in `AgentLauncher` to change.
- **Missing `.env` keys**: Vision Agents scans `.env` automatically. If a key is missing, the plugin fails silently at runtime. Always verify keys are set.
- **Realtime model latency**: Realtime models (OpenAI, Gemini) have lower latency but less control. Custom pipelines allow fine-tuning but add ~200-500ms.
- **Video processor overhead**: Running YOLO or other ML models on every frame is expensive. Use `fps` parameter to reduce frame rate (e.g., `fps=1` for 1 frame/sec).

## Verification Checklist

Before submitting agent code:

- [ ] `.env` file exists with all required API keys (STREAM_API_KEY, STREAM_API_SECRET, provider keys)
- [ ] `create_agent()` is async and returns an `Agent` instance
- [ ] `join_call()` is async and calls `agent.join(call)` as context manager
- [ ] `Runner(AgentLauncher(...)).cli()` is called in `if __name__ == "__main__"`
- [ ] Test locally: `uv run agent.py run` opens browser and agent responds
- [ ] Function calls (if used): `@llm.register_function()` decorators are on async functions
- [ ] Event handlers (if used): `@agent.events.subscribe` decorators are on async functions
- [ ] Deployment: Dockerfile uses `--platform linux/amd64` for cloud
- [ ] Metrics (if used): OpenTelemetry provider is configured before agent creation
- [ ] No sync functions registered as tools
- [ ] No hardcoded API keys in code (use `.env`)
- [ ] Call IDs match pattern `^[a-z0-9_-]+$` if hardcoded

## Resources

**Comprehensive navigation**: https://visionagents.ai/llms.txt

**Critical docs**:
1. [Quickstart](https://visionagents.ai/introduction/quickstart) — 5-minute setup
2. [Voice Agents](https://visionagents.ai/introduction/voice-agents) — STT/LLM/TTS pipelines, realtime models
3. [Built-in HTTP Server](https://visionagents.ai/guides/http-server) — Production deployment, API endpoints, session management

---

> For additional documentation and navigation, see: https://visionagents.ai/llms.txt