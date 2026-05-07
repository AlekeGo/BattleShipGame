import math
import pytest
from app.engine.features import extract_features


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_moves(coords_by: list[tuple[str, int, int, str]]) -> list[dict]:
    """coords_by: [(by, row, col, result), ...]  result in hit/miss/sunk"""
    moves = []
    for i, (by, r, c, result) in enumerate(coords_by):
        moves.append({"turn": i, "by": by, "coord": [r, c], "result": result})
    return moves


def _ship(row, col, size=2, orient="H", name="Destroyer") -> dict:
    return {"name": name, "size": size, "row": row, "col": col, "orientation": orient}


# ---------------------------------------------------------------------------
# total_shots
# ---------------------------------------------------------------------------

def test_total_shots_zero():
    feats = extract_features([], [], "pvbot_easy")
    assert feats["total_shots"] == 0


def test_total_shots_counts_only_player():
    moves = _make_moves([
        ("player", 0, 0, "miss"),
        ("bot",    1, 1, "miss"),
        ("player", 0, 2, "hit"),
    ])
    feats = extract_features(moves, [], "pvbot_easy")
    assert feats["total_shots"] == 2


# ---------------------------------------------------------------------------
# accuracy_pct
# ---------------------------------------------------------------------------

def test_accuracy_zero_shots():
    feats = extract_features([], [], "pvbot_easy")
    assert feats["accuracy_pct"] == 0.0


def test_accuracy_all_miss():
    moves = _make_moves([("player", 0, i, "miss") for i in range(5)])
    feats = extract_features(moves, [], "pvbot_easy")
    assert feats["accuracy_pct"] == 0.0


def test_accuracy_mixed():
    moves = _make_moves([
        ("player", 0, 0, "hit"),
        ("player", 0, 1, "miss"),
        ("player", 0, 2, "hit"),
        ("player", 0, 3, "miss"),
    ])
    feats = extract_features(moves, [], "pvbot_easy")
    assert feats["accuracy_pct"] == pytest.approx(50.0)


# ---------------------------------------------------------------------------
# parity_adherence
# ---------------------------------------------------------------------------

def test_parity_all_even():
    # Even parity: (r+c) % 2 == 0
    moves = _make_moves([
        ("player", 0, 0, "miss"),  # 0+0=0 even
        ("player", 0, 2, "miss"),  # 0+2=2 even
        ("player", 2, 0, "miss"),  # 2+0=2 even
    ])
    feats = extract_features(moves, [], "pvbot_easy")
    assert feats["parity_adherence"] == pytest.approx(100.0)


def test_parity_all_odd():
    moves = _make_moves([
        ("player", 0, 1, "miss"),  # odd
        ("player", 1, 0, "miss"),  # odd
    ])
    feats = extract_features(moves, [], "pvbot_easy")
    assert feats["parity_adherence"] == pytest.approx(0.0)


def test_parity_hunt_phase_only():
    # Hunt phase ends on first hit; shots after first hit are targeting phase
    moves = _make_moves([
        ("bot",    9, 9, "miss"),
        ("player", 0, 0, "miss"),   # hunt, even
        ("player", 0, 1, "miss"),   # hunt, odd
        ("player", 0, 2, "hit"),    # hunt, even — this ends hunt phase
        ("player", 0, 3, "sunk"),   # targeting phase — excluded
    ])
    feats = extract_features(moves, [], "pvbot_easy")
    # hunt shots: (0,0) even, (0,1) odd, (0,2) even → 2/3 ≈ 66.7
    assert feats["parity_adherence"] == pytest.approx(200 / 3, rel=1e-2)


# ---------------------------------------------------------------------------
# shot_entropy
# ---------------------------------------------------------------------------

def test_entropy_uniform():
    # 4 shots, one per quadrant → maximum entropy
    moves = _make_moves([
        ("player", 1, 1, "miss"),   # Q0 top-left
        ("player", 1, 6, "miss"),   # Q1 top-right
        ("player", 6, 1, "miss"),   # Q2 bottom-left
        ("player", 6, 6, "miss"),   # Q3 bottom-right
    ])
    feats = extract_features(moves, [], "pvbot_easy")
    expected = -4 * (0.25 * math.log2(0.25))  # 2.0 bits
    assert feats["shot_entropy"] == pytest.approx(expected, rel=1e-3)


def test_entropy_one_quadrant():
    moves = _make_moves([
        ("player", 0, 0, "miss"),
        ("player", 0, 1, "miss"),
        ("player", 1, 0, "miss"),
    ])
    feats = extract_features(moves, [], "pvbot_easy")
    assert feats["shot_entropy"] == pytest.approx(0.0)


# ---------------------------------------------------------------------------
# placement_corners / placement_edges
# ---------------------------------------------------------------------------

def test_placement_corners():
    # Ship at (0,0) H size 2 touches top-left corner
    ships = [_ship(0, 0, size=2, orient="H")]
    feats = extract_features([], ships, "pvbot_easy")
    assert feats["placement_corners"] == 1


def test_placement_edges_not_corner():
    # Ship at (0,3) H size 2 is on top edge, not corner
    ships = [_ship(0, 3, size=2, orient="H")]
    feats = extract_features([], ships, "pvbot_easy")
    assert feats["placement_edges"] == 1
    assert feats["placement_corners"] == 0


def test_placement_interior():
    ships = [_ship(4, 4, size=2, orient="H")]
    feats = extract_features([], ships, "pvbot_easy")
    assert feats["placement_corners"] == 0
    assert feats["placement_edges"] == 0


# ---------------------------------------------------------------------------
# avg_time_per_shot
# ---------------------------------------------------------------------------

def test_avg_time_no_timestamps():
    moves = _make_moves([("player", 0, 0, "miss")])
    feats = extract_features(moves, [], "pvbot_easy")
    assert feats["avg_time_per_shot"] is None


def test_avg_time_with_timestamps():
    moves = [
        {"turn": 0, "by": "player", "coord": [0, 0], "result": "miss", "ts": 1000},
        {"turn": 1, "by": "bot",    "coord": [1, 1], "result": "miss", "ts": 2000},
        {"turn": 2, "by": "player", "coord": [0, 2], "result": "miss", "ts": 3000},
        {"turn": 3, "by": "bot",    "coord": [2, 2], "result": "miss", "ts": 5000},
        {"turn": 4, "by": "player", "coord": [0, 4], "result": "miss", "ts": 7000},
    ]
    feats = extract_features(moves, [], "pvbot_easy")
    # Player shots at ts=1000, 3000, 7000 → gaps: 2000, 4000 → avg 3000
    assert feats["avg_time_per_shot"] == pytest.approx(3000.0)


# ---------------------------------------------------------------------------
# wasted_shots_after_sink
# ---------------------------------------------------------------------------

def test_wasted_shots_none():
    # No sunk ships → no wasted shots possible
    moves = _make_moves([("player", 0, 0, "miss"), ("player", 0, 1, "hit")])
    feats = extract_features(moves, [], "pvbot_easy")
    assert feats["wasted_shots_after_sink"] == 0


def test_wasted_shots_counted():
    # Ship at (0,0) H size 2 → cells (0,0) and (0,1)
    # After sinking it, player shots at those cells again are wasted
    moves = [
        {"turn": 0, "by": "player", "coord": [0, 0], "result": "hit", "sunk_ship": None},
        {"turn": 1, "by": "bot",    "coord": [9, 9], "result": "miss"},
        {"turn": 2, "by": "player", "coord": [0, 1], "result": "sunk", "sunk_ship": "Destroyer"},
        {"turn": 3, "by": "bot",    "coord": [9, 8], "result": "miss"},
        # Shot into sunk ship's zone after it's been sunk
        {"turn": 4, "by": "player", "coord": [0, 0], "result": "miss", "sunk_ship": None},
    ]
    ships = [_ship(0, 0, size=2, orient="H")]
    feats = extract_features(moves, ships, "pvbot_easy")
    assert feats["wasted_shots_after_sink"] == 1


# ---------------------------------------------------------------------------
# post_hit_followthrough
# ---------------------------------------------------------------------------

def test_post_hit_followthrough_adjacent():
    # Hit at (3,3), next shot at (3,4) is adjacent → 100%
    moves = _make_moves([
        ("player", 3, 3, "hit"),
        ("player", 3, 4, "sunk"),
    ])
    feats = extract_features(moves, [], "pvbot_easy")
    assert feats["post_hit_followthrough"] == pytest.approx(100.0)


def test_post_hit_followthrough_not_adjacent():
    # Hit at (3,3), next shot at (7,7) is not adjacent → 0%
    moves = _make_moves([
        ("player", 3, 3, "hit"),
        ("player", 7, 7, "miss"),
    ])
    feats = extract_features(moves, [], "pvbot_easy")
    assert feats["post_hit_followthrough"] == pytest.approx(0.0)
