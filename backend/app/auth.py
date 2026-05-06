from fastapi import HTTPException

from app.db.supabase import get_supabase


async def verify_token(token: str):
    response = get_supabase().auth.get_user(token)
    if response.user is None:
        raise HTTPException(status_code=401, detail="Invalid token")
    return response.user
