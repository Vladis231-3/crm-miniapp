"""Vercel serverless entrypoint: all /api/* rewrites land here.

Vercel forwards the original request path to this single ASGI app,
so `destination: /api/index` (without $1) is intentional: FastAPI
routes by the original URL, not by the rewritten file path.
Cold-start budget: Telegram HTTP calls must stay << maxDuration (15s).
Background threads (polling/outbox) are disabled via RUN_EMBEDDED_BOT=false.
"""
from backend.app.main import app
