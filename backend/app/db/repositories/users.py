import uuid

from supabase import Client


class UsersRepo:
    def __init__(self, db: Client):
        self.db = db

    async def create_anon(self) -> dict:
        user_id = str(uuid.uuid4())
        res = self.db.table("users").insert({"id": user_id}).execute()
        return res.data[0]

    async def set_region(self, user_id: str, region: str) -> None:
        self.db.table("users").update({"region": region}).eq("id", user_id).execute()

    async def get(self, user_id: str) -> dict | None:
        res = self.db.table("users").select("*").eq("id", user_id).maybe_single().execute()
        return res.data

    async def upsert_auth_user(self, auth_id: str, email: str) -> dict:
        data = {"id": auth_id, "auth_id": auth_id, "email": email}
        res = (
            self.db.table("users")
            .upsert(data, on_conflict="auth_id")
            .execute()
        )
        return res.data[0]
