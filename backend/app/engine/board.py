from app.engine.coords import BOARD_SIZE, in_bounds
from app.engine.fleet import Ship


class Board:
    def __init__(self):
        self.ships: list[Ship] = []
        self.shots: set[tuple[int, int]] = set()

    def place_ship(self, ship: Ship) -> None:
        for r, c in ship.cells():
            if not in_bounds(r, c):
                raise ValueError(f"Ship out of bounds at ({r},{c})")
            for existing in self.ships:
                if (r, c) in existing.cells():
                    raise ValueError(f"Ship overlaps at ({r},{c})")
        self.ships.append(ship)

    def receive_shot(self, row: int, col: int) -> tuple[str, Ship | None]:
        self.shots.add((row, col))
        for ship in self.ships:
            if (row, col) in ship.cells():
                ship.hits.add((row, col))
                if ship.is_sunk():
                    return "sunk", ship
                return "hit", ship
        return "miss", None

    def is_lost(self) -> bool:
        return all(s.is_sunk() for s in self.ships) and len(self.ships) > 0

    def grid_size(self) -> int:
        return BOARD_SIZE
