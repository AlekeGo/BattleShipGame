from fastapi import Depends
from supabase import Client

from app.db.supabase import get_supabase
from app.db.repositories.users import UsersRepo
from app.db.repositories.games import GamesRepo


def get_users_repo(db: Client = Depends(get_supabase)) -> UsersRepo:
    return UsersRepo(db)


def get_games_repo(db: Client = Depends(get_supabase)) -> GamesRepo:
    return GamesRepo(db)
