from fastapi import APIRouter

router = APIRouter()


@router.get("")
async def leaderboard(region: str | None = None):
    raise NotImplementedError
