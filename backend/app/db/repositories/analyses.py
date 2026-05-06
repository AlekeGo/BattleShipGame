from supabase import Client


class AnalysesRepo:
    def __init__(self, db: Client):
        self.db = db

    async def get(self, game_id: str) -> dict | None:
        raise NotImplementedError

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
        raise NotImplementedError
