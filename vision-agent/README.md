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

For this Expo app, the service also accepts the existing
`EXPO_PUBLIC_STREAM_API_KEY` from the parent `.env` and maps it to
`STREAM_API_KEY` at startup.

Preferred local run with Varlock:

```bash
npx varlock run --path .. --path . -- uv run main.py run
```

Preferred HTTP service run with Varlock:

```bash
npx varlock run --path .. --path . -- uv run main.py serve --host 0.0.0.0 --port 8000
```

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
