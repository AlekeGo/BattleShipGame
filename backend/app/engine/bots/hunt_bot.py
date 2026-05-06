from app.engine.bots.base import Bot


class HuntBot(Bot):
    """Random until a hit, then probe orthogonal neighbors until ship is sunk."""

    def choose_shot(self, state: dict) -> tuple[int, int]:
        raise NotImplementedError
