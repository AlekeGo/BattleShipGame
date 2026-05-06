import random

from app.engine.bots.base import Bot
from app.engine.coords import BOARD_SIZE


class RandomBot(Bot):
    def choose_shot(self, state: dict) -> tuple[int, int]:
        shots = set(map(tuple, state.get("shots", [])))
        candidates = [
            (r, c)
            for r in range(BOARD_SIZE)
            for c in range(BOARD_SIZE)
            if (r, c) not in shots
        ]
        return random.choice(candidates)
