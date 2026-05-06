from app.engine.bots.random_bot import RandomBot
from app.engine.coords import BOARD_SIZE


def test_random_bot_avoids_repeats():
    bot = RandomBot()
    shots = [[0, c] for c in range(BOARD_SIZE)]
    pick = bot.choose_shot({"shots": shots})
    assert pick[0] != 0
