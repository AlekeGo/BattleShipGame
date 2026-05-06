BOARD_SIZE = 10

Coord = tuple[int, int]


def in_bounds(row: int, col: int) -> bool:
    return 0 <= row < BOARD_SIZE and 0 <= col < BOARD_SIZE


def is_parity(row: int, col: int) -> bool:
    return (row + col) % 2 == 0


def neighbors(row: int, col: int) -> list[Coord]:
    return [
        (r, c)
        for r, c in [(row - 1, col), (row + 1, col), (row, col - 1), (row, col + 1)]
        if in_bounds(r, c)
    ]
