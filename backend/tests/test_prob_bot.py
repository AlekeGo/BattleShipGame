import pytest

from app.engine.bots.prob_bot import ProbBot


def test_prob_bot_stub():
    bot = ProbBot()
    with pytest.raises(NotImplementedError):
        bot.choose_shot({"shots": [], "hits": []})
