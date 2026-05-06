import pytest

from app.engine.board import Board
from app.engine.fleet import Ship


def test_place_ship_basic():
    b = Board()
    b.place_ship(Ship("Destroyer", 2, 0, 0, "H"))
    assert len(b.ships) == 1


def test_place_ship_overlap_rejected():
    b = Board()
    b.place_ship(Ship("Destroyer", 2, 0, 0, "H"))
    with pytest.raises(ValueError):
        b.place_ship(Ship("Submarine", 3, 0, 1, "H"))


def test_receive_shot_hit_and_sunk():
    b = Board()
    b.place_ship(Ship("Destroyer", 2, 0, 0, "H"))
    assert b.receive_shot(0, 0)[0] == "hit"
    assert b.receive_shot(0, 1)[0] == "sunk"
    assert b.is_lost()
