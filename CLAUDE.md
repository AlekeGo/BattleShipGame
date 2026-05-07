# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Ocean Strike** — LLM-coached Battleship. 24-hour MVP for the nFactorial Incubator. The full product spec, scope tiers (T0 game → T1 Coach → T2 persistence → T3 polish), drop order, and rationale live in `SPEC.md` — read it before doing non-trivial work; it's the source of truth for product decisions.

## Stack

- **Backend:** FastAPI (Python 3.11) + LangChain + OpenAI `gpt-4o-mini`, managed with `uv`. Tests via `pytest` (asyncio mode). Lint via `ruff`.
- **Frontend:** Next.js 14 App Router + TypeScript + Tailwind + shadcn/ui, managed with `npm` (not pnpm — `npm install --legacy-peer-deps` due to peer dep conflicts).
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
npm install --legacy-peer-deps   # install (--legacy-peer-deps required)
npm run dev                      # :3000
npm run build
npm run lint
npm run typecheck                # tsc --noEmit
```

Whole stack: `docker compose up` (uses root `.env`; copy from `.env.example`).

## Architecture

Server-authoritative game state — the frontend never knows where the bot's ships are. Bot logic is stateless: every move is recomputed from the persisted game in the DB, so backend restarts don't lose sessions. The LLM is **only** used for the post-game Coach analysis; it must never run on the gameplay hot path.

### Backend layout (`backend/app/`)

- `main.py` — FastAPI app, mounts the routers under `/api/*`.
- `api/` — thin HTTP layer: `users`, `games`, `analyze`, `stats`, `leaderboard`. `users` and `games` are fully implemented; `analyze`, `stats`, `leaderboard` are stubs.
- `engine/` — pure Python game logic, **no FastAPI/DB imports**. Unit-testable in isolation. Contains `board.py`, `fleet.py` (includes `validate_fleet` and `auto_place`), `coords.py`, `features.py`, and `bots/` (`random_bot`, `hunt_bot`, `prob_bot` for Easy/Medium/Hard). Keep this boundary clean — adding I/O here breaks the test seam.
- `coach/` — LangChain pipeline: `prompts.py`, `chain.py` (uses `with_structured_output` against a Pydantic model in `schemas/coach.py`), `archetypes.py`.
- `schemas/` — Pydantic request/response models (`user`, `game`, `shot`, `coach`).
- `db/supabase.py` — Supabase client wrapper.
- `config.py` — `pydantic-settings`, reads `.env`. `cors_origins_raw` is comma-separated.

The Coach pipeline is one-way: `engine/features.py` extracts behavioral features (parity adherence, post-hit follow-through, shot entropy, placement predictability, etc.) from the move log → features JSON is passed to the LLM → structured `CoachAnalysis` is returned. The LLM never sees raw coordinates, only patterns. See SPEC.md §8–9 for the feature list and prompt.

### API contract

The shape is fixed in SPEC.md §6. Notable: `POST /api/games/{id}/shoot` returns **both** the player's result and the bot's reply move in a single round-trip — preserve this when implementing.

### Frontend layout (`frontend/src/`)

- `app/` — App Router pages: `/play` (mode select + ship placement), `/game/[id]` (active game), `/game/[id]/review` (Coach report stub), `/stats`, `/history`, `/leaderboard` (stubs).
- `components/` — `Board` (accepts `cellStates: Record<string, CellState>`), `Cell` (states: `empty/ship/hit/miss/sunk/preview`), `ShipPlacer` (click-to-place, R to rotate, hover preview), `FleetStatus`, `CoachReport`, `UpgradeModal`, `ThemeToggle`.
- `hooks/useGame.ts` — full game state: fetches game, handles shooting, builds `playerCells` and `enemyCells` maps for both boards.
- `hooks/usePlacement.ts` — placement state: tracks placed/unplaced ships, selected ship, orientation, hover preview, validates placement locally before submitting.
- `lib/api.ts` — backend client; `lib/user.ts` — anonymous `user_id` in `localStorage`; `lib/types.ts` — shared TS types.

## Tier 0 status (complete)

All Tier 0 features are implemented and tested:
- Engine: `Board`, `Ship`, `validate_fleet`, `auto_place`, `RandomBot`, `HuntBot`, `ProbBot` — 25 tests passing
- API: `POST /api/users/anon`, `POST /api/games`, `POST /api/games/{id}/place`, `POST /api/games/{id}/place-auto`, `POST /api/games/{id}/shoot`, `GET /api/games/{id}`
- Frontend: mode select → ship placement → active game with shoot interaction, hit/miss/sunk visuals, win/loss screen
- **Gap:** Hot-seat mode — backend handles it (no bot move returned), but frontend lacks a "pass device" overlay to hide ships between turns

## Bot state contract

When calling `bot.choose_shot(state)`, pass:
```python
{
    "shots": [[r, c], ...],       # all cells the bot has fired at
    "hits": [[r, c], ...],        # cells that returned "hit" or "sunk"
    "sunk_cells": [[r, c], ...],  # cells of fully sunk ships
    "remaining_ships": [int, ...], # sizes of player ships not yet sunk
}
```
The `/shoot` endpoint builds this from the move log by replaying shots on a fresh board (not from stored hits). This prevents double-counting.

## Key implementation notes

- **Board replay pattern:** The `shoot` endpoint always reconstructs board state by creating a fresh `Board` and replaying all moves from the move log — never trusts the `hits` field stored in JSONB ship dicts directly. This is the source of truth.
- **Next.js 14 params:** `params` in page components is a plain object (`{ id: string }`), not a Promise. Don't use `use(params)` — that's Next.js 15+.
- **Supabase client:** Uses synchronous supabase-py 2.x inside `async` FastAPI endpoints. Acceptable for hackathon scale.
- **CORS:** Backend allows `http://localhost:3000` by default. Change `CORS_ORIGINS` in `.env` for other origins.

## Conventions

- Python: ruff line-length 100, target py311. `pytest-asyncio` is in `auto` mode — async tests don't need a marker.
- Anonymous-first auth: visitors get a server-generated UUID stored in `localStorage`; email/magic-link is an optional upgrade, not a gate.
- When implementing a stub endpoint, wire it through existing `engine/` and `schemas/` rather than adding ad-hoc logic in the route handler.
- `deps.py` also exposes `get_auth_user` — an optional Bearer-token dependency that upserts an auth user from Supabase JWT. Use it on protected endpoints.
