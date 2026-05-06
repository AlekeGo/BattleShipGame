from supabase import Client


class UsersRepo:
    def __init__(self, db: Client):
        self.db = db

    async def create_anon(self) -> dict:
        raise NotImplementedError

    async def set_region(self, user_id: str, region: str) -> None:
        raise NotImplementedError

    async def get(self, user_id: str) -> dict | None:
        raise NotImplementedError
