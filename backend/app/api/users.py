from fastapi import APIRouter, Depends

from app.db.repositories.users import UsersRepo
from app.deps import get_users_repo
from app.schemas.user import RegionUpdate, UserCreated

router = APIRouter()


@router.post("/anon", response_model=UserCreated)
async def create_anon_user(repo: UsersRepo = Depends(get_users_repo)):
    user = await repo.create_anon()
    return {"user_id": user["id"]}


@router.post("/{user_id}/region")
async def set_region(
    user_id: str,
    payload: RegionUpdate,
    repo: UsersRepo = Depends(get_users_repo),
):
    await repo.set_region(user_id, payload.region)
    return {"ok": True}
