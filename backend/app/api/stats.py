from fastapi import APIRouter, Depends, Query

from app.db.repositories.analyses import AnalysesRepo
from app.db.repositories.games import GamesRepo
from app.deps import get_analyses_repo, get_games_repo
from app.utils import parse_json_field as _parse

router = APIRouter()

MAX_STATS_GAMES = 100
MAX_PAGE_SIZE = 100


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
    all_games = await games_repo.list_for_user(user_id, limit=MAX_STATS_GAMES)
    finished = [g for g in all_games if g["status"] == "finished"]

    total = len(finished)
    wins = sum(1 for g in finished if g.get("winner") == "player")
    win_rate = round(100.0 * wins / total, 1) if total else 0.0

    # Overall accuracy across all finished games
    all_moves: list = []
    for g in finished:
        all_moves.extend(_parse(g["moves"]))
    accuracy_pct = _accuracy_from_moves(all_moves)

    # Win streak (from most recent, list is newest-first)
    streak = 0
    for g in finished:
        if g.get("winner") == "player":
            streak += 1
        else:
            break

    # Archetype evolution — last 10 finished games, batch-fetched, oldest first
    recent_10 = list(reversed(finished[:10]))
    recent_ids = [g["id"] for g in recent_10]
    analysis_map = await analyses_repo.get_batch(recent_ids)
    archetypes = [
        {
            "game_id": g["id"],
            "archetype": analysis_map[g["id"]]["archetype"] if g["id"] in analysis_map else None,
            "ended_at": g.get("ended_at"),
            "won": g.get("winner") == "player",
        }
        for g in recent_10
    ]

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
    limit: int = Query(default=20, ge=1, le=MAX_PAGE_SIZE),
    offset: int = Query(default=0, ge=0),
    games_repo: GamesRepo = Depends(get_games_repo),
    analyses_repo: AnalysesRepo = Depends(get_analyses_repo),
):
    games = await games_repo.list_for_user(user_id, limit=limit, offset=offset)

    # Batch-fetch analyses for all finished games in one query
    finished_ids = [g["id"] for g in games if g["status"] == "finished"]
    analysis_map = await analyses_repo.get_batch(finished_ids)

    result = []
    for g in games:
        moves = _parse(g["moves"])
        accuracy = _accuracy_from_moves(moves) if g["status"] == "finished" else None
        row = analysis_map.get(g["id"])
        result.append({
            "game_id": g["id"],
            "mode": g["mode"],
            "status": g["status"],
            "winner": g.get("winner"),
            "accuracy_pct": accuracy,
            "archetype": row["archetype"] if row else None,
            "started_at": g.get("started_at"),
            "ended_at": g.get("ended_at"),
        })
    return {"games": result, "offset": offset, "limit": limit}
