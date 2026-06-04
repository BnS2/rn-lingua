# Vision Agent

Voice-only AI language teacher service for the Duolingo clone.

It uses:

- Stream Edge for real-time transport
- Gemini Realtime for speech-to-speech conversation
- Varlock for validated environment loading
- `../.env` for shared Stream keys
- `./.env` for service-only local secrets

Required environment variables:

```bash
STREAM_API_KEY=...
STREAM_API_SECRET=...
GOOGLE_API_KEY=...
```

Use Python 3.12 or 3.13 for the agent environment. Python 3.14 is not supported
by this service because the realtime audio stack is more stable on the Python
versions targeted by Vision Agents.

For this Expo app, the service also accepts the existing
`EXPO_PUBLIC_STREAM_API_KEY` from the parent `.env` and maps it to
`STREAM_API_KEY` at startup.

Preferred local run with Varlock:

```bash
npx varlock run --path . -- uv run main.py run
```

If `uv` created the environment with a newer Python, rebuild it from this folder:

```bash
uv venv --python 3.12
uv sync
```

Preferred HTTP service run with Varlock:

```bash
npx varlock run --path . -- uv run main.py serve --host 0.0.0.0 --port 8000
```

Use only the service path with Varlock so the standalone agent does not validate
app-only secrets such as `CLERK_SECRET_KEY`. The service still reads `../.env`
at startup for shared Stream values.

Direct local fallback:

```bash
uv run main.py run
uv run main.py serve --host 0.0.0.0 --port 8000
```

Optional configuration:

```bash
VISION_AGENT_SELECTED_LANGUAGE=Spanish
GEMINI_REALTIME_MODEL=gemini-3-flash-preview
```
