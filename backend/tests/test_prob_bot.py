from app.engine.bots.prob_bot import ProbBot
from app.engine.coords import BOARD_SIZE


def _full_state():
    return {
        "shots": [],
        "hits": [],
        "sunk_cells": [],
        "remaining_ships": [5, 4, 3, 3, 2],
    }


def test_prob_bot_returns_valid_coord():
    bot = ProbBot()
    r, c = bot.choose_shot(_full_state())
    assert 0 <= r < BOARD_SIZE and 0 <= c < BOARD_SIZE


def test_prob_bot_uses_parity_on_empty_board():
    bot = ProbBot()
    for _ in range(30):
        r, c = bot.choose_shot(_full_state())
        assert (r + c) % 2 == 0, f"Expected parity cell, got ({r},{c})"


def test_prob_bot_avoids_shot_cells():
    bot = ProbBot()
    shots = [[0, c] for c in range(BOARD_SIZE)]
    state = {**_full_state(), "shots": shots}
    r, c = bot.choose_shot(state)
    assert r != 0


def test_prob_bot_targets_neighbor_on_active_hit():
    bot = ProbBot()
    state = {
        "shots": [[5, 5]],
        "hits": [[5, 5]],
        "sunk_cells": [],
        "remaining_ships": [5, 4, 3, 3, 2],
    }
    r, c = bot.choose_shot(state)
    valid = {(4, 5), (6, 5), (5, 4), (5, 6)}
    assert (r, c) in valid
