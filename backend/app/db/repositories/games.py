from supabase import Client


class GamesRepo:
    def __init__(self, db: Client):
        self.db = db

    async def create(self, user_id: str, mode: str) -> dict:
        raise NotImplementedError

    async def get(self, game_id: str) -> dict | None:
        raise NotImplementedError

    async def update_state(self, game_id: str, **fields) -> None:
        raise NotImplementedError

    async def append_move(self, game_id: str, move: dict) -> None:
        raise NotImplementedError

    async def list_for_user(self, user_id: str, limit: int = 20, offset: int = 0) -> list[dict]:
        raise NotImplementedError
