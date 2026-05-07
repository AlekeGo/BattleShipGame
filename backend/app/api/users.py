from fastapi import APIRouter, Depends, HTTPException

from app.db.repositories.users import UsersRepo
from app.deps import get_users_repo
from app.schemas.user import ProfileUpdate, RegionUpdate, UserCreated

router = APIRouter()


@router.post("/anon", response_model=UserCreated)
async def create_anon_user(repo: UsersRepo = Depends(get_users_repo)):
    user = await repo.create_anon()
    return {"user_id": user["id"]}


@router.get("/{user_id}")
async def get_user(user_id: str, repo: UsersRepo = Depends(get_users_repo)):
    user = await repo.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.post("/{user_id}/region")
async def set_region(
    user_id: str,
    payload: RegionUpdate,
    repo: UsersRepo = Depends(get_users_repo),
):
    await repo.set_region(user_id, payload.region)
    return {"ok": True}


@router.patch("/{user_id}/profile")
async def update_profile(
    user_id: str,
    payload: ProfileUpdate,
    repo: UsersRepo = Depends(get_users_repo),
):
    user = await repo.update_profile(user_id, payload.display_name, payload.region)
    return user
