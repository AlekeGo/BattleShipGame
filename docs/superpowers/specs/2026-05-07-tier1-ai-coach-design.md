# Tier 1 — AI Coach: Design Spec

## Overview

Post-game LLM coaching pipeline. After a game finishes, behavioral features are extracted from the move log and passed to a LangChain chain backed by `gpt-4o-mini`. The result is a structured `CoachAnalysis` (archetype, top_mistake, 3 tips, did_well) stored in the `analyses` table and rendered on the `/game/[id]/review` page.

## Architecture

```
/shoot (game_over=True)
  └─ asyncio.create_task(_precompute_analysis(game_id, ...))  # fire-and-forget

POST /api/games/{id}/analyze
  ├─ check analyses table → HIT: return cached
  └─ MISS:
       ├─ fetch game (must be status=finished)
       ├─ extract_features(moves, player_ships, mode)
       ├─ coach.analyze(features, outcome, bot_difficulty)
       ├─ analyses_repo.create(...)
       └─ return CoachAnalysis
```

## Components

### `engine/features.py` — `extract_features(moves, player_ships, bot_difficulty) -> dict`

Computes 9 behavioral metrics (no LLM, pure Python):
- `total_shots` — count of player moves
- `accuracy_pct` — hits / total_shots × 100
- `parity_adherence` — % hunt-phase shots on even-parity cells `(r+c) % 2 == 0`
- `post_hit_followthrough` — after a hit, % of next ≤4 shots that are adjacent to the hit cell
- `shot_entropy` — Shannon entropy of shot distribution across 4 quadrants
- `wasted_shots_after_sink` — shots into cleared zones around sunk ships
- `placement_corners` — count of player ships touching a board corner
- `placement_edges` — count of player ships touching an edge (but not corner)
- `avg_time_per_shot` — mean ms between shots if `ts` in moves, else null

Hunt phase = before first hit; targeting phase = after first hit until ship sunk, then back to hunt.

### `db/repositories/analyses.py`

- `get(game_id)` → row dict or None (simple `.maybe_single()` query)
- `create(game_id, features, archetype, top_mistake, tips, did_well, llm_raw)` → row dict

### `deps.py`

Add `get_analyses_repo(db=Depends(get_supabase)) -> AnalysesRepo`.

### `api/analyze.py`

```
POST /api/games/{id}/analyze
  1. analyses_repo.get(game_id) → return if exists
  2. games_repo.get(game_id) → 404 if missing, 400 if not finished
  3. extract_features(moves, player_ships, mode)
  4. await coach.analyze(features, outcome, bot_difficulty)
  5. analyses_repo.create(...)
  6. return CoachAnalysis
```

### `api/games.py` — precompute hook

In `/shoot`, when `game_over=True`, after saving state:
```python
asyncio.create_task(_precompute_analysis(game_id, games_repo, analyses_repo))
```
This starts LLM work ~5s before user lands on review page.

### Frontend — `CoachReport.tsx`

Already functional. Minor polish: replace plain "Analyzing…" text with a subtle loading skeleton (3 animated bars).

## Key Decisions

- **Idempotent endpoint**: DB cache checked first, LLM never called twice per game.
- **Fire-and-forget precompute**: avoids coupling `/shoot` latency to LLM call; errors are swallowed silently.
- **Features are pure Python**: `engine/features.py` has no FastAPI/DB imports — stays unit-testable.
- **LLM raw response stored**: `llm_raw` column in `analyses` preserves full OpenAI response for debugging.

## What's Out of Scope

- Streaming the coach response to the UI (gpt-4o-mini is fast enough)
- Per-move analysis (roadmap item)
- Hotseat mode coaching (no bot difficulty to calibrate against)
