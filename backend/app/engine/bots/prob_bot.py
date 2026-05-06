from app.engine.bots.base import Bot
from app.engine.coords import BOARD_SIZE, in_bounds, is_parity, neighbors


class ProbBot(Bot):
    """Probability density + parity targeting (DataGenetics algorithm)."""

    def choose_shot(self, state: dict) -> tuple[int, int]:
        shots = set(map(tuple, state.get("shots", [])))
        hits = {tuple(h) for h in state.get("hits", [])}
        sunk_cells = {tuple(c) for c in state.get("sunk_cells", [])}
        remaining = state.get("remaining_ships", [5, 4, 3, 3, 2])
        active_hits = hits - sunk_cells

        if active_hits:
            candidates = [
                (nr, nc)
                for hr, hc in active_hits
                for nr, nc in neighbors(hr, hc)
                if (nr, nc) not in shots
            ]
            if candidates:
                return max(
                    candidates,
                    key=lambda cell: sum(
                        1 for ah in active_hits
                        if abs(cell[0] - ah[0]) + abs(cell[1] - ah[1]) == 1
                    ),
                )

        misses = shots - hits
        prob = [[0] * BOARD_SIZE for _ in range(BOARD_SIZE)]
        for size in remaining:
            for r in range(BOARD_SIZE):
                for c in range(BOARD_SIZE):
                    for cells in (
                        [(r, c + i) for i in range(size)],
                        [(r + i, c) for i in range(size)],
                    ):
                        if all(
                            in_bounds(rr, cc)
                            and (rr, cc) not in misses
                            and (rr, cc) not in sunk_cells
                            for rr, cc in cells
                        ):
                            for rr, cc in cells:
                                if (rr, cc) not in shots:
                                    prob[rr][cc] += 1

        parity_pool = [
            (r, c)
            for r in range(BOARD_SIZE)
            for c in range(BOARD_SIZE)
            if (r, c) not in shots and is_parity(r, c) and prob[r][c] > 0
        ]
        all_pool = [
            (r, c)
            for r in range(BOARD_SIZE)
            for c in range(BOARD_SIZE)
            if (r, c) not in shots and prob[r][c] > 0
        ]
        pool = parity_pool if parity_pool else all_pool
        if not pool:
            pool = [(r, c) for r in range(BOARD_SIZE) for c in range(BOARD_SIZE) if (r, c) not in shots]
        return max(pool, key=lambda cell: prob[cell[0]][cell[1]])
