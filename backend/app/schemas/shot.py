from typing import Literal

from pydantic import BaseModel, Field


class Coord(BaseModel):
    row: int = Field(ge=0, le=9)
    col: int = Field(ge=0, le=9)


class ShotRequest(BaseModel):
    coord: Coord


class BotMove(BaseModel):
    coord: Coord
    result: Literal["hit", "miss", "sunk"]
    sunk_ship: str | None = None


class ShotResult(BaseModel):
    result: Literal["hit", "miss", "sunk"]
    sunk_ship: str | None = None
    bot_move: BotMove | None = None
    game_over: bool = False
    winner: Literal["player", "bot"] | None = None
