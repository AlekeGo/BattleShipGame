from fastapi import APIRouter

router = APIRouter()


@router.get("/{user_id}/stats")
async def get_stats(user_id: str):
    raise NotImplementedError


@router.get("/{user_id}/games")
async def get_games(user_id: str, limit: int = 20, offset: int = 0):
    raise NotImplementedError
