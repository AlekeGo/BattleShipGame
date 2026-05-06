import json

from supabase import Client


class GamesRepo:
    def __init__(self, db: Client):
        self.db = db

    async def create(self, user_id: str, mode: str, bot_ships: list[dict]) -> dict:
        payload = {
            "user_id": user_id,
            "mode": mode,
            "player_board": json.dumps({"ships": [], "shots_received": []}),
            "bot_board": json.dumps({"ships": bot_ships, "shots_received": []}),
            "moves": json.dumps([]),
            "status": "placing",
        }
        res = self.db.table("games").insert(payload).execute()
        return res.data[0]

    async def get(self, game_id: str) -> dict | None:
        res = (
            self.db.table("games")
            .select("*")
            .eq("id", game_id)
            .maybe_single()
            .execute()
        )
        return res.data

    async def update_state(self, game_id: str, **fields) -> None:
        encoded = {}
        for k, v in fields.items():
            encoded[k] = json.dumps(v) if isinstance(v, (dict, list)) else v
        self.db.table("games").update(encoded).eq("id", game_id).execute()

    async def append_move(self, game_id: str, move: dict) -> None:
        row = await self.get(game_id)
        moves = row["moves"] if isinstance(row["moves"], list) else json.loads(row["moves"])
        moves.append(move)
        self.db.table("games").update({"moves": json.dumps(moves)}).eq("id", game_id).execute()

    async def list_for_user(self, user_id: str, limit: int = 20, offset: int = 0) -> list[dict]:
        res = (
            self.db.table("games")
            .select("*")
            .eq("user_id", user_id)
            .order("started_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        return res.data
