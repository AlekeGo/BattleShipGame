from app.engine.fleet import FLEET_SPEC, Ship


def test_fleet_spec_has_5_ships():
    assert len(FLEET_SPEC) == 5
    assert sum(size for _, size in FLEET_SPEC) == 17


def test_ship_horizontal_cells():
    s = Ship("Destroyer", 2, 3, 4, "H")
    assert s.cells() == [(3, 4), (3, 5)]


def test_ship_vertical_cells():
    s = Ship("Destroyer", 2, 3, 4, "V")
    assert s.cells() == [(3, 4), (4, 4)]
