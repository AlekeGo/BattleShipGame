from fastapi import Depends, Header, HTTPException
from supabase import Client

from app.auth import verify_token
from app.db.supabase import get_supabase
from app.db.repositories.analyses import AnalysesRepo
from app.db.repositories.users import UsersRepo
from app.db.repositories.games import GamesRepo

__all__ = ["get_supabase", "get_users_repo", "get_games_repo", "get_analyses_repo", "get_auth_user"]


def get_users_repo(db: Client = Depends(get_supabase)) -> UsersRepo:
    return UsersRepo(db)


def get_games_repo(db: Client = Depends(get_supabase)) -> GamesRepo:
    return GamesRepo(db)


def get_analyses_repo(db: Client = Depends(get_supabase)) -> AnalysesRepo:
    return AnalysesRepo(db)


async def get_auth_user(
    authorization: str | None = Header(default=None),
    db: Client = Depends(get_supabase),
):
    if authorization is None:
        return None
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    token = authorization.removeprefix("Bearer ")
    user = await verify_token(token)
    await UsersRepo(db).upsert_auth_user(str(user.id), user.email or "")
    return user
