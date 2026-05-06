from app.engine.bots.base import Bot
from app.engine.bots.hunt_bot import HuntBot
from app.engine.bots.prob_bot import ProbBot
from app.engine.bots.random_bot import RandomBot


def make_bot(difficulty: str) -> Bot:
    return {"easy": RandomBot(), "medium": HuntBot(), "hard": ProbBot()}[difficulty]


__all__ = ["Bot", "RandomBot", "HuntBot", "ProbBot", "make_bot"]
