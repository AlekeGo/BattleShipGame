import pytest

from app.engine.bots.hunt_bot import HuntBot


def test_hunt_bot_stub():
    bot = HuntBot()
    with pytest.raises(NotImplementedError):
        bot.choose_shot({"shots": [], "hits": []})
