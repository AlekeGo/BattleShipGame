# Tier 0 — Core Game Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fully playable Battleship game (10×10 board, 3 bot difficulties, manual and auto ship placement) with a FastAPI backend and Next.js frontend, connected end-to-end.

**Architecture:** Server-authoritative game state stored in Supabase (player/bot boards + move log as JSONB). FastAPI endpoints handle all game logic. The frontend never sees bot ship positions. Each `/shoot` call returns both the player's result and the bot's counter-move in one round-trip.

**Tech Stack:** Python 3.11 + FastAPI + supabase-py 2.x (sync client), Next.js 14 App Router + TypeScript + Tailwind. Tests with pytest (backend) and TypeScript type-checks (frontend).

---

## What's Already Done (skip these)

- `backend/app/engine/board.py` — `Board` class (place_ship, receive_shot, is_lost) ✓
- `backend/app/engine/fleet.py` — `Ship` dataclass + `FLEET_SPEC` ✓
- `backend/app/engine/coords.py` — `BOARD_SIZE`, `in_bounds`, `is_parity`, `neighbors` ✓
- `backend/app/engine/bots/random_bot.py` — `RandomBot` ✓
- Tests: `test_board.py`, `test_fleet.py`, `test_random_bot.py` ✓

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `backend/app/engine/fleet.py` | Modify | Add `validate_fleet()`, `auto_place()` |
| `backend/app/engine/bots/hunt_bot.py` | Modify | Implement `HuntBot` |
| `backend/app/engine/bots/prob_bot.py` | Modify | Implement `ProbBot` |
| `backend/app/db/repositories/users.py` | Modify | Implement `UsersRepo` |
| `backend/app/db/repositories/games.py` | Modify | Implement `GamesRepo` |
| `backend/app/api/users.py` | Modify | Implement `POST /api/users/anon` |
| `backend/app/api/games.py` | Modify | Implement all game endpoints |
| `backend/tests/test_fleet_validation.py` | Create | Validation + auto-place tests |
| `backend/tests/test_hunt_bot.py` | Create | HuntBot tests |
| `backend/tests/test_prob_bot.py` | Create | ProbBot tests (file exists, fill in) |
| `frontend/src/components/Cell.tsx` | Modify | State-based styling (ship/hit/miss/sunk) |
| `frontend/src/components/Board.tsx` | Modify | Accept `cellStates` map + preview overlay |
| `frontend/src/components/ShipPlacer.tsx` | Modify | Click-to-place ships with rotate |
| `frontend/src/hooks/usePlacement.ts` | Modify | Full placement state logic |
| `frontend/src/hooks/useGame.ts` | Modify | Full game state management |
| `frontend/src/app/play/page.tsx` | Modify | Mode select → placement → start |
| `frontend/src/app/game/[id]/page.tsx` | Modify | Active game: shoot + display results |

---

## Task 1: Fleet Validation and Auto-Placement

**Files:**
- Modify: `backend/app/engine/fleet.py`
- Create: `backend/tests/test_fleet_validation.py`

### Step 1: Write failing tests

- [ ] Create `backend/tests/test_fleet_validation.py`:

```python
import pytest
from app.engine.fleet import FLEET_SPEC, Ship, validate_fleet, auto_place
from app.engine.coords import BOARD_SIZE


def _valid_ships():
    """Minimal valid fleet placed in a column without overlaps."""
    placements = [(0, 0), (0, 2), (0, 5), (0, 8), (0, 10)]  # row offsets spaced apart
    ships = []
    start_row = 0
    for i, (name, size) in enumerate(FLEET_SPEC):
        ships.append(Ship(name, size, start_row, i * 2, "V"))
        start_row = 0
    # Use column-per-ship so none overlap
    ships = []
    for col, (name, size) in enumerate(FLEET_SPEC):
        ships.append(Ship(name, size, 0, col * 2, "V"))
    return ships


def test_validate_fleet_accepts_valid():
    validate_fleet(_valid_ships())  # must not raise


def test_validate_fleet_rejects_wrong_count():
    ships = _valid_ships()[:-1]  # 4 ships instead of 5
    with pytest.raises(ValueError, match="5 ships"):
        validate_fleet(ships)


def test_validate_fleet_rejects_duplicate_name():
    ships = _valid_ships()
    ships[0] = Ship("Destroyer", 2, 0, 0, "V")  # replace Carrier with a second Destroyer
    with pytest.raises(ValueError):
        validate_fleet(ships)


def test_validate_fleet_rejects_wrong_size():
    ships = _valid_ships()
    # Carrier claims size 5 but ship object says size 3
    ships[0] = Ship("Carrier", 3, 0, 0, "V")
    with pytest.raises(ValueError, match="size"):
        validate_fleet(ships)


def test_validate_fleet_rejects_out_of_bounds():
    ships = _valid_ships()
    ships[0] = Ship("Carrier", 5, 0, 8, "H")  # col 8 + 5 cells = col 12, out of bounds
    with pytest.raises(ValueError):
        validate_fleet(ships)


def test_validate_fleet_rejects_overlap():
    ships = _valid_ships()
    # Place Carrier and Battleship at the same column
    ships[0] = Ship("Carrier", 5, 0, 0, "V")
    ships[1] = Ship("Battleship", 4, 0, 0, "V")  # overlaps carrier at (0,0)...(3,0)
    with pytest.raises(ValueError):
        validate_fleet(ships)


def test_auto_place_returns_valid_fleet():
    ships = auto_place()
    assert len(ships) == len(FLEET_SPEC)
    validate_fleet(ships)  # must not raise — placement is valid


def test_auto_place_all_in_bounds():
    for _ in range(20):  # run several times to catch edge cases
        ships = auto_place()
        for ship in ships:
            for r, c in ship.cells():
                assert 0 <= r < BOARD_SIZE
                assert 0 <= c < BOARD_SIZE
```

- [ ] Run test to verify it fails:

```bash
cd /Users/nurma/vscode_projects/BattleShipGame/backend
.venv/bin/pytest tests/test_fleet_validation.py -v 2>&1 | head -30
```

Expected: `ImportError` — `validate_fleet` and `auto_place` don't exist yet.

### Step 2: Implement `validate_fleet` and `auto_place`

- [ ] Modify `backend/app/engine/fleet.py`:

```python
import random
from dataclasses import dataclass

from app.engine.coords import BOARD_SIZE, in_bounds

FLEET_SPEC: list[tuple[str, int]] = [
    ("Carrier", 5),
    ("Battleship", 4),
    ("Cruiser", 3),
    ("Submarine", 3),
    ("Destroyer", 2),
]


@dataclass
class Ship:
    name: str
    size: int
    row: int
    col: int
    orientation: str  # "H" or "V"
    hits: set[tuple[int, int]] = None

    def __post_init__(self):
        if self.hits is None:
            self.hits = set()

    def cells(self) -> list[tuple[int, int]]:
        if self.orientation == "H":
            return [(self.row, self.col + i) for i in range(self.size)]
        return [(self.row + i, self.col) for i in range(self.size)]

    def is_sunk(self) -> bool:
        return len(self.hits) == self.size


def validate_fleet(ships: list["Ship"]) -> None:
    """Raise ValueError if ships don't match FLEET_SPEC or have overlaps/OOB."""
    spec_map = {name: size for name, size in FLEET_SPEC}

    if len(ships) != len(FLEET_SPEC):
        raise ValueError(f"Expected {len(FLEET_SPEC)} ships, got {len(ships)}")

    submitted = {s.name: s.size for s in ships}
    for name, expected_size in FLEET_SPEC:
        if name not in submitted:
            raise ValueError(f"Missing ship: {name}")
        if submitted[name] != expected_size:
            raise ValueError(f"Ship {name} must have size {expected_size}, got {submitted[name]}")

    # Validate positions via Board (catches OOB and overlaps)
    from app.engine.board import Board
    board = Board()
    for ship in ships:
        board.place_ship(ship)


def auto_place() -> list["Ship"]:
    """Randomly generate a valid fleet placement."""
    from app.engine.board import Board
    while True:
        board = Board()
        ships = []
        failed = False
        for name, size in FLEET_SPEC:
            placed = False
            for _ in range(200):
                row = random.randint(0, BOARD_SIZE - 1)
                col = random.randint(0, BOARD_SIZE - 1)
                orientation = random.choice(["H", "V"])
                ship = Ship(name, size, row, col, orientation)
                try:
                    board.place_ship(ship)
                    ships.append(ship)
                    placed = True
                    break
                except ValueError:
                    pass
            if not placed:
                failed = True
                break
        if not failed:
            return ships
```

- [ ] Run tests:

```bash
cd /Users/nurma/vscode_projects/BattleShipGame/backend
.venv/bin/pytest tests/test_fleet_validation.py -v
```

Expected: all 8 tests PASS.

### Step 3: Commit

- [ ] Commit:

```bash
cd /Users/nurma/vscode_projects/BattleShipGame
git add backend/app/engine/fleet.py backend/tests/test_fleet_validation.py
git commit -m "feat(engine): add validate_fleet and auto_place"
```

---

## Task 2: HuntBot

**Files:**
- Modify: `backend/app/engine/bots/hunt_bot.py`
- Modify: `backend/tests/test_hunt_bot.py` (file exists, add tests)

The bot's `state` dict structure (what the API will pass):
```python
{
    "shots": [[r, c], ...],       # all cells the bot has fired at
    "hits": [[r, c], ...],        # cells that returned "hit" or "sunk"
    "sunk_cells": [[r, c], ...],  # cells belonging to fully sunk ships
}
```

### Step 1: Write failing tests

- [ ] Fill in `backend/tests/test_hunt_bot.py` (file exists but empty):

```python
from app.engine.bots.hunt_bot import HuntBot
from app.engine.coords import BOARD_SIZE, neighbors


def test_hunt_bot_shoots_in_empty_board():
    bot = HuntBot()
    state = {"shots": [], "hits": [], "sunk_cells": []}
    r, c = bot.choose_shot(state)
    assert 0 <= r < BOARD_SIZE
    assert 0 <= c < BOARD_SIZE


def test_hunt_bot_avoids_already_shot_cells():
    bot = HuntBot()
    already_shot = [[r, c] for r in range(5) for c in range(BOARD_SIZE)]
    state = {"shots": already_shot, "hits": [], "sunk_cells": []}
    r, c = bot.choose_shot(state)
    assert r >= 5


def test_hunt_bot_targets_neighbor_after_hit():
    bot = HuntBot()
    hit_cell = [3, 5]
    state = {
        "shots": [hit_cell],
        "hits": [hit_cell],
        "sunk_cells": [],
    }
    r, c = bot.choose_shot(state)
    # Must be adjacent to (3,5)
    valid = {(2, 5), (4, 5), (3, 4), (3, 6)}
    assert (r, c) in valid


def test_hunt_bot_ignores_sunk_hits():
    bot = HuntBot()
    # Ship at (3,5) is sunk — should not target its neighbors preferentially
    hit_cell = [3, 5]
    state = {
        "shots": [hit_cell],
        "hits": [hit_cell],
        "sunk_cells": [hit_cell],  # it's sunk
    }
    # Should pick randomly, not targeting (3,5) neighbors specifically
    r, c = bot.choose_shot(state)
    assert 0 <= r < BOARD_SIZE
    assert 0 <= c < BOARD_SIZE
    assert (r, c) != tuple(hit_cell)
```

- [ ] Run to verify failure:

```bash
cd /Users/nurma/vscode_projects/BattleShipGame/backend
.venv/bin/pytest tests/test_hunt_bot.py -v 2>&1 | head -20
```

Expected: `NotImplementedError`.

### Step 2: Implement HuntBot

- [ ] Replace `backend/app/engine/bots/hunt_bot.py`:

```python
import random

from app.engine.bots.base import Bot
from app.engine.coords import BOARD_SIZE, neighbors


class HuntBot(Bot):
    """Random until a hit, then probe orthogonal neighbors until ship sunk."""

    def choose_shot(self, state: dict) -> tuple[int, int]:
        shots = set(map(tuple, state.get("shots", [])))
        hits = {tuple(h) for h in state.get("hits", [])}
        sunk_cells = {tuple(c) for c in state.get("sunk_cells", [])}
        active_hits = hits - sunk_cells

        if active_hits:
            candidates = [
                (nr, nc)
                for hr, hc in active_hits
                for nr, nc in neighbors(hr, hc)
                if (nr, nc) not in shots
            ]
            if candidates:
                return random.choice(candidates)

        unshotcells = [
            (r, c)
            for r in range(BOARD_SIZE)
            for c in range(BOARD_SIZE)
            if (r, c) not in shots
        ]
        return random.choice(unshotcells)
```

- [ ] Run tests:

```bash
cd /Users/nurma/vscode_projects/BattleShipGame/backend
.venv/bin/pytest tests/test_hunt_bot.py -v
```

Expected: all 4 tests PASS.

### Step 3: Commit

- [ ] Commit:

```bash
cd /Users/nurma/vscode_projects/BattleShipGame
git add backend/app/engine/bots/hunt_bot.py backend/tests/test_hunt_bot.py
git commit -m "feat(engine): implement HuntBot (medium difficulty)"
```

---

## Task 3: ProbBot (Hard Bot)

**Files:**
- Modify: `backend/app/engine/bots/prob_bot.py`
- Modify: `backend/tests/test_prob_bot.py`

Same `state` structure as HuntBot, plus `remaining_ships: [int, ...]` (sizes of unsunk player ships).

### Step 1: Write failing tests

- [ ] Fill in `backend/tests/test_prob_bot.py`:

```python
from app.engine.bots.prob_bot import ProbBot
from app.engine.coords import BOARD_SIZE


def _full_state():
    return {
        "shots": [],
        "hits": [],
        "sunk_cells": [],
        "remaining_ships": [5, 4, 3, 3, 2],
    }


def test_prob_bot_returns_valid_coord():
    bot = ProbBot()
    r, c = bot.choose_shot(_full_state())
    assert 0 <= r < BOARD_SIZE and 0 <= c < BOARD_SIZE


def test_prob_bot_uses_parity_on_empty_board():
    bot = ProbBot()
    for _ in range(30):  # parity should dominate — run many times
        r, c = bot.choose_shot(_full_state())
        assert (r + c) % 2 == 0, f"Expected parity cell, got ({r},{c})"


def test_prob_bot_avoids_shot_cells():
    bot = ProbBot()
    # Fill row 0
    shots = [[0, c] for c in range(BOARD_SIZE)]
    state = {**_full_state(), "shots": shots}
    r, c = bot.choose_shot(state)
    assert r != 0


def test_prob_bot_targets_neighbor_on_active_hit():
    bot = ProbBot()
    state = {
        "shots": [[5, 5]],
        "hits": [[5, 5]],
        "sunk_cells": [],
        "remaining_ships": [5, 4, 3, 3, 2],
    }
    r, c = bot.choose_shot(state)
    valid = {(4, 5), (6, 5), (5, 4), (5, 6)}
    assert (r, c) in valid
```

- [ ] Run to verify failure:

```bash
cd /Users/nurma/vscode_projects/BattleShipGame/backend
.venv/bin/pytest tests/test_prob_bot.py -v 2>&1 | head -20
```

Expected: `NotImplementedError`.

### Step 2: Implement ProbBot

- [ ] Replace `backend/app/engine/bots/prob_bot.py`:

```python
from app.engine.bots.base import Bot
from app.engine.coords import BOARD_SIZE, in_bounds, is_parity, neighbors


class ProbBot(Bot):
    """Probability density + parity targeting (DataGenetics algorithm)."""

    def choose_shot(self, state: dict) -> tuple[int, int]:
        shots = set(map(tuple, state.get("shots", [])))
        hits = {tuple(h) for h in state.get("hits", [])}
        sunk_cells = {tuple(c) for c in state.get("sunk_cells", [])}
        remaining = state.get("remaining_ships", [5, 4, 3, 3, 2])
        active_hits = hits - sunk_cells

        if active_hits:
            candidates = [
                (nr, nc)
                for hr, hc in active_hits
                for nr, nc in neighbors(hr, hc)
                if (nr, nc) not in shots
            ]
            if candidates:
                # Prefer cells adjacent to multiple active hits (ship direction)
                return max(candidates, key=lambda cell: sum(
                    1 for ah in active_hits
                    if abs(cell[0] - ah[0]) + abs(cell[1] - ah[1]) == 1
                ))

        misses = shots - hits
        prob = [[0] * BOARD_SIZE for _ in range(BOARD_SIZE)]
        for size in remaining:
            for r in range(BOARD_SIZE):
                for c in range(BOARD_SIZE):
                    for cells in (
                        [(r, c + i) for i in range(size)],
                        [(r + i, c) for i in range(size)],
                    ):
                        if all(
                            in_bounds(rr, cc)
                            and (rr, cc) not in misses
                            and (rr, cc) not in sunk_cells
                            for rr, cc in cells
                        ):
                            for rr, cc in cells:
                                if (rr, cc) not in shots:
                                    prob[rr][cc] += 1

        parity_candidates = [
            (r, c)
            for r in range(BOARD_SIZE)
            for c in range(BOARD_SIZE)
            if (r, c) not in shots and is_parity(r, c) and prob[r][c] > 0
        ]
        all_candidates = [
            (r, c)
            for r in range(BOARD_SIZE)
            for c in range(BOARD_SIZE)
            if (r, c) not in shots and prob[r][c] > 0
        ]
        pool = parity_candidates if parity_candidates else all_candidates
        if not pool:
            pool = [(r, c) for r in range(BOARD_SIZE) for c in range(BOARD_SIZE) if (r, c) not in shots]
        return max(pool, key=lambda cell: prob[cell[0]][cell[1]])
```

- [ ] Run tests:

```bash
cd /Users/nurma/vscode_projects/BattleShipGame/backend
.venv/bin/pytest tests/test_prob_bot.py -v
```

Expected: all 4 tests PASS.

### Step 3: Run all engine tests together

- [ ] Verify nothing broke:

```bash
cd /Users/nurma/vscode_projects/BattleShipGame/backend
.venv/bin/pytest tests/test_board.py tests/test_fleet.py tests/test_fleet_validation.py tests/test_random_bot.py tests/test_hunt_bot.py tests/test_prob_bot.py -v
```

Expected: all tests PASS.

### Step 4: Commit

- [ ] Commit:

```bash
cd /Users/nurma/vscode_projects/BattleShipGame
git add backend/app/engine/bots/prob_bot.py backend/tests/test_prob_bot.py
git commit -m "feat(engine): implement ProbBot (hard difficulty, parity + probability map)"
```

---

## Task 4: Supabase Repositories

**Files:**
- Modify: `backend/app/db/repositories/users.py`
- Modify: `backend/app/db/repositories/games.py`

Note: These use the Supabase sync Python client. The methods are `async` in the signatures (to match FastAPI) but internally call the sync client. This is acceptable for a hackathon; the sync calls are fast I/O.

The supabase-py 2.x client's table API:
```python
db.table("users").insert({"id": ..., ...}).execute()  # returns APIResponse
db.table("users").select("*").eq("id", user_id).single().execute()
db.table("games").update({...}).eq("id", game_id).execute()
```

### Step 1: Implement UsersRepo

- [ ] Replace `backend/app/db/repositories/users.py`:

```python
import uuid

from supabase import Client


class UsersRepo:
    def __init__(self, db: Client):
        self.db = db

    async def create_anon(self) -> dict:
        user_id = str(uuid.uuid4())
        res = self.db.table("users").insert({"id": user_id}).execute()
        return res.data[0]

    async def set_region(self, user_id: str, region: str) -> None:
        self.db.table("users").update({"region": region}).eq("id", user_id).execute()

    async def get(self, user_id: str) -> dict | None:
        res = self.db.table("users").select("*").eq("id", user_id).maybe_single().execute()
        return res.data
```

### Step 2: Implement GamesRepo

The game row structure in Supabase:
- `player_board`: `{"ships": [...], "shots_received": []}` where each ship is `{"name", "size", "row", "col", "orientation", "hits": []}`
- `bot_board`: same structure
- `moves`: `[{"turn": N, "by": "player"|"bot", "coord": [r, c], "result": "hit"|"miss"|"sunk", "sunk_ship": name|null}]`

- [ ] Replace `backend/app/db/repositories/games.py`:

```python
import json

from supabase import Client


class GamesRepo:
    def __init__(self, db: Client):
        self.db = db

    async def create(self, user_id: str, mode: str, bot_ships: list[dict]) -> dict:
        payload = {
            "user_id": user_id,
            "mode": mode,
            "player_board": json.dumps({"ships": [], "shots_received": []}),
            "bot_board": json.dumps({"ships": bot_ships, "shots_received": []}),
            "moves": json.dumps([]),
            "status": "placing",
        }
        res = self.db.table("games").insert(payload).execute()
        return res.data[0]

    async def get(self, game_id: str) -> dict | None:
        res = (
            self.db.table("games")
            .select("*")
            .eq("id", game_id)
            .maybe_single()
            .execute()
        )
        return res.data

    async def update_state(self, game_id: str, **fields) -> None:
        # JSON-encode any dict/list fields
        encoded = {}
        for k, v in fields.items():
            encoded[k] = json.dumps(v) if isinstance(v, (dict, list)) else v
        self.db.table("games").update(encoded).eq("id", game_id).execute()

    async def append_move(self, game_id: str, move: dict) -> None:
        row = await self.get(game_id)
        moves = row["moves"] if isinstance(row["moves"], list) else json.loads(row["moves"])
        moves.append(move)
        self.db.table("games").update({"moves": json.dumps(moves)}).eq("id", game_id).execute()

    async def list_for_user(self, user_id: str, limit: int = 20, offset: int = 0) -> list[dict]:
        res = (
            self.db.table("games")
            .select("*")
            .eq("user_id", user_id)
            .order("started_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        return res.data
```

### Step 3: Update deps.py to expose repos

- [ ] Replace `backend/app/deps.py`:

```python
from fastapi import Depends
from supabase import Client

from app.db.supabase import get_supabase
from app.db.repositories.users import UsersRepo
from app.db.repositories.games import GamesRepo


def get_users_repo(db: Client = Depends(get_supabase)) -> UsersRepo:
    return UsersRepo(db)


def get_games_repo(db: Client = Depends(get_supabase)) -> GamesRepo:
    return GamesRepo(db)
```

### Step 4: Commit

- [ ] Commit:

```bash
cd /Users/nurma/vscode_projects/BattleShipGame
git add backend/app/db/repositories/users.py backend/app/db/repositories/games.py backend/app/deps.py
git commit -m "feat(db): implement UsersRepo and GamesRepo for Supabase"
```

---

## Task 5: Users API Endpoint

**Files:**
- Modify: `backend/app/api/users.py`

### Step 1: Implement POST /api/users/anon

- [ ] Replace `backend/app/api/users.py`:

```python
from fastapi import APIRouter, Depends

from app.db.repositories.users import UsersRepo
from app.deps import get_users_repo

router = APIRouter()


@router.post("/anon")
async def create_anon_user(repo: UsersRepo = Depends(get_users_repo)):
    user = await repo.create_anon()
    return {"user_id": user["id"]}


@router.post("/{user_id}/region")
async def set_region(
    user_id: str,
    payload: dict,
    repo: UsersRepo = Depends(get_users_repo),
):
    await repo.set_region(user_id, payload.get("region", ""))
    return {"ok": True}
```

### Step 2: Test with curl (manual)

- [ ] Start the backend:

```bash
cd /Users/nurma/vscode_projects/BattleShipGame/backend
.venv/bin/uvicorn app.main:app --reload --port 8000
```

- [ ] In a separate terminal, test:

```bash
curl -s -X POST http://localhost:8000/api/users/anon | python3 -m json.tool
```

Expected: `{ "user_id": "<uuid>" }`

### Step 3: Commit

- [ ] Commit:

```bash
cd /Users/nurma/vscode_projects/BattleShipGame
git add backend/app/api/users.py
git commit -m "feat(api): implement POST /api/users/anon"
```

---

## Task 6: Games API Endpoints

**Files:**
- Modify: `backend/app/api/games.py`
- Modify: `backend/app/schemas/game.py` (add `GameState` response schema)

The game endpoints implement the full game flow:
1. `POST /api/games` — create game, auto-place bot ships, return `game_id`
2. `POST /api/games/{id}/place` — validate and save player ship placement
3. `POST /api/games/{id}/place-auto` — auto-place player ships server-side
4. `POST /api/games/{id}/shoot` — player shoots, bot counter-shoots, return both results
5. `GET /api/games/{id}` — return safe game state (never reveal bot ships)

### Step 1: Update game schemas

- [ ] Replace `backend/app/schemas/game.py`:

```python
from typing import Literal

from pydantic import BaseModel

GameMode = Literal["pvbot_easy", "pvbot_medium", "pvbot_hard", "hotseat"]


class ShipPlacement(BaseModel):
    name: str
    size: int
    row: int
    col: int
    orientation: Literal["H", "V"]


class GameCreate(BaseModel):
    user_id: str
    mode: GameMode


class GameCreated(BaseModel):
    game_id: str
    fleet: list[dict]  # the full fleet spec (names + sizes, no positions)


class PlacementRequest(BaseModel):
    ships: list[ShipPlacement]


class AutoPlaceResponse(BaseModel):
    ships: list[dict]  # ship positions for the player to display


class GameState(BaseModel):
    game_id: str
    status: str
    player_ships: list[dict]
    player_shots_received: list[dict]  # [{coord, result}]
    my_shots: list[dict]               # shots the player fired: [{coord, result}]
    winner: str | None
```

### Step 2: Implement games.py

- [ ] Replace `backend/app/api/games.py`:

```python
import json
import random
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from app.db.repositories.games import GamesRepo
from app.deps import get_games_repo
from app.engine.bots.hunt_bot import HuntBot
from app.engine.bots.prob_bot import ProbBot
from app.engine.bots.random_bot import RandomBot
from app.engine.board import Board
from app.engine.fleet import FLEET_SPEC, Ship, auto_place, validate_fleet
from app.schemas.game import (
    AutoPlaceResponse,
    GameCreate,
    GameCreated,
    GameState,
    PlacementRequest,
)
from app.schemas.shot import BotMove, Coord, ShotRequest, ShotResult

router = APIRouter()


def _ship_to_dict(ship: Ship) -> dict:
    return {
        "name": ship.name,
        "size": ship.size,
        "row": ship.row,
        "col": ship.col,
        "orientation": ship.orientation,
        "hits": [],
    }


def _dict_to_ship(d: dict) -> Ship:
    ship = Ship(d["name"], d["size"], d["row"], d["col"], d["orientation"])
    ship.hits = {tuple(h) for h in d.get("hits", [])}
    return ship


def _get_bot(mode: str):
    if mode == "pvbot_easy":
        return RandomBot()
    if mode == "pvbot_medium":
        return HuntBot()
    return ProbBot()


def _board_from_ships(ship_dicts: list[dict]) -> Board:
    board = Board()
    for d in ship_dicts:
        board.place_ship(_dict_to_ship(d))
    return board


def _build_bot_state(game: dict, player_board_data: dict) -> dict:
    """Build state dict for bot.choose_shot from the game's move log."""
    moves = game["moves"] if isinstance(game["moves"], list) else json.loads(game["moves"])
    bot_moves = [m for m in moves if m["by"] == "bot"]
    shots = [m["coord"] for m in bot_moves]
    hits = [m["coord"] for m in bot_moves if m["result"] in ("hit", "sunk")]

    # Sunk cells: find ships that are fully sunk
    ships = player_board_data["ships"]
    player_board = _board_from_ships(ships)
    sunk_cells = []
    for ship_obj in player_board.ships:
        if ship_obj.is_sunk():
            sunk_cells.extend([list(c) for c in ship_obj.cells()])

    # Remaining ship sizes
    remaining = [s["size"] for s in ships if not _dict_to_ship(s).is_sunk()]

    return {
        "shots": shots,
        "hits": hits,
        "sunk_cells": sunk_cells,
        "remaining_ships": remaining,
    }


@router.post("", response_model=GameCreated)
async def create_game(
    payload: GameCreate,
    repo: GamesRepo = Depends(get_games_repo),
):
    bot_ships = [_ship_to_dict(s) for s in auto_place()]
    game = await repo.create(payload.user_id, payload.mode, bot_ships)
    fleet = [{"name": name, "size": size} for name, size in FLEET_SPEC]
    return GameCreated(game_id=game["id"], fleet=fleet)


@router.post("/{game_id}/place")
async def place_ships(
    game_id: str,
    payload: PlacementRequest,
    repo: GamesRepo = Depends(get_games_repo),
):
    game = await repo.get(game_id)
    if not game:
        raise HTTPException(404, "Game not found")
    if game["status"] != "placing":
        raise HTTPException(400, "Ships already placed")

    ships = [Ship(s.name, s.size, s.row, s.col, s.orientation) for s in payload.ships]
    try:
        validate_fleet(ships)
    except ValueError as e:
        raise HTTPException(422, str(e))

    player_board = {"ships": [_ship_to_dict(s) for s in ships], "shots_received": []}
    await repo.update_state(game_id, player_board=player_board, status="active")
    return {"ok": True}


@router.post("/{game_id}/place-auto", response_model=AutoPlaceResponse)
async def place_auto(
    game_id: str,
    repo: GamesRepo = Depends(get_games_repo),
):
    game = await repo.get(game_id)
    if not game:
        raise HTTPException(404, "Game not found")
    if game["status"] != "placing":
        raise HTTPException(400, "Ships already placed")

    ships = auto_place()
    player_board = {"ships": [_ship_to_dict(s) for s in ships], "shots_received": []}
    await repo.update_state(game_id, player_board=player_board, status="active")
    return AutoPlaceResponse(ships=[_ship_to_dict(s) for s in ships])


@router.post("/{game_id}/shoot", response_model=ShotResult)
async def shoot(
    game_id: str,
    payload: ShotRequest,
    repo: GamesRepo = Depends(get_games_repo),
):
    game = await repo.get(game_id)
    if not game:
        raise HTTPException(404, "Game not found")
    if game["status"] != "active":
        raise HTTPException(400, f"Game is not active (status: {game['status']})")

    row, col = payload.coord.row, payload.coord.col
    bot_board_data = game["bot_board"] if isinstance(game["bot_board"], dict) else json.loads(game["bot_board"])
    player_board_data = game["player_board"] if isinstance(game["player_board"], dict) else json.loads(game["player_board"])

    # Check duplicate shot
    moves = game["moves"] if isinstance(game["moves"], list) else json.loads(game["moves"])
    player_shots = {(m["coord"][0], m["coord"][1]) for m in moves if m["by"] == "player"}
    if (row, col) in player_shots:
        raise HTTPException(400, "Cell already shot")

    # Apply player's shot to bot board
    bot_board = _board_from_ships(bot_board_data["ships"])
    for m in moves:
        if m["by"] == "player":
            bot_board.receive_shot(m["coord"][0], m["coord"][1])
    
    p_result, p_ship = bot_board.receive_shot(row, col)
    p_sunk_name = p_ship.name if p_result == "sunk" else None

    # Update hits in bot_board_data
    for ship_dict in bot_board_data["ships"]:
        ship_obj = _dict_to_ship(ship_dict)
        for s in bot_board.ships:
            if s.name == ship_dict["name"]:
                ship_dict["hits"] = [list(h) for h in s.hits]

    player_move = {
        "turn": len(moves),
        "by": "player",
        "coord": [row, col],
        "result": p_result,
        "sunk_ship": p_sunk_name,
    }
    moves.append(player_move)

    # Check player win
    if bot_board.is_lost():
        await repo.update_state(
            game_id,
            bot_board=bot_board_data,
            moves=moves,
            status="finished",
            winner="player",
            ended_at=datetime.now(timezone.utc).isoformat(),
        )
        return ShotResult(
            result=p_result,
            sunk_ship=p_sunk_name,
            bot_move=None,
            game_over=True,
            winner="player",
        )

    # Bot's turn
    mode = game["mode"]
    if "hotseat" in mode:
        await repo.update_state(game_id, bot_board=bot_board_data, moves=moves)
        return ShotResult(result=p_result, sunk_ship=p_sunk_name, game_over=False)

    bot = _get_bot(mode)
    bot_state = _build_bot_state({**game, "moves": moves}, player_board_data)
    br, bc = bot.choose_shot(bot_state)

    player_board = _board_from_ships(player_board_data["ships"])
    for m in moves:
        if m["by"] == "bot":
            player_board.receive_shot(m["coord"][0], m["coord"][1])
    b_result, b_ship = player_board.receive_shot(br, bc)
    b_sunk_name = b_ship.name if b_result == "sunk" else None

    for ship_dict in player_board_data["ships"]:
        for s in player_board.ships:
            if s.name == ship_dict["name"]:
                ship_dict["hits"] = [list(h) for h in s.hits]

    bot_move_record = {
        "turn": len(moves),
        "by": "bot",
        "coord": [br, bc],
        "result": b_result,
        "sunk_ship": b_sunk_name,
    }
    moves.append(bot_move_record)

    game_over = player_board.is_lost()
    winner = "bot" if game_over else None
    new_status = "finished" if game_over else "active"
    update = {
        "bot_board": bot_board_data,
        "player_board": player_board_data,
        "moves": moves,
        "status": new_status,
    }
    if game_over:
        update["winner"] = winner
        update["ended_at"] = datetime.now(timezone.utc).isoformat()
    await repo.update_state(game_id, **update)

    return ShotResult(
        result=p_result,
        sunk_ship=p_sunk_name,
        bot_move=BotMove(
            coord=Coord(row=br, col=bc),
            result=b_result,
            sunk_ship=b_sunk_name,
        ),
        game_over=game_over,
        winner=winner,
    )


@router.get("/{game_id}", response_model=GameState)
async def get_game(
    game_id: str,
    repo: GamesRepo = Depends(get_games_repo),
):
    game = await repo.get(game_id)
    if not game:
        raise HTTPException(404, "Game not found")

    player_board_data = game["player_board"] if isinstance(game["player_board"], dict) else json.loads(game["player_board"])
    moves = game["moves"] if isinstance(game["moves"], list) else json.loads(game["moves"])

    player_shots = [
        {"coord": m["coord"], "result": m["result"], "sunk_ship": m.get("sunk_ship")}
        for m in moves
        if m["by"] == "player"
    ]
    player_shots_received = [
        {"coord": m["coord"], "result": m["result"], "sunk_ship": m.get("sunk_ship")}
        for m in moves
        if m["by"] == "bot"
    ]

    return GameState(
        game_id=game["id"],
        status=game["status"],
        player_ships=player_board_data.get("ships", []),
        player_shots_received=player_shots_received,
        my_shots=player_shots,
        winner=game.get("winner"),
    )
```

### Step 3: Test with curl

- [ ] Start or restart the backend and run:

```bash
# Create user
USER=$(curl -s -X POST http://localhost:8000/api/users/anon)
echo $USER
USER_ID=$(echo $USER | python3 -c "import sys,json; print(json.load(sys.stdin)['user_id'])")

# Create game
GAME=$(curl -s -X POST http://localhost:8000/api/games \
  -H "Content-Type: application/json" \
  -d "{\"user_id\": \"$USER_ID\", \"mode\": \"pvbot_easy\"}")
echo $GAME
GAME_ID=$(echo $GAME | python3 -c "import sys,json; print(json.load(sys.stdin)['game_id'])")

# Auto-place ships
curl -s -X POST http://localhost:8000/api/games/$GAME_ID/place-auto | python3 -m json.tool

# Shoot
curl -s -X POST http://localhost:8000/api/games/$GAME_ID/shoot \
  -H "Content-Type: application/json" \
  -d '{"coord": {"row": 0, "col": 0}}' | python3 -m json.tool

# Get game state
curl -s http://localhost:8000/api/games/$GAME_ID | python3 -m json.tool
```

Expected: valid JSON responses at each step; no 500 errors.

### Step 4: Commit

- [ ] Commit:

```bash
cd /Users/nurma/vscode_projects/BattleShipGame
git add backend/app/api/games.py backend/app/schemas/game.py
git commit -m "feat(api): implement all game endpoints (create, place, shoot, get)"
```

---

## Task 7: Frontend — Cell States and Board

**Files:**
- Modify: `frontend/src/components/Cell.tsx`
- Modify: `frontend/src/components/Board.tsx`

### Step 1: Update Cell to support visual states

- [ ] Replace `frontend/src/components/Cell.tsx`:

```tsx
"use client";

export type CellState = "empty" | "ship" | "hit" | "miss" | "sunk" | "preview";

const STATE_CLASSES: Record<CellState, string> = {
  empty: "bg-slate-100 hover:bg-blue-200 cursor-pointer",
  ship: "bg-blue-500",
  hit: "bg-red-500 cursor-default",
  miss: "bg-slate-300 cursor-default",
  sunk: "bg-red-800 cursor-default",
  preview: "bg-blue-300 cursor-pointer",
};

export default function Cell({
  row,
  col,
  owner,
  state = "empty",
  onClick,
  onHover,
}: {
  row: number;
  col: number;
  owner: "player" | "enemy";
  state?: CellState;
  onClick?: () => void;
  onHover?: () => void;
}) {
  const disabled = state === "hit" || state === "miss" || state === "sunk";
  return (
    <button
      onClick={disabled ? undefined : onClick}
      onMouseEnter={onHover}
      aria-label={`${owner} ${row},${col} ${state}`}
      className={`h-8 w-8 border border-slate-200 transition-colors ${STATE_CLASSES[state]}`}
    />
  );
}
```

### Step 2: Update Board to accept cell states

- [ ] Replace `frontend/src/components/Board.tsx`:

```tsx
"use client";

import Cell, { type CellState } from "./Cell";

const SIZE = 10;

export default function Board({
  owner,
  cellStates = {},
  onCellClick,
  onCellHover,
}: {
  owner: "player" | "enemy";
  cellStates?: Record<string, CellState>;
  onCellClick?: (row: number, col: number) => void;
  onCellHover?: (row: number, col: number) => void;
}) {
  return (
    <div
      className="inline-grid gap-px rounded-md bg-slate-400 p-px"
      style={{ gridTemplateColumns: `repeat(${SIZE}, 2rem)` }}
    >
      {Array.from({ length: SIZE * SIZE }).map((_, i) => {
        const row = Math.floor(i / SIZE);
        const col = i % SIZE;
        const key = `${row},${col}`;
        return (
          <Cell
            key={i}
            row={row}
            col={col}
            owner={owner}
            state={cellStates[key] ?? "empty"}
            onClick={() => onCellClick?.(row, col)}
            onHover={() => onCellHover?.(row, col)}
          />
        );
      })}
    </div>
  );
}
```

### Step 3: Type-check

- [ ] Run TypeScript check:

```bash
cd /Users/nurma/vscode_projects/BattleShipGame/frontend
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

### Step 4: Commit

- [ ] Commit:

```bash
cd /Users/nurma/vscode_projects/BattleShipGame
git add frontend/src/components/Cell.tsx frontend/src/components/Board.tsx
git commit -m "feat(ui): Cell states (ship/hit/miss/sunk/preview) + Board cellStates map"
```

---

## Task 8: Frontend — Ship Placer

**Files:**
- Modify: `frontend/src/components/ShipPlacer.tsx`
- Modify: `frontend/src/hooks/usePlacement.ts`

Interaction model (click-to-place, simpler than drag-drop):
1. Ships listed on the side; click to select
2. Hover over board to see preview of ship at that position
3. Click board cell to place selected ship
4. Press R or right-click to rotate pending ship
5. "Auto-place" button calls the API

### Step 1: Implement usePlacement hook

- [ ] Replace `frontend/src/hooks/usePlacement.ts`:

```ts
"use client";

import { useState, useCallback } from "react";
import type { CellState } from "@/components/Cell";

export type ShipSpec = { name: string; size: number };
export type PlacedShip = ShipSpec & { row: number; col: number; orientation: "H" | "V" };

const FLEET: ShipSpec[] = [
  { name: "Carrier", size: 5 },
  { name: "Battleship", size: 4 },
  { name: "Cruiser", size: 3 },
  { name: "Submarine", size: 3 },
  { name: "Destroyer", size: 2 },
];

function shipCells(row: number, col: number, size: number, orientation: "H" | "V") {
  return Array.from({ length: size }, (_, i) =>
    orientation === "H" ? [row, col + i] : [row + i, col]
  );
}

function isInBounds(row: number, col: number) {
  return row >= 0 && row < 10 && col >= 0 && col < 10;
}

export function usePlacement() {
  const [placed, setPlaced] = useState<PlacedShip[]>([]);
  const [selectedShip, setSelectedShip] = useState<ShipSpec | null>(null);
  const [orientation, setOrientation] = useState<"H" | "V">("H");
  const [hoverCell, setHoverCell] = useState<[number, number] | null>(null);

  const unplacedFleet = FLEET.filter((s) => !placed.find((p) => p.name === s.name));

  const toggleOrientation = useCallback(() => {
    setOrientation((o) => (o === "H" ? "V" : "H"));
  }, []);

  const placeShip = useCallback(
    (row: number, col: number) => {
      if (!selectedShip) return;
      const cells = shipCells(row, col, selectedShip.size, orientation);
      if (!cells.every(([r, c]) => isInBounds(r, c))) return;
      const occupiedKeys = new Set(placed.flatMap((p) => shipCells(p.row, p.col, p.size, p.orientation).map(([r, c]) => `${r},${c}`)));
      if (cells.some(([r, c]) => occupiedKeys.has(`${r},${c}`))) return;

      setPlaced((prev) => [...prev, { ...selectedShip, row, col, orientation }]);
      setSelectedShip(null);
    },
    [selectedShip, orientation, placed]
  );

  const removeShip = useCallback((name: string) => {
    setPlaced((prev) => prev.filter((s) => s.name !== name));
  }, []);

  const reset = useCallback(() => {
    setPlaced([]);
    setSelectedShip(null);
  }, []);

  // Build cell states for the board
  const cellStates: Record<string, CellState> = {};
  for (const ship of placed) {
    for (const [r, c] of shipCells(ship.row, ship.col, ship.size, ship.orientation)) {
      cellStates[`${r},${c}`] = "ship";
    }
  }
  if (selectedShip && hoverCell) {
    const [hr, hc] = hoverCell;
    const previewCells = shipCells(hr, hc, selectedShip.size, orientation);
    const occupied = new Set(Object.keys(cellStates));
    const valid = previewCells.every(([r, c]) => isInBounds(r, c) && !occupied.has(`${r},${c}`));
    for (const [r, c] of previewCells) {
      if (isInBounds(r, c)) {
        cellStates[`${r},${c}`] = valid ? "preview" : "hit";
      }
    }
  }

  const isComplete = placed.length === FLEET.length;

  return {
    placed,
    unplacedFleet,
    selectedShip,
    setSelectedShip,
    orientation,
    toggleOrientation,
    placeShip,
    removeShip,
    reset,
    setHoverCell,
    cellStates,
    isComplete,
  };
}
```

### Step 2: Implement ShipPlacer component

- [ ] Replace `frontend/src/components/ShipPlacer.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import Board from "./Board";
import { usePlacement, type PlacedShip } from "@/hooks/usePlacement";

export default function ShipPlacer({
  onConfirm,
  onAutoPlace,
}: {
  onConfirm: (ships: PlacedShip[]) => void;
  onAutoPlace: () => void;
}) {
  const {
    placed,
    unplacedFleet,
    selectedShip,
    setSelectedShip,
    orientation,
    toggleOrientation,
    placeShip,
    removeShip,
    reset,
    setHoverCell,
    cellStates,
    isComplete,
  } = usePlacement();

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "r" || e.key === "R") toggleOrientation();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [toggleOrientation]);

  return (
    <div className="flex flex-col gap-6 md:flex-row">
      <div>
        <h2 className="mb-2 text-lg font-semibold">Place Your Fleet</h2>
        <p className="mb-3 text-sm text-slate-500">
          Click a ship, then click the board. Press <kbd className="rounded bg-slate-200 px-1">R</kbd> to rotate.
        </p>
        <Board
          owner="player"
          cellStates={cellStates}
          onCellClick={placeShip}
          onCellHover={(r, c) => setHoverCell([r, c])}
        />
      </div>

      <div className="flex min-w-40 flex-col gap-3">
        <h3 className="font-medium">Fleet</h3>

        <div className="space-y-2">
          {unplacedFleet.map((ship) => (
            <button
              key={ship.name}
              onClick={() => setSelectedShip(selectedShip?.name === ship.name ? null : ship)}
              className={`w-full rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                selectedShip?.name === ship.name
                  ? "border-blue-500 bg-blue-50 font-semibold"
                  : "border-slate-200 hover:border-blue-300"
              }`}
            >
              {ship.name} ({ship.size})
            </button>
          ))}
        </div>

        {placed.length > 0 && (
          <div className="mt-2 space-y-1">
            <p className="text-xs font-medium text-slate-500">Placed:</p>
            {placed.map((ship) => (
              <div key={ship.name} className="flex items-center justify-between text-sm">
                <span>{ship.name}</span>
                <button
                  onClick={() => removeShip(ship.name)}
                  className="text-xs text-red-400 hover:text-red-600"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-auto flex flex-col gap-2">
          <button
            onClick={toggleOrientation}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
          >
            Rotate ({orientation})
          </button>
          <button
            onClick={reset}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
          >
            Reset
          </button>
          <button
            onClick={onAutoPlace}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
          >
            Auto-Place
          </button>
          <button
            disabled={!isComplete}
            onClick={() => onConfirm(placed)}
            className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-40"
          >
            Start Game →
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Step 3: Type-check

- [ ] Run TypeScript check:

```bash
cd /Users/nurma/vscode_projects/BattleShipGame/frontend
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

### Step 4: Commit

- [ ] Commit:

```bash
cd /Users/nurma/vscode_projects/BattleShipGame
git add frontend/src/hooks/usePlacement.ts frontend/src/components/ShipPlacer.tsx
git commit -m "feat(ui): ShipPlacer with click-to-place, rotate, preview"
```

---

## Task 9: Frontend — Play Page (Mode Select + Placement)

**Files:**
- Modify: `frontend/src/app/play/page.tsx`

Flow:
1. User selects mode
2. Clicks "New Game" → calls `POST /api/games` → gets `game_id`
3. Shows ShipPlacer
4. "Auto-Place" → calls `POST /api/games/{id}/place-auto` → ships placed
5. "Start Game" → calls `POST /api/games/{id}/place` → navigates to `/game/[id]`

### Step 1: Update types in lib/types.ts

- [ ] Modify `frontend/src/lib/types.ts` — add a `PlacedShip` export alias:

```ts
export type Coord = { row: number; col: number };

export type GameMode = "pvbot_easy" | "pvbot_medium" | "pvbot_hard" | "hotseat";

export type PlacedShip = {
  name: string;
  size: number;
  row: number;
  col: number;
  orientation: "H" | "V";
};

export type ShotResult = {
  result: "hit" | "miss" | "sunk";
  sunk_ship?: string | null;
  bot_move?: { coord: Coord; result: "hit" | "miss" | "sunk"; sunk_ship?: string | null } | null;
  game_over: boolean;
  winner?: "player" | "bot" | null;
};

export type Archetype =
  | "Random Shooter"
  | "Aggressive Hunter"
  | "Methodical Planner"
  | "Defensive Placer"
  | "Pattern-Locked";

export type CoachAnalysis = {
  archetype: Archetype;
  top_mistake: string;
  tips: [string, string, string];
  did_well: string;
};
```

### Step 2: Update play/page.tsx

- [ ] Replace `frontend/src/app/play/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import ShipPlacer from "@/components/ShipPlacer";
import { api } from "@/lib/api";
import { getOrCreateUserId } from "@/lib/user";
import type { GameMode, PlacedShip } from "@/lib/types";
import type { PlacedShip as PlacedShipLocal } from "@/hooks/usePlacement";

const MODE_LABELS: Record<GameMode, string> = {
  pvbot_easy: "Easy",
  pvbot_medium: "Medium",
  pvbot_hard: "Hard",
  hotseat: "Hot-Seat (2 players)",
};

export default function PlayPage() {
  const router = useRouter();
  const [mode, setMode] = useState<GameMode>("pvbot_medium");
  const [gameId, setGameId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startNewGame() {
    setLoading(true);
    setError(null);
    try {
      const userId = await getOrCreateUserId();
      const { game_id } = await api.post<{ game_id: string; fleet: unknown[] }>("/api/games", {
        user_id: userId,
        mode,
      });
      setGameId(game_id);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleAutoPlace() {
    if (!gameId) return;
    try {
      const { ships } = await api.post<{ ships: PlacedShip[] }>(
        `/api/games/${gameId}/place-auto`
      );
      // Auto-place sets status=active on the server; navigate directly
      router.push(`/game/${gameId}`);
    } catch (e) {
      setError(String(e));
    }
  }

  async function handleConfirm(ships: PlacedShipLocal[]) {
    if (!gameId) return;
    setLoading(true);
    try {
      await api.post(`/api/games/${gameId}/place`, { ships });
      router.push(`/game/${gameId}`);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  if (gameId) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="mb-6 text-3xl font-bold">Place Your Ships</h1>
        {error && <p className="mb-4 text-red-600">{error}</p>}
        <ShipPlacer onConfirm={handleConfirm} onAutoPlace={handleAutoPlace} />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <h1 className="text-3xl font-bold">New Game</h1>
      <p className="mt-2 text-slate-500">Choose a difficulty and start playing.</p>

      <div className="mt-6 space-y-2">
        {(Object.entries(MODE_LABELS) as [GameMode, string][]).map(([m, label]) => (
          <label
            key={m}
            className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
              mode === m ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-blue-300"
            }`}
          >
            <input
              type="radio"
              className="accent-blue-600"
              checked={mode === m}
              onChange={() => setMode(m)}
            />
            <span className="font-medium">{label}</span>
          </label>
        ))}
      </div>

      {error && <p className="mt-4 text-red-600">{error}</p>}

      <button
        onClick={startNewGame}
        disabled={loading}
        className="mt-6 w-full rounded-md bg-blue-600 px-6 py-3 text-white font-semibold disabled:opacity-50"
      >
        {loading ? "Starting…" : "Start Game →"}
      </button>
    </main>
  );
}
```

### Step 3: Type-check

- [ ] Run TypeScript check:

```bash
cd /Users/nurma/vscode_projects/BattleShipGame/frontend
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

### Step 4: Commit

- [ ] Commit:

```bash
cd /Users/nurma/vscode_projects/BattleShipGame
git add frontend/src/app/play/page.tsx frontend/src/lib/types.ts
git commit -m "feat(ui): play page — mode select, game creation, ship placement flow"
```

---

## Task 10: Frontend — Active Game Page

**Files:**
- Modify: `frontend/src/hooks/useGame.ts`
- Modify: `frontend/src/app/game/[id]/page.tsx`

The active game page shows:
- **Left board** (player's fleet): your ships + hits you've received from bot
- **Right board** (enemy waters): your shots (hits/misses); clicking fires a shot

### Step 1: Expand useGame hook

- [ ] Replace `frontend/src/hooks/useGame.ts`:

```ts
"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import type { CellState } from "@/components/Cell";
import type { ShotResult } from "@/lib/types";

type ShipDict = {
  name: string;
  size: number;
  row: number;
  col: number;
  orientation: "H" | "V";
  hits: [number, number][];
};

type ShotRecord = {
  coord: [number, number];
  result: "hit" | "miss" | "sunk";
  sunk_ship?: string | null;
};

type GameState = {
  game_id: string;
  status: string;
  player_ships: ShipDict[];
  player_shots_received: ShotRecord[];
  my_shots: ShotRecord[];
  winner: string | null;
};

function buildPlayerCells(ships: ShipDict[], shotsReceived: ShotRecord[]): Record<string, CellState> {
  const states: Record<string, CellState> = {};
  for (const ship of ships) {
    const cells = Array.from({ length: ship.size }, (_, i) =>
      ship.orientation === "H" ? [ship.row, ship.col + i] : [ship.row + i, ship.col]
    ) as [number, number][];
    const hitSet = new Set(ship.hits.map(([r, c]) => `${r},${c}`));
    const isSunk = ship.hits.length === ship.size;
    for (const [r, c] of cells) {
      states[`${r},${c}`] = isSunk ? "sunk" : hitSet.has(`${r},${c}`) ? "hit" : "ship";
    }
  }
  for (const shot of shotsReceived) {
    const key = `${shot.coord[0]},${shot.coord[1]}`;
    if (!(key in states)) {
      states[key] = shot.result === "miss" ? "miss" : "hit";
    }
  }
  return states;
}

function buildEnemyCells(myShots: ShotRecord[]): Record<string, CellState> {
  const states: Record<string, CellState> = {};
  for (const shot of myShots) {
    states[`${shot.coord[0]},${shot.coord[1]}`] =
      shot.result === "sunk" ? "sunk" : shot.result === "hit" ? "hit" : "miss";
  }
  return states;
}

export function useGame(gameId: string) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState<ShotResult | null>(null);

  const refresh = useCallback(async () => {
    const data = await api.get<GameState>(`/api/games/${gameId}`);
    setGameState(data);
  }, [gameId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const shoot = useCallback(
    async (row: number, col: number) => {
      if (busy || !gameState || gameState.status !== "active") return;
      setBusy(true);
      try {
        const result = await api.post<ShotResult>(`/api/games/${gameId}/shoot`, {
          coord: { row, col },
        });
        setLastResult(result);
        await refresh();
      } finally {
        setBusy(false);
      }
    },
    [busy, gameState, gameId, refresh]
  );

  const playerCells = gameState
    ? buildPlayerCells(gameState.player_ships, gameState.player_shots_received)
    : {};
  const enemyCells = gameState ? buildEnemyCells(gameState.my_shots) : {};

  return {
    gameState,
    busy,
    lastResult,
    shoot,
    playerCells,
    enemyCells,
  };
}
```

### Step 2: Update game/[id]/page.tsx

- [ ] Replace `frontend/src/app/game/[id]/page.tsx`:

```tsx
"use client";

import { use } from "react";
import Link from "next/link";
import Board from "@/components/Board";
import { useGame } from "@/hooks/useGame";

export default function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { gameState, busy, lastResult, shoot, playerCells, enemyCells } = useGame(id);

  if (!gameState) {
    return <main className="p-8 text-center text-slate-500">Loading…</main>;
  }

  const isOver = gameState.status === "finished";
  const won = gameState.winner === "player";

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-4 flex items-center gap-4">
        <h1 className="text-2xl font-bold">Ocean Strike</h1>
        {busy && <span className="text-sm text-slate-500">Processing…</span>}
        {lastResult && !isOver && (
          <span className={`text-sm font-medium ${lastResult.result === "miss" ? "text-slate-500" : "text-red-600"}`}>
            Your shot: {lastResult.result.toUpperCase()}
            {lastResult.bot_move && ` · Bot: ${lastResult.bot_move.result.toUpperCase()}`}
          </span>
        )}
      </div>

      {isOver && (
        <div className={`mb-6 rounded-xl p-4 text-center text-lg font-bold ${won ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
          {won ? "You won! 🎉" : "You lost. Better luck next time."}
          <div className="mt-2">
            <Link href={`/game/${id}/review`} className="mr-4 text-sm underline">
              See AI Coach Report →
            </Link>
            <Link href="/play" className="text-sm underline">
              Play again
            </Link>
          </div>
        </div>
      )}

      <div className="grid gap-10 md:grid-cols-2">
        <div>
          <h2 className="mb-2 font-semibold">Your Fleet</h2>
          <Board owner="player" cellStates={playerCells} />
        </div>
        <div>
          <h2 className="mb-2 font-semibold">Enemy Waters {!isOver && <span className="text-sm font-normal text-slate-400">(click to shoot)</span>}</h2>
          <Board
            owner="enemy"
            cellStates={enemyCells}
            onCellClick={isOver ? undefined : (r, c) => shoot(r, c)}
          />
        </div>
      </div>
    </main>
  );
}
```

### Step 3: Type-check

- [ ] Run TypeScript check:

```bash
cd /Users/nurma/vscode_projects/BattleShipGame/frontend
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

### Step 4: Commit

- [ ] Commit:

```bash
cd /Users/nurma/vscode_projects/BattleShipGame
git add frontend/src/hooks/useGame.ts frontend/src/app/game/[id]/page.tsx
git commit -m "feat(ui): active game page — shoot, display boards, game over state"
```

---

## Task 11: End-to-End Smoke Test

**Goal:** Verify the full game loop works: create user → create game → place ships → shoot until win/loss → see result.

### Step 1: Start both servers

- [ ] Start backend:

```bash
cd /Users/nurma/vscode_projects/BattleShipGame/backend
.venv/bin/uvicorn app.main:app --reload --port 8000
```

- [ ] Start frontend (separate terminal):

```bash
cd /Users/nurma/vscode_projects/BattleShipGame/frontend
npm run dev
```

### Step 2: Play through the game

- [ ] Open `http://localhost:3000/play` in a browser
- [ ] Select a difficulty (Easy recommended for testing)
- [ ] Click "Start Game →"
- [ ] Click "Auto-Place" on the placement screen
- [ ] Verify you are redirected to `/game/[id]`
- [ ] Click cells on the enemy board to fire shots
- [ ] Verify hits/misses/sunk display correctly on both boards
- [ ] Continue until game ends
- [ ] Verify win/loss message appears
- [ ] Verify "See AI Coach Report" link is present

### Step 3: Run all backend tests one last time

- [ ] Run:

```bash
cd /Users/nurma/vscode_projects/BattleShipGame/backend
.venv/bin/pytest -v 2>&1 | tail -20
```

Expected: all tests PASS.

### Step 4: Final commit

- [ ] Commit if any last cleanup:

```bash
cd /Users/nurma/vscode_projects/BattleShipGame
git add -p  # review any unstaged changes
git commit -m "chore: Tier 0 complete — core game engine, API, and frontend"
```

---

## Self-Review Against SPEC.md

### Spec Coverage Check

| Spec Requirement | Covered By |
|---|---|
| 10×10 board | `Board` class (existing), `BOARD_SIZE=10` |
| Classic fleet (Carrier-5, Battleship-4, Cruiser-3, Submarine-3, Destroyer-2) | `FLEET_SPEC` (existing) + `validate_fleet` (Task 1) |
| Manual ship placement | `ShipPlacer` component (Task 8) + `POST /place` (Task 6) |
| "Auto-place" button | `ShipPlacer.onAutoPlace` (Task 8) + `POST /place-auto` (Task 6) |
| Server-side validation (overlaps, OOB, fleet composition) | `validate_fleet` (Task 1) called in `POST /place` (Task 6) |
| Turn-based play vs AI bot | `POST /shoot` returns player result + bot counter-move (Task 6) |
| Hit / miss / sunk / win-loss states | `ShotResult` schema + `Board.is_lost()` (Task 6) |
| Easy bot = pure random | `RandomBot` (existing) |
| Medium bot = hunt mode | `HuntBot` (Task 2) |
| Hard bot = probabilistic targeting | `ProbBot` (Task 3) |
| Responsive UI (desktop + mobile) | Tailwind `md:grid-cols-2` in game page (Task 10) |
| Hot-seat mode | Handled in `/shoot` — no bot move returned in hotseat mode (Task 6) |

### Not Covered in This Plan (Tier 1–3, separate plan)
- AI Coach (Tier 1)
- Stats, history, persistence UI (Tier 2)
- Leaderboard, dark mode, upgrade modal, landing page (Tier 3)
