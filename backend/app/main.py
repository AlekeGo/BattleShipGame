from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import users, games, analyze, stats, leaderboard
from app.config import settings

app = FastAPI(title="Battleship Coach API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(games.router, prefix="/api/games", tags=["games"])
app.include_router(analyze.router, prefix="/api/games", tags=["analyze"])
app.include_router(stats.router, prefix="/api/users", tags=["stats"])
app.include_router(leaderboard.router, prefix="/api/leaderboard", tags=["leaderboard"])


@app.get("/health")
async def health():
    return {"status": "ok"}
