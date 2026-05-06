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
    fleet: list[dict]


class PlacementRequest(BaseModel):
    ships: list[ShipPlacement]


class AutoPlaceResponse(BaseModel):
    ships: list[dict]


class GameState(BaseModel):
    game_id: str
    status: str
    player_ships: list[dict]
    player_shots_received: list[dict]
    my_shots: list[dict]
    winner: str | None
