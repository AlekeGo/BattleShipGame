"""Behavioral feature extraction from a finished game's move log."""
import math

BOARD_SIZE = 10


def _is_adjacent(r1: int, c1: int, r2: int, c2: int) -> bool:
    return abs(r1 - r2) + abs(c1 - c2) == 1


def _ship_cells(ship: dict) -> list[tuple[int, int]]:
    cells = []
    r, c, size = ship["row"], ship["col"], ship["size"]
    for i in range(size):
        cells.append((r, c + i) if ship["orientation"] == "H" else (r + i, c))
    return cells


def _touches_corner(cells: list[tuple[int, int]]) -> bool:
    corners = {(0, 0), (0, BOARD_SIZE - 1), (BOARD_SIZE - 1, 0), (BOARD_SIZE - 1, BOARD_SIZE - 1)}
    return bool(set(cells) & corners)


def _touches_edge(cells: list[tuple[int, int]]) -> bool:
    return any(r == 0 or r == BOARD_SIZE - 1 or c == 0 or c == BOARD_SIZE - 1 for r, c in cells)


def extract_features(moves: list[dict], player_ships: list[dict], bot_difficulty: str) -> dict:
    """
    Returns a dict with keys:
      total_shots, accuracy_pct, parity_adherence, post_hit_followthrough,
      shot_entropy, wasted_shots_after_sink, placement_corners, placement_edges,
      avg_time_per_shot, bot_difficulty, outcome
    """
    player_moves = [m for m in moves if m["by"] == "player"]
    total_shots = len(player_moves)

    # accuracy_pct
    hits = [m for m in player_moves if m["result"] in ("hit", "sunk")]
    accuracy_pct = round(100.0 * len(hits) / total_shots, 2) if total_shots else 0.0

    # parity_adherence — hunt phase only (before and including first hit)
    hunt_shots: list[dict] = []
    for m in player_moves:
        hunt_shots.append(m)
        if m["result"] in ("hit", "sunk"):
            break
    parity_count = sum(1 for m in hunt_shots if (m["coord"][0] + m["coord"][1]) % 2 == 0)
    parity_adherence = round(100.0 * parity_count / len(hunt_shots), 2) if hunt_shots else 0.0

    # shot_entropy — Shannon entropy across 4 quadrants
    half = BOARD_SIZE // 2
    quadrants = [0, 0, 0, 0]
    for m in player_moves:
        r, c = m["coord"]
        q = (0 if r < half else 2) + (0 if c < half else 1)
        quadrants[q] += 1
    shot_entropy = 0.0
    if total_shots > 0:
        for count in quadrants:
            if count > 0:
                p = count / total_shots
                shot_entropy -= p * math.log2(p)
    shot_entropy = round(shot_entropy, 4)

    # post_hit_followthrough — after a hit, % of next ≤4 player shots adjacent to that hit
    follow_window = 4
    followthrough_checks: list[bool] = []
    for i, m in enumerate(player_moves):
        if m["result"] == "hit":
            hr, hc = m["coord"]
            subsequent = player_moves[i + 1 : i + 1 + follow_window]
            for s in subsequent:
                followthrough_checks.append(_is_adjacent(hr, hc, s["coord"][0], s["coord"][1]))
    post_hit_followthrough = (
        round(100.0 * sum(followthrough_checks) / len(followthrough_checks), 2)
        if followthrough_checks
        else 0.0
    )

    # wasted_shots_after_sink — shots into cells of already-sunk ships
    ship_cell_map: dict[str, list[tuple[int, int]]] = {
        s["name"]: _ship_cells(s) for s in player_ships
    }
    sunk_cells: set[tuple[int, int]] = set()
    sunk_ship_names: set[str] = set()
    wasted = 0
    for m in player_moves:
        r, c = m["coord"]
        if (r, c) in sunk_cells:
            wasted += 1
        if m["result"] == "sunk" and m.get("sunk_ship"):
            name = m["sunk_ship"]
            if name in ship_cell_map and name not in sunk_ship_names:
                sunk_ship_names.add(name)
                sunk_cells.update(ship_cell_map[name])

    # placement metrics
    placement_corners = 0
    placement_edges = 0
    for ship in player_ships:
        cells = _ship_cells(ship)
        if _touches_corner(cells):
            placement_corners += 1
        elif _touches_edge(cells):
            placement_edges += 1

    # avg_time_per_shot
    player_ts = [m["ts"] for m in player_moves if "ts" in m]
    if len(player_ts) >= 2:
        gaps = [player_ts[i + 1] - player_ts[i] for i in range(len(player_ts) - 1)]
        avg_time_per_shot: float | None = round(sum(gaps) / len(gaps), 1)
    else:
        avg_time_per_shot = None

    return {
        "total_shots": total_shots,
        "accuracy_pct": accuracy_pct,
        "parity_adherence": parity_adherence,
        "post_hit_followthrough": post_hit_followthrough,
        "shot_entropy": shot_entropy,
        "wasted_shots_after_sink": wasted,
        "placement_corners": placement_corners,
        "placement_edges": placement_edges,
        "avg_time_per_shot": avg_time_per_shot,
    }
