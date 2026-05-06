from fastapi import APIRouter

from app.schemas.game import GameCreate, GameCreated, PlacementRequest
from app.schemas.shot import ShotRequest, ShotResult

router = APIRouter()


@router.post("", response_model=GameCreated)
async def create_game(payload: GameCreate):
    raise NotImplementedError


@router.post("/{game_id}/place")
async def place_ships(game_id: str, payload: PlacementRequest):
    raise NotImplementedError


@router.post("/{game_id}/place-auto")
async def place_auto(game_id: str):
    raise NotImplementedError


@router.post("/{game_id}/shoot", response_model=ShotResult)
async def shoot(game_id: str, payload: ShotRequest):
    raise NotImplementedError


@router.get("/{game_id}")
async def get_game(game_id: str):
    raise NotImplementedError
