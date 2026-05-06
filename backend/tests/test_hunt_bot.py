from app.engine.bots.hunt_bot import HuntBot
from app.engine.coords import BOARD_SIZE


def test_hunt_bot_shoots_in_empty_board():
    bot = HuntBot()
    state = {"shots": [], "hits": [], "sunk_cells": []}
    r, c = bot.choose_shot(state)
    assert 0 <= r < BOARD_SIZE
    assert 0 <= c < BOARD_SIZE


def test_hunt_bot_avoids_already_shot_cells():
    bot = HuntBot()
    already_shot = [[r, c] for r in range(5) for c in range(BOARD_SIZE)]
    state = {"shots": already_shot, "hits": [], "sunk_cells": []}
    r, c = bot.choose_shot(state)
    assert r >= 5


def test_hunt_bot_targets_neighbor_after_hit():
    bot = HuntBot()
    hit_cell = [3, 5]
    state = {
        "shots": [hit_cell],
        "hits": [hit_cell],
        "sunk_cells": [],
    }
    r, c = bot.choose_shot(state)
    valid = {(2, 5), (4, 5), (3, 4), (3, 6)}
    assert (r, c) in valid


def test_hunt_bot_ignores_sunk_hits():
    bot = HuntBot()
    hit_cell = [3, 5]
    state = {
        "shots": [hit_cell],
        "hits": [hit_cell],
        "sunk_cells": [hit_cell],
    }
    r, c = bot.choose_shot(state)
    assert 0 <= r < BOARD_SIZE
    assert 0 <= c < BOARD_SIZE
    assert (r, c) != tuple(hit_cell)
