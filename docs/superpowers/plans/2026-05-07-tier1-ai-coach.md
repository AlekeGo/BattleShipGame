# Tier 1 — AI Coach Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the full AI Coach pipeline — behavioral feature extraction, LLM analysis via LangChain, DB persistence in `analyses` table, and the `/api/games/{id}/analyze` endpoint — so users get a structured post-game coach report on `/game/[id]/review`.

**Architecture:** `extract_features()` (pure Python, no I/O) computes 9 behavioral metrics from the move log → `coach.analyze()` (LangChain + gpt-4o-mini) returns a structured `CoachAnalysis` → saved to Supabase `analyses` table. The `/analyze` endpoint is idempotent (DB cache first). A fire-and-forget `asyncio.create_task` in `/shoot` pre-warms the cache when the game ends.

**Tech Stack:** Python 3.11, FastAPI, LangChain (`langchain>=0.3`, `langchain-openai>=0.2`), Supabase Postgres, Next.js 14 (frontend already wired).

---

## File Map

| Action | File |
|--------|------|
| Modify | `backend/app/engine/features.py` |
| Modify | `backend/app/db/repositories/analyses.py` |
| Modify | `backend/app/deps.py` |
| Modify | `backend/app/api/analyze.py` |
| Modify | `backend/app/api/games.py` |
| Modify | `backend/tests/test_features.py` |
| Modify | `frontend/src/components/CoachReport.tsx` |

---

## Task 1: Implement `extract_features()`

**Files:**
- Modify: `backend/app/engine/features.py`
- Modify: `backend/tests/test_features.py`

All commands run from `backend/`.

- [ ] **Step 1: Replace test_extract_features_stub with real tests**

Replace the entire content of `backend/tests/test_features.py`:

```python
import math
import pytest
from app.engine.features import extract_features


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_moves(coords_by: list[tuple[str, int, int, str]]) -> list[dict]:
    """coords_by: [(by, row, col, result), ...]  result in hit/miss/sunk"""
    moves = []
    for i, (by, r, c, result) in enumerate(coords_by):
        moves.append({"turn": i, "by": by, "coord": [r, c], "result": result})
    return moves


def _ship(row, col, size=2, orient="H", name="Destroyer") -> dict:
    return {"name": name, "size": size, "row": row, "col": col, "orientation": orient}


# ---------------------------------------------------------------------------
# total_shots
# ---------------------------------------------------------------------------

def test_total_shots_zero():
    feats = extract_features([], [], "pvbot_easy")
    assert feats["total_shots"] == 0


def test_total_shots_counts_only_player():
    moves = _make_moves([
        ("player", 0, 0, "miss"),
        ("bot",    1, 1, "miss"),
        ("player", 0, 2, "hit"),
    ])
    feats = extract_features(moves, [], "pvbot_easy")
    assert feats["total_shots"] == 2


# ---------------------------------------------------------------------------
# accuracy_pct
# ---------------------------------------------------------------------------

def test_accuracy_zero_shots():
    feats = extract_features([], [], "pvbot_easy")
    assert feats["accuracy_pct"] == 0.0


def test_accuracy_all_miss():
    moves = _make_moves([("player", 0, i, "miss") for i in range(5)])
    feats = extract_features(moves, [], "pvbot_easy")
    assert feats["accuracy_pct"] == 0.0


def test_accuracy_mixed():
    moves = _make_moves([
        ("player", 0, 0, "hit"),
        ("player", 0, 1, "miss"),
        ("player", 0, 2, "hit"),
        ("player", 0, 3, "miss"),
    ])
    feats = extract_features(moves, [], "pvbot_easy")
    assert feats["accuracy_pct"] == pytest.approx(50.0)


# ---------------------------------------------------------------------------
# parity_adherence
# ---------------------------------------------------------------------------

def test_parity_all_even():
    # Even parity: (r+c) % 2 == 0
    moves = _make_moves([
        ("player", 0, 0, "miss"),  # 0+0=0 even
        ("player", 0, 2, "miss"),  # 0+2=2 even
        ("player", 2, 0, "miss"),  # 2+0=2 even
    ])
    feats = extract_features(moves, [], "pvbot_easy")
    assert feats["parity_adherence"] == pytest.approx(100.0)


def test_parity_all_odd():
    moves = _make_moves([
        ("player", 0, 1, "miss"),  # odd
        ("player", 1, 0, "miss"),  # odd
    ])
    feats = extract_features(moves, [], "pvbot_easy")
    assert feats["parity_adherence"] == pytest.approx(0.0)


def test_parity_hunt_phase_only():
    # Hunt phase ends on first hit; shots after first hit are targeting phase
    moves = _make_moves([
        ("bot",    9, 9, "miss"),
        ("player", 0, 0, "miss"),   # hunt, even
        ("player", 0, 1, "miss"),   # hunt, odd
        ("player", 0, 2, "hit"),    # hunt, even — this ends hunt phase
        ("player", 0, 3, "sunk"),   # targeting phase — excluded
    ])
    feats = extract_features(moves, [], "pvbot_easy")
    # hunt shots: (0,0) even, (0,1) odd, (0,2) even → 2/3 ≈ 66.7
    assert feats["parity_adherence"] == pytest.approx(200/3, rel=1e-2)


# ---------------------------------------------------------------------------
# shot_entropy
# ---------------------------------------------------------------------------

def test_entropy_uniform():
    # 4 shots, one per quadrant → maximum entropy
    moves = _make_moves([
        ("player", 1, 1, "miss"),   # Q0 top-left
        ("player", 1, 6, "miss"),   # Q1 top-right
        ("player", 6, 1, "miss"),   # Q2 bottom-left
        ("player", 6, 6, "miss"),   # Q3 bottom-right
    ])
    feats = extract_features(moves, [], "pvbot_easy")
    expected = -4 * (0.25 * math.log2(0.25))  # 2.0 bits
    assert feats["shot_entropy"] == pytest.approx(expected, rel=1e-3)


def test_entropy_one_quadrant():
    moves = _make_moves([
        ("player", 0, 0, "miss"),
        ("player", 0, 1, "miss"),
        ("player", 1, 0, "miss"),
    ])
    feats = extract_features(moves, [], "pvbot_easy")
    assert feats["shot_entropy"] == pytest.approx(0.0)


# ---------------------------------------------------------------------------
# placement_corners / placement_edges
# ---------------------------------------------------------------------------

def test_placement_corners():
    # Ship at (0,0) H size 2 touches top-left corner
    ships = [_ship(0, 0, size=2, orient="H")]
    feats = extract_features([], ships, "pvbot_easy")
    assert feats["placement_corners"] == 1


def test_placement_edges_not_corner():
    # Ship at (0,3) H size 2 is on top edge, not corner
    ships = [_ship(0, 3, size=2, orient="H")]
    feats = extract_features([], ships, "pvbot_easy")
    assert feats["placement_edges"] == 1
    assert feats["placement_corners"] == 0


def test_placement_interior():
    ships = [_ship(4, 4, size=2, orient="H")]
    feats = extract_features([], ships, "pvbot_easy")
    assert feats["placement_corners"] == 0
    assert feats["placement_edges"] == 0


# ---------------------------------------------------------------------------
# avg_time_per_shot
# ---------------------------------------------------------------------------

def test_avg_time_no_timestamps():
    moves = _make_moves([("player", 0, 0, "miss")])
    feats = extract_features(moves, [], "pvbot_easy")
    assert feats["avg_time_per_shot"] is None


def test_avg_time_with_timestamps():
    moves = [
        {"turn": 0, "by": "player", "coord": [0, 0], "result": "miss", "ts": 1000},
        {"turn": 1, "by": "bot",    "coord": [1, 1], "result": "miss", "ts": 2000},
        {"turn": 2, "by": "player", "coord": [0, 2], "result": "miss", "ts": 3000},
        {"turn": 3, "by": "bot",    "coord": [2, 2], "result": "miss", "ts": 5000},
        {"turn": 4, "by": "player", "coord": [0, 4], "result": "miss", "ts": 7000},
    ]
    feats = extract_features(moves, [], "pvbot_easy")
    # Player shots at ts=1000, 3000, 7000 → gaps: 2000, 4000 → avg 3000
    assert feats["avg_time_per_shot"] == pytest.approx(3000.0)


# ---------------------------------------------------------------------------
# wasted_shots_after_sink
# ---------------------------------------------------------------------------

def test_wasted_shots_none():
    # No sunk ships → no wasted shots possible
    moves = _make_moves([("player", 0, 0, "miss"), ("player", 0, 1, "hit")])
    feats = extract_features(moves, [], "pvbot_easy")
    assert feats["wasted_shots_after_sink"] == 0


def test_wasted_shots_counted():
    # Ship at (0,0) H size 2 → cells (0,0) and (0,1)
    # After sinking it, shots at (0,0) or (0,1) again are wasted
    # But we track shots into the *cleared zone* (the sunk ship's cells)
    moves = [
        {"turn": 0, "by": "player", "coord": [0, 0], "result": "hit"},
        {"turn": 1, "by": "bot",    "coord": [9, 9], "result": "miss"},
        {"turn": 2, "by": "player", "coord": [0, 1], "result": "sunk"},
        {"turn": 3, "by": "bot",    "coord": [9, 8], "result": "miss"},
        # Shot into sunk ship's zone after it's been sunk
        {"turn": 4, "by": "player", "coord": [0, 0], "result": "miss"},
    ]
    ships = [_ship(0, 0, size=2, orient="H")]
    feats = extract_features(moves, ships, "pvbot_easy")
    assert feats["wasted_shots_after_sink"] == 1


# ---------------------------------------------------------------------------
# post_hit_followthrough
# ---------------------------------------------------------------------------

def test_post_hit_followthrough_adjacent():
    # Hit at (3,3), next shot at (3,4) is adjacent → 100%
    moves = _make_moves([
        ("player", 3, 3, "hit"),
        ("player", 3, 4, "sunk"),
    ])
    feats = extract_features(moves, [], "pvbot_easy")
    assert feats["post_hit_followthrough"] == pytest.approx(100.0)


def test_post_hit_followthrough_not_adjacent():
    # Hit at (3,3), next shot at (7,7) is not adjacent → 0%
    moves = _make_moves([
        ("player", 3, 3, "hit"),
        ("player", 7, 7, "miss"),
    ])
    feats = extract_features(moves, [], "pvbot_easy")
    assert feats["post_hit_followthrough"] == pytest.approx(0.0)
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && uv run pytest tests/test_features.py -v 2>&1 | head -40
```

Expected: FAIL — `NotImplementedError` raised by `extract_features`.

- [ ] **Step 3: Implement `extract_features()`**

Replace entire `backend/app/engine/features.py`:

```python
"""Behavioral feature extraction from a finished game's move log."""
import math


BOARD_SIZE = 10


def _is_adjacent(r1: int, c1: int, r2: int, c2: int) -> bool:
    return abs(r1 - r2) + abs(c1 - c2) == 1


def _ship_cells(ship: dict) -> list[tuple[int, int]]:
    cells = []
    r, c, size = ship["row"], ship["col"], ship["size"]
    for i in range(size):
        cells.append((r, c + i) if ship["orientation"] == "H" else (r + i, c))
    return cells


def _touches_corner(cells: list[tuple[int, int]]) -> bool:
    corners = {(0, 0), (0, BOARD_SIZE - 1), (BOARD_SIZE - 1, 0), (BOARD_SIZE - 1, BOARD_SIZE - 1)}
    return bool(set(cells) & corners)


def _touches_edge(cells: list[tuple[int, int]]) -> bool:
    return any(r == 0 or r == BOARD_SIZE - 1 or c == 0 or c == BOARD_SIZE - 1 for r, c in cells)


def extract_features(moves: list[dict], player_ships: list[dict], bot_difficulty: str) -> dict:
    """
    Returns a dict with keys:
      total_shots, accuracy_pct, parity_adherence, post_hit_followthrough,
      shot_entropy, wasted_shots_after_sink, placement_corners, placement_edges,
      avg_time_per_shot, bot_difficulty, outcome
    """
    player_moves = [m for m in moves if m["by"] == "player"]
    total_shots = len(player_moves)

    # accuracy_pct
    hits = [m for m in player_moves if m["result"] in ("hit", "sunk")]
    accuracy_pct = round(100.0 * len(hits) / total_shots, 2) if total_shots else 0.0

    # parity_adherence — hunt phase only (before first hit)
    hunt_shots: list[dict] = []
    for m in player_moves:
        hunt_shots.append(m)
        if m["result"] in ("hit", "sunk"):
            break
    parity_count = sum(1 for m in hunt_shots if (m["coord"][0] + m["coord"][1]) % 2 == 0)
    parity_adherence = round(100.0 * parity_count / len(hunt_shots), 2) if hunt_shots else 0.0

    # shot_entropy — Shannon entropy across 4 quadrants
    half = BOARD_SIZE // 2
    quadrants = [0, 0, 0, 0]
    for m in player_moves:
        r, c = m["coord"]
        q = (0 if r < half else 2) + (0 if c < half else 1)
        quadrants[q] += 1
    shot_entropy = 0.0
    if total_shots > 0:
        for count in quadrants:
            if count > 0:
                p = count / total_shots
                shot_entropy -= p * math.log2(p)
    shot_entropy = round(shot_entropy, 4)

    # post_hit_followthrough — after a hit, % of next ≤4 player shots adjacent to that hit
    follow_window = 4
    followthrough_checks: list[bool] = []
    for i, m in enumerate(player_moves):
        if m["result"] == "hit":
            hr, hc = m["coord"]
            subsequent = player_moves[i + 1 : i + 1 + follow_window]
            for s in subsequent:
                followthrough_checks.append(_is_adjacent(hr, hc, s["coord"][0], s["coord"][1]))
    post_hit_followthrough = (
        round(100.0 * sum(followthrough_checks) / len(followthrough_checks), 2)
        if followthrough_checks
        else 0.0
    )

    # wasted_shots_after_sink
    # Build the set of sunk-ship cells after each sunk result
    sunk_cells: set[tuple[int, int]] = set()
    # Map ship name → cells for quick lookup
    ship_cell_map: dict[str, list[tuple[int, int]]] = {
        s["name"]: _ship_cells(s) for s in player_ships
    }
    # Track which ships have been sunk by player shots
    sunk_ship_names: set[str] = set()
    wasted = 0
    for m in player_moves:
        r, c = m["coord"]
        if (r, c) in sunk_cells:
            wasted += 1
        if m["result"] == "sunk" and m.get("sunk_ship"):
            name = m["sunk_ship"]
            if name in ship_cell_map and name not in sunk_ship_names:
                sunk_ship_names.add(name)
                sunk_cells.update(ship_cell_map[name])

    # placement metrics
    placement_corners = 0
    placement_edges = 0
    for ship in player_ships:
        cells = _ship_cells(ship)
        if _touches_corner(cells):
            placement_corners += 1
        elif _touches_edge(cells):
            placement_edges += 1

    # avg_time_per_shot
    player_ts = [m["ts"] for m in player_moves if "ts" in m]
    if len(player_ts) >= 2:
        gaps = [player_ts[i + 1] - player_ts[i] for i in range(len(player_ts) - 1)]
        avg_time_per_shot = round(sum(gaps) / len(gaps), 1)
    else:
        avg_time_per_shot = None

    return {
        "total_shots": total_shots,
        "accuracy_pct": accuracy_pct,
        "parity_adherence": parity_adherence,
        "post_hit_followthrough": post_hit_followthrough,
        "shot_entropy": shot_entropy,
        "wasted_shots_after_sink": wasted,
        "placement_corners": placement_corners,
        "placement_edges": placement_edges,
        "avg_time_per_shot": avg_time_per_shot,
    }
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend && uv run pytest tests/test_features.py -v
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/engine/features.py backend/tests/test_features.py
git commit -m "feat: implement behavioral feature extraction (Tier 1)"
```

---

## Task 2: Implement `AnalysesRepo`

**Files:**
- Modify: `backend/app/db/repositories/analyses.py`

No new tests needed — this is a thin DB wrapper (integration tested implicitly by the endpoint test in Task 4).

- [ ] **Step 1: Replace analyses.py with full implementation**

```python
import json

from supabase import Client


class AnalysesRepo:
    def __init__(self, db: Client):
        self.db = db

    async def get(self, game_id: str) -> dict | None:
        res = (
            self.db.table("analyses")
            .select("*")
            .eq("game_id", game_id)
            .maybe_single()
            .execute()
        )
        return res.data

    async def create(
        self,
        game_id: str,
        features: dict,
        archetype: str,
        top_mistake: str,
        tips: list[str],
        did_well: str,
        llm_raw: dict,
    ) -> dict:
        payload = {
            "game_id": game_id,
            "features": json.dumps(features),
            "archetype": archetype,
            "top_mistake": top_mistake,
            "tips": json.dumps(tips),
            "did_well": did_well,
            "llm_raw": json.dumps(llm_raw),
        }
        res = self.db.table("analyses").insert(payload).execute()
        return res.data[0]
```

- [ ] **Step 2: Add `get_analyses_repo` to `deps.py`**

In `backend/app/deps.py`, add this import at the top:

```python
from app.db.repositories.analyses import AnalysesRepo
```

And add this function after `get_games_repo`:

```python
def get_analyses_repo(db: Client = Depends(get_supabase)) -> AnalysesRepo:
    return AnalysesRepo(db)
```

Also add `"get_analyses_repo"` to the `__all__` list.

- [ ] **Step 3: Commit**

```bash
git add backend/app/db/repositories/analyses.py backend/app/deps.py
git commit -m "feat: implement AnalysesRepo and get_analyses_repo dep"
```

---

## Task 3: Implement `/api/games/{id}/analyze` endpoint

**Files:**
- Modify: `backend/app/api/analyze.py`

- [ ] **Step 1: Replace analyze.py with full implementation**

```python
import asyncio
import json
import logging

from fastapi import APIRouter, Depends, HTTPException

from app.coach import chain as coach_chain
from app.db.repositories.analyses import AnalysesRepo
from app.db.repositories.games import GamesRepo
from app.deps import get_analyses_repo, get_games_repo
from app.engine.features import extract_features
from app.schemas.coach import CoachAnalysis

router = APIRouter()
logger = logging.getLogger(__name__)


def _parse(raw) -> list | dict:
    return raw if isinstance(raw, (list, dict)) else json.loads(raw)


def _build_analysis_response(row: dict) -> CoachAnalysis:
    tips = row["tips"] if isinstance(row["tips"], list) else json.loads(row["tips"])
    return CoachAnalysis(
        archetype=row["archetype"],
        top_mistake=row["top_mistake"],
        tips=tips,
        did_well=row["did_well"],
    )


async def _run_analysis(
    game_id: str,
    games_repo: GamesRepo,
    analyses_repo: AnalysesRepo,
) -> CoachAnalysis | None:
    """Core analysis logic — shared by endpoint and precompute task."""
    game = await games_repo.get(game_id)
    if not game or game["status"] != "finished":
        return None

    moves = _parse(game["moves"])
    player_board = _parse(game["player_board"])
    player_ships = player_board.get("ships", [])
    outcome = "won" if game.get("winner") == "player" else "lost"
    mode = game["mode"]

    features = extract_features(moves, player_ships, mode)

    analysis: CoachAnalysis = await coach_chain.analyze(features, outcome, mode)

    llm_raw = {
        "archetype": analysis.archetype,
        "top_mistake": analysis.top_mistake,
        "tips": analysis.tips,
        "did_well": analysis.did_well,
    }
    await analyses_repo.create(
        game_id=game_id,
        features=features,
        archetype=analysis.archetype,
        top_mistake=analysis.top_mistake,
        tips=list(analysis.tips),
        did_well=analysis.did_well,
        llm_raw=llm_raw,
    )
    return analysis


@router.post("/{game_id}/analyze", response_model=CoachAnalysis)
async def analyze_game(
    game_id: str,
    games_repo: GamesRepo = Depends(get_games_repo),
    analyses_repo: AnalysesRepo = Depends(get_analyses_repo),
):
    # Cache hit — return without calling LLM
    cached = await analyses_repo.get(game_id)
    if cached:
        return _build_analysis_response(cached)

    game = await games_repo.get(game_id)
    if not game:
        raise HTTPException(404, "Game not found")
    if game["status"] != "finished":
        raise HTTPException(400, "Game is not finished yet")

    analysis = await _run_analysis(game_id, games_repo, analyses_repo)
    if analysis is None:
        raise HTTPException(500, "Analysis failed")
    return analysis
```

- [ ] **Step 2: Export `_run_analysis` for the precompute hook**

The function is already module-level — it can be imported by `games.py` in Task 4.

- [ ] **Step 3: Commit**

```bash
git add backend/app/api/analyze.py
git commit -m "feat: implement /analyze endpoint with DB cache"
```

---

## Task 4: Add precompute hook in `/shoot`

**Files:**
- Modify: `backend/app/api/games.py`

- [ ] **Step 1: Add imports at the top of games.py**

After the existing imports, add:

```python
import asyncio

from app.api.analyze import _run_analysis
from app.db.repositories.analyses import AnalysesRepo
from app.deps import get_analyses_repo
```

- [ ] **Step 2: Add analyses_repo dependency to the shoot endpoint**

Find the `shoot` function signature:
```python
async def shoot(
    game_id: str,
    payload: ShotRequest,
    repo: GamesRepo = Depends(get_games_repo),
):
```

Change it to:
```python
async def shoot(
    game_id: str,
    payload: ShotRequest,
    repo: GamesRepo = Depends(get_games_repo),
    analyses_repo: AnalysesRepo = Depends(get_analyses_repo),
):
```

- [ ] **Step 3: Fire precompute task when player wins**

Find this block in `shoot` (player wins, before the return):
```python
        await repo.update_state(
            game_id,
            bot_board=bot_board_data,
            moves=moves,
            status="finished",
            winner="player",
            ended_at=datetime.now(timezone.utc).isoformat(),
        )
        return ShotResult(result=p_result, sunk_ship=p_sunk_name, game_over=True, winner="player")
```

Replace with:
```python
        await repo.update_state(
            game_id,
            bot_board=bot_board_data,
            moves=moves,
            status="finished",
            winner="player",
            ended_at=datetime.now(timezone.utc).isoformat(),
        )
        asyncio.create_task(_run_analysis(game_id, repo, analyses_repo))
        return ShotResult(result=p_result, sunk_ship=p_sunk_name, game_over=True, winner="player")
```

- [ ] **Step 4: Fire precompute task when bot wins**

Find the block at the end of `shoot` where `game_over` is set and the final `update_state` is called:
```python
    if game_over:
        update["winner"] = winner
        update["ended_at"] = datetime.now(timezone.utc).isoformat()
    await repo.update_state(game_id, **update)

    return ShotResult(...)
```

Replace with:
```python
    if game_over:
        update["winner"] = winner
        update["ended_at"] = datetime.now(timezone.utc).isoformat()
    await repo.update_state(game_id, **update)

    if game_over:
        asyncio.create_task(_run_analysis(game_id, repo, analyses_repo))

    return ShotResult(
        result=p_result,
        sunk_ship=p_sunk_name,
        bot_move=BotMove(coord=Coord(row=br, col=bc), result=b_result, sunk_ship=b_sunk_name),
        game_over=game_over,
        winner=winner,
    )
```

- [ ] **Step 5: Run existing game tests to check nothing broke**

```bash
cd backend && uv run pytest tests/test_api_games.py -v
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/app/api/games.py
git commit -m "feat: precompute coach analysis on game end (fire-and-forget)"
```

---

## Task 5: Verify full pipeline with a smoke test

**Files:**
- No new files — run the server manually and call the endpoint.

- [ ] **Step 1: Start the backend**

```bash
cd backend && uv run uvicorn app.main:app --reload
```

Confirm you see `Application startup complete.`

- [ ] **Step 2: Create a user and a game**

In a second terminal:

```bash
# Create anon user
USER=$(curl -s -X POST http://localhost:8000/api/users/anon | jq -r '.user_id')
echo "User: $USER"

# Create easy game
GAME=$(curl -s -X POST http://localhost:8000/api/games \
  -H "Content-Type: application/json" \
  -d "{\"user_id\": \"$USER\", \"mode\": \"pvbot_easy\"}" | jq -r '.game_id')
echo "Game: $GAME"

# Auto-place ships
curl -s -X POST http://localhost:8000/api/games/$GAME/place-auto | jq .
```

- [ ] **Step 3: Finish the game via auto-shooting (quick script)**

```bash
# Shoot until game_over=true (may take many calls)
for ROW in 0 1 2 3 4 5 6 7 8 9; do
  for COL in 0 1 2 3 4 5 6 7 8 9; do
    RESULT=$(curl -s -X POST http://localhost:8000/api/games/$GAME/shoot \
      -H "Content-Type: application/json" \
      -d "{\"coord\": {\"row\": $ROW, \"col\": $COL}}")
    echo $RESULT | jq -r '"\(.result) game_over=\(.game_over)"'
    if echo $RESULT | jq -e '.game_over == true' > /dev/null; then
      echo "Game over!"
      break 2
    fi
  done
done
```

- [ ] **Step 4: Call the analyze endpoint**

```bash
curl -s http://localhost:8000/api/games/$GAME/analyze -X POST | jq .
```

Expected: JSON with `archetype`, `top_mistake`, `tips` (3 items), `did_well`.

- [ ] **Step 5: Call analyze again to verify cache**

```bash
curl -s http://localhost:8000/api/games/$GAME/analyze -X POST | jq .
```

Expected: same result, returned instantly (no LLM call — check server logs).

---

## Task 6: Frontend — loading skeleton in CoachReport

**Files:**
- Modify: `frontend/src/components/CoachReport.tsx`

- [ ] **Step 1: Replace loading state with skeleton**

Replace the entire content of `frontend/src/components/CoachReport.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";

import type { CoachAnalysis } from "@/lib/types";
import { api } from "@/lib/api";

function Skeleton({ lines = 2 }: { lines?: number }) {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 rounded bg-slate-200 dark:bg-slate-700"
          style={{ width: i === lines - 1 ? "60%" : "100%" }}
        />
      ))}
    </div>
  );
}

export default function CoachReport({ gameId }: { gameId: string }) {
  const [analysis, setAnalysis] = useState<CoachAnalysis | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api
      .post<CoachAnalysis>(`/api/games/${gameId}/analyze`)
      .then(setAnalysis)
      .catch(() => setError(true));
  }, [gameId]);

  if (error) {
    return (
      <p className="mt-6 text-red-600">
        Could not load coach analysis. Please try again later.
      </p>
    );
  }

  if (!analysis) {
    return (
      <div className="mt-6 space-y-8">
        <section className="space-y-2">
          <p className="text-sm uppercase opacity-60">Archetype</p>
          <Skeleton lines={1} />
        </section>
        <section className="space-y-2">
          <p className="text-sm uppercase opacity-60">Top mistake</p>
          <Skeleton lines={2} />
        </section>
        <section className="space-y-2">
          <p className="text-sm uppercase opacity-60">Tips</p>
          <Skeleton lines={3} />
        </section>
        <section className="space-y-2">
          <p className="text-sm uppercase opacity-60">What you did well</p>
          <Skeleton lines={2} />
        </section>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-6">
      <section>
        <p className="text-sm uppercase opacity-60">Archetype</p>
        <p className="text-2xl font-semibold">{analysis.archetype}</p>
      </section>
      <section>
        <p className="text-sm uppercase opacity-60">Top mistake</p>
        <p>{analysis.top_mistake}</p>
      </section>
      <section>
        <p className="text-sm uppercase opacity-60">Tips</p>
        <ol className="list-decimal pl-5 space-y-1">
          {analysis.tips.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ol>
      </section>
      <section>
        <p className="text-sm uppercase opacity-60">What you did well</p>
        <p>{analysis.did_well}</p>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Type-check frontend**

```bash
cd frontend && npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/CoachReport.tsx
git commit -m "feat: polish CoachReport loading skeleton and error state"
```

---

## Self-Review

**Spec coverage check:**

| Requirement (SPEC.md §T1) | Task |
|---|---|
| Extract behavioral features from move log | Task 1 |
| Player archetype (5 options) | Task 3 — passed to LangChain |
| Top mistake (specific, citing a number) | Task 3 — LLM responsibility |
| 3 concrete tips | Task 3 — LLM responsibility |
| One thing done well | Task 3 — LLM responsibility |
| Coach report as polished post-game screen | Task 6 |
| Analysis triggered automatically on game end | Task 4 |
| DB persistence (analyses table) | Task 2 |
| Idempotent endpoint (cache) | Task 3 |

**Placeholder scan:** None found.

**Type consistency:**
- `CoachAnalysis` Pydantic model in `schemas/coach.py` — `tips: list[str]` with `min_length=3, max_length=3`. Frontend `types.ts` uses `[string, string, string]`. Compatible.
- `extract_features` returns plain `dict` — passed as-is to `coach_chain.analyze()` which JSON-serializes it. Consistent.
- `analyses_repo.create(tips=list(analysis.tips))` — converts Pydantic list to plain Python list. Safe.
- `_run_analysis` is imported as `from app.api.analyze import _run_analysis` in `games.py`. Function is defined in Task 3 before Task 4 imports it. Correct order.
