from fastapi import APIRouter

from app.schemas.user import RegionUpdate, UserCreated

router = APIRouter()


@router.post("/anon", response_model=UserCreated)
async def create_anon_user():
    raise NotImplementedError


@router.post("/{user_id}/region")
async def set_region(user_id: str, payload: RegionUpdate):
    raise NotImplementedError
