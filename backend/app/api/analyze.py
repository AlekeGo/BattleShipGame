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


def _row_to_analysis(row: dict) -> CoachAnalysis:
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
    try:
        # Guard against concurrent callers (background task + explicit POST)
        existing = await analyses_repo.get(game_id)
        if existing:
            return _row_to_analysis(existing)

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
            "tips": list(analysis.tips),
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
    except Exception:
        logger.exception("Analysis failed for game %s", game_id)
        return None


@router.post("/{game_id}/analyze", response_model=CoachAnalysis)
async def analyze_game(
    game_id: str,
    games_repo: GamesRepo = Depends(get_games_repo),
    analyses_repo: AnalysesRepo = Depends(get_analyses_repo),
):
    # Cache hit — return without calling LLM
    cached = await analyses_repo.get(game_id)
    if cached:
        return _row_to_analysis(cached)

    game = await games_repo.get(game_id)
    if not game:
        raise HTTPException(404, "Game not found")
    if game["status"] != "finished":
        raise HTTPException(400, "Game is not finished yet")

    analysis = await _run_analysis(game_id, games_repo, analyses_repo)
    if analysis is None:
        raise HTTPException(500, "Analysis failed")
    return analysis
