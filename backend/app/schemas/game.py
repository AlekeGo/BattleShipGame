from typing import Literal

from pydantic import BaseModel

GameMode = Literal["pvbot_easy", "pvbot_medium", "pvbot_hard", "hotseat"]


class ShipPlacement(BaseModel):
    name: str
    size: int
    row: int
    col: int
    orientation: Literal["H", "V"]


class GameCreate(BaseModel):
    user_id: str
    mode: GameMode


class GameCreated(BaseModel):
    game_id: str
    ship_fleet: list[dict]


class PlacementRequest(BaseModel):
    ships: list[ShipPlacement]
