import json

from fastapi import APIRouter, Depends

from app.db.repositories.analyses import AnalysesRepo
from app.db.repositories.games import GamesRepo
from app.deps import get_analyses_repo, get_games_repo

router = APIRouter()


def _parse(raw) -> list | dict:
    return raw if isinstance(raw, (list, dict)) else json.loads(raw)


def _accuracy_from_moves(moves: list) -> float:
    player_moves = [m for m in moves if m["by"] == "player"]
    if not player_moves:
        return 0.0
    hits = sum(1 for m in player_moves if m["result"] in ("hit", "sunk"))
    return round(100.0 * hits / len(player_moves), 1)


@router.get("/{user_id}/stats")
async def get_stats(
    user_id: str,
    games_repo: GamesRepo = Depends(get_games_repo),
    analyses_repo: AnalysesRepo = Depends(get_analyses_repo),
):
    all_games = await games_repo.list_for_user(user_id, limit=100)
    finished = [g for g in all_games if g["status"] == "finished"]

    total = len(finished)
    wins = sum(1 for g in finished if g.get("winner") == "player")
    win_rate = round(100.0 * wins / total, 1) if total else 0.0

    # Overall accuracy across all finished games
    all_moves: list = []
    for g in finished:
        all_moves.extend(_parse(g["moves"]))
    player_shots = [m for m in all_moves if m["by"] == "player"]
    hits = sum(1 for m in player_shots if m["result"] in ("hit", "sunk"))
    accuracy_pct = round(100.0 * hits / len(player_shots), 1) if player_shots else 0.0

    # Win streak (from most recent)
    streak = 0
    for g in finished:
        if g.get("winner") == "player":
            streak += 1
        else:
            break

    # Archetype evolution — last 10 finished games, oldest first
    recent_10 = finished[:10]
    archetypes: list[dict] = []
    for g in recent_10:
        row = await analyses_repo.get(g["id"])
        archetypes.append({
            "game_id": g["id"],
            "archetype": row["archetype"] if row else None,
            "ended_at": g.get("ended_at"),
            "won": g.get("winner") == "player",
        })
    archetypes.reverse()  # chronological order

    return {
        "total_games": total,
        "wins": wins,
        "win_rate": win_rate,
        "accuracy_pct": accuracy_pct,
        "streak": streak,
        "archetypes": archetypes,
    }


@router.get("/{user_id}/games")
async def get_games(
    user_id: str,
    limit: int = 20,
    offset: int = 0,
    games_repo: GamesRepo = Depends(get_games_repo),
    analyses_repo: AnalysesRepo = Depends(get_analyses_repo),
):
    games = await games_repo.list_for_user(user_id, limit=limit, offset=offset)
    result = []
    for g in games:
        moves = _parse(g["moves"])
        accuracy = _accuracy_from_moves(moves) if g["status"] == "finished" else None

        archetype = None
        if g["status"] == "finished":
            row = await analyses_repo.get(g["id"])
            if row:
                archetype = row["archetype"]

        result.append({
            "game_id": g["id"],
            "mode": g["mode"],
            "status": g["status"],
            "winner": g.get("winner"),
            "accuracy_pct": accuracy,
            "archetype": archetype,
            "started_at": g.get("started_at"),
            "ended_at": g.get("ended_at"),
        })
    return {"games": result, "offset": offset, "limit": limit}
