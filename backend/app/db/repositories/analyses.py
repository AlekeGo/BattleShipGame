import json

from supabase import Client


class AnalysesRepo:
    def __init__(self, db: Client):
        self.db = db

    async def get(self, game_id: str) -> dict | None:
        res = (
            self.db.table("analyses")
            .select("*")
            .eq("game_id", game_id)
            .maybe_single()
            .execute()
        )
        return res.data if res else None

    async def create(
        self,
        game_id: str,
        features: dict,
        archetype: str,
        top_mistake: str,
        tips: list[str],
        did_well: str,
        llm_raw: dict,
    ) -> dict:
        payload = {
            "game_id": game_id,
            "features": json.dumps(features),
            "archetype": archetype,
            "top_mistake": top_mistake,
            "tips": json.dumps(tips),
            "did_well": did_well,
            "llm_raw": json.dumps(llm_raw),
        }
        res = self.db.table("analyses").insert(payload).execute()
        return res.data[0]
