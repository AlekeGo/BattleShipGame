import pytest


@pytest.fixture
def empty_board():
    from app.engine.board import Board

    return Board()
