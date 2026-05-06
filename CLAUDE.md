# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Ocean Strike** — LLM-coached Battleship. 24-hour MVP for the nFactorial Incubator. The full product spec, scope tiers (T0 game → T1 Coach → T2 persistence → T3 polish), drop order, and rationale live in `SPEC.md` — read it before doing non-trivial work; it's the source of truth for product decisions.

## Stack

- **Backend:** FastAPI (Python 3.11) + LangChain + OpenAI `gpt-4o-mini`, managed with `uv`. Tests via `pytest` (asyncio mode). Lint via `ruff`.
- **Frontend:** Next.js 14 App Router + TypeScript + Tailwind + shadcn/ui, managed with `pnpm`.
- **DB:** Supabase Postgres. Migrations in `backend/migrations/*.sql` (apply manually in Supabase SQL editor; no migration runner is wired up).

## Common commands

Backend (from `backend/`):
```bash
uv sync                                              # install
uv run uvicorn app.main:app --reload                 # dev server :8000
uv run pytest                                        # all tests
uv run pytest tests/test_board.py::test_name         # single test
uv run ruff check .                                  # lint
uv run ruff format .                                 # format
```

Frontend (from `frontend/`):
```bash
pnpm install
pnpm dev          # :3000
pnpm build
pnpm lint
pnpm typecheck    # tsc --noEmit
```

Whole stack: `docker compose up` (uses root `.env`; copy from `.env.example`).

## Architecture

Server-authoritative game state — the frontend never knows where the bot's ships are. Bot logic is stateless: every move is recomputed from the persisted game in the DB, so backend restarts don't lose sessions. The LLM is **only** used for the post-game Coach analysis; it must never run on the gameplay hot path.

### Backend layout (`backend/app/`)

- `main.py` — FastAPI app, mounts the routers under `/api/*`.
- `api/` — thin HTTP layer: `users`, `games`, `analyze`, `stats`, `leaderboard`. Many handlers are currently stubs (`NotImplementedError`) — fill these in by composing `engine/` + `db/`.
- `engine/` — pure Python game logic, **no FastAPI/DB imports**. Unit-testable in isolation. Contains `board.py`, `fleet.py`, `coords.py`, `features.py`, and `bots/` (`random_bot`, `hunt_bot`, `prob_bot` for Easy/Medium/Hard). Keep this boundary clean — adding I/O here breaks the test seam.
- `coach/` — LangChain pipeline: `prompts.py`, `chain.py` (uses `with_structured_output` against a Pydantic model in `schemas/coach.py`), `archetypes.py`.
- `schemas/` — Pydantic request/response models (`user`, `game`, `shot`, `coach`).
- `db/supabase.py` — Supabase client wrapper.
- `config.py` — `pydantic-settings`, reads `.env`. `cors_origins_raw` is comma-separated.

The Coach pipeline is one-way: `engine/features.py` extracts behavioral features (parity adherence, post-hit follow-through, shot entropy, placement predictability, etc.) from the move log → features JSON is passed to the LLM → structured `CoachAnalysis` is returned. The LLM never sees raw coordinates, only patterns. See SPEC.md §8–9 for the feature list and prompt.

### API contract

The shape is fixed in SPEC.md §6. Notable: `POST /api/games/{id}/shoot` returns **both** the player's result and the bot's reply move in a single round-trip — preserve this when implementing.

### Frontend layout (`frontend/src/`)

- `app/` — App Router pages (currently a single `page.tsx`; review/stats/history/leaderboard pages from the spec are not yet built).
- `components/` — `Board`, `Cell`, `ShipPlacer`, `FleetStatus`, `CoachReport`, `UpgradeModal`, `ThemeToggle`.
- `hooks/useGame.ts`, `hooks/usePlacement.ts` — game and placement state (plain `useState`/`useReducer`, no Redux/Zustand).
- `lib/api.ts` — backend client; `lib/user.ts` — anonymous `user_id` in `localStorage`.

## Conventions

- Python: ruff line-length 100, target py311. `pytest-asyncio` is in `auto` mode — async tests don't need a marker.
- Anonymous-first auth: visitors get a server-generated UUID stored in `localStorage`; email/magic-link is an optional upgrade, not a gate.
- When implementing a stub endpoint, wire it through existing `engine/` and `schemas/` rather than adding ad-hoc logic in the route handler.
