from dataclasses import dataclass

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
