"""Behavioral feature extraction from a finished game's move log."""


def extract_features(moves: list[dict], player_ships: list[dict], bot_difficulty: str) -> dict:
    """
    Returns a dict with keys:
      total_shots, accuracy_pct, parity_adherence, post_hit_followthrough,
      shot_entropy, wasted_shots_after_sink, placement_corners, placement_edges,
      avg_time_per_shot, bot_difficulty, outcome
    """
    raise NotImplementedError
