import pytest
from app.engine.fleet import FLEET_SPEC, Ship, validate_fleet, auto_place
from app.engine.coords import BOARD_SIZE


def _valid_ships():
    """One ship per column (col*2), vertical, no overlaps."""
    ships = []
    for col, (name, size) in enumerate(FLEET_SPEC):
        ships.append(Ship(name, size, 0, col * 2, "V"))
    return ships


def test_validate_fleet_accepts_valid():
    validate_fleet(_valid_ships())


def test_validate_fleet_rejects_wrong_count():
    ships = _valid_ships()[:-1]
    with pytest.raises(ValueError, match="5 ships"):
        validate_fleet(ships)


def test_validate_fleet_rejects_duplicate_name():
    ships = _valid_ships()
    ships[0] = Ship("Destroyer", 2, 0, 0, "V")
    with pytest.raises(ValueError):
        validate_fleet(ships)


def test_validate_fleet_rejects_wrong_size():
    ships = _valid_ships()
    ships[0] = Ship("Carrier", 3, 0, 0, "V")
    with pytest.raises(ValueError, match="size"):
        validate_fleet(ships)


def test_validate_fleet_rejects_out_of_bounds():
    ships = _valid_ships()
    ships[0] = Ship("Carrier", 5, 0, 8, "H")  # col 8+5=13 out of bounds
    with pytest.raises(ValueError):
        validate_fleet(ships)


def test_validate_fleet_rejects_overlap():
    ships = _valid_ships()
    ships[0] = Ship("Carrier", 5, 0, 0, "V")
    ships[1] = Ship("Battleship", 4, 0, 0, "V")  # overlaps carrier
    with pytest.raises(ValueError):
        validate_fleet(ships)


def test_auto_place_returns_valid_fleet():
    ships = auto_place()
    assert len(ships) == len(FLEET_SPEC)
    validate_fleet(ships)


def test_auto_place_all_in_bounds():
    for _ in range(20):
        ships = auto_place()
        for ship in ships:
            for r, c in ship.cells():
                assert 0 <= r < BOARD_SIZE
                assert 0 <= c < BOARD_SIZE
