from typing import Literal

from pydantic import BaseModel, Field

Archetype = Literal[
    "Random Shooter",
    "Aggressive Hunter",
    "Methodical Planner",
    "Defensive Placer",
    "Pattern-Locked",
]


class CoachAnalysis(BaseModel):
    archetype: Archetype
    top_mistake: str
    tips: list[str] = Field(min_length=3, max_length=3)
    did_well: str
