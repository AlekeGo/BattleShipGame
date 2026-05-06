from fastapi import APIRouter

from app.schemas.coach import CoachAnalysis

router = APIRouter()


@router.post("/{game_id}/analyze", response_model=CoachAnalysis)
async def analyze_game(game_id: str):
    raise NotImplementedError
