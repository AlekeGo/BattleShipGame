from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from app.db.supabase import get_supabase

router = APIRouter()


@router.get("")
async def leaderboard(region: str | None = None, db: Client = Depends(get_supabase)):
    try:
        q = db.table("regional_leaderboard").select("*")
        if region:
            q = q.eq("region", region)
        res = q.order("accuracy_pct", desc=True).execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
