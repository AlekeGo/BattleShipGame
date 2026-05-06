import random

from app.engine.bots.base import Bot
from app.engine.coords import BOARD_SIZE, neighbors


class HuntBot(Bot):
    """Random until a hit, then probe orthogonal neighbors until ship sunk."""

    def choose_shot(self, state: dict) -> tuple[int, int]:
        shots = set(map(tuple, state.get("shots", [])))
        hits = {tuple(h) for h in state.get("hits", [])}
        sunk_cells = {tuple(c) for c in state.get("sunk_cells", [])}
        active_hits = hits - sunk_cells

        if active_hits:
            candidates = [
                (nr, nc)
                for hr, hc in active_hits
                for nr, nc in neighbors(hr, hc)
                if (nr, nc) not in shots
            ]
            if candidates:
                return random.choice(candidates)

        unshot = [
            (r, c)
            for r in range(BOARD_SIZE)
            for c in range(BOARD_SIZE)
            if (r, c) not in shots
        ]
        return random.choice(unshot)
