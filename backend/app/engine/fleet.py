import random
from dataclasses import dataclass

from app.engine.coords import BOARD_SIZE

FLEET_SPEC: list[tuple[str, int]] = [
    ("Carrier", 5),
    ("Battleship", 4),
    ("Cruiser", 3),
    ("Submarine", 3),
    ("Destroyer", 2),
]


@dataclass
class Ship:
    name: str
    size: int
    row: int
    col: int
    orientation: str  # "H" or "V"
    hits: set[tuple[int, int]] = None

    def __post_init__(self):
        if self.hits is None:
            self.hits = set()

    def cells(self) -> list[tuple[int, int]]:
        if self.orientation == "H":
            return [(self.row, self.col + i) for i in range(self.size)]
        return [(self.row + i, self.col) for i in range(self.size)]

    def is_sunk(self) -> bool:
        return len(self.hits) == self.size


def validate_fleet(ships: list["Ship"]) -> None:
    """Raise ValueError if ships don't match FLEET_SPEC or have overlaps/OOB."""
    spec_map = {name: size for name, size in FLEET_SPEC}

    if len(ships) != len(FLEET_SPEC):
        raise ValueError(f"Expected {len(FLEET_SPEC)} ships, got {len(ships)}")

    submitted = {s.name: s.size for s in ships}
    for name, expected_size in FLEET_SPEC:
        if name not in submitted:
            raise ValueError(f"Missing ship: {name}")
        if submitted[name] != expected_size:
            raise ValueError(f"Ship {name} must have size {expected_size}, got {submitted[name]}")

    # Validate positions via Board (catches OOB and overlaps)
    from app.engine.board import Board
    board = Board()
    for ship in ships:
        board.place_ship(ship)


def auto_place() -> list["Ship"]:
    """Randomly generate a valid fleet placement."""
    from app.engine.board import Board
    while True:
        board = Board()
        ships = []
        failed = False
        for name, size in FLEET_SPEC:
            placed = False
            for _ in range(200):
                row = random.randint(0, BOARD_SIZE - 1)
                col = random.randint(0, BOARD_SIZE - 1)
                orientation = random.choice(["H", "V"])
                ship = Ship(name, size, row, col, orientation)
                try:
                    board.place_ship(ship)
                    ships.append(ship)
                    placed = True
                    break
                except ValueError:
                    pass
            if not placed:
                failed = True
                break
        if not failed:
            return ships
