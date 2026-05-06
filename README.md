# Battleship Coach

> The only Battleship that makes you better at Battleship.

LLM-powered Battleship with a post-game Coach that analyzes your behavioral patterns (shot entropy, parity discipline, post-hit follow-through, placement tendencies) and tells you, in plain language, how to play better.

See [SPEC.md](./SPEC.md) for the full technical specification.

## Stack

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui
- **Backend:** FastAPI (Python 3.11) + LangChain + OpenAI `gpt-4o-mini`
- **DB:** Supabase Postgres
- **Hosting:** Vercel (FE), Railway (BE)

## Local dev

```bash
# Backend
cd backend
uv sync
uv run uvicorn app.main:app --reload

# Frontend
cd frontend
pnpm install
pnpm dev
```

Copy `.env.example` to `.env` and fill in keys.

## What's different

- No ads, no paywalls on the core loop
- AI Coach that cites your actual moves, not generic advice
- Stat-driven progression: archetype evolution over time

## Roadmap

- Multiplayer-by-link (WebSocket rooms)
- 3-Minute Blitz mode
- Pro tier: custom skins, deep analytics
- School Tournament mode
- Coach Pro: per-move analysis
