from typing import Literal

from pydantic import BaseModel


class Coord(BaseModel):
    row: int
    col: int


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
