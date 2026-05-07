from unittest.mock import MagicMock

from fastapi.testclient import TestClient

from app.main import app
from app.db.supabase import get_supabase

ROWS = [
    {"region": "Almaty", "display_name": "Top Gun", "wins": 10, "total_games": 15, "accuracy_pct": 72.5},
    {"region": "Astana", "display_name": "Sniper", "wins": 8, "total_games": 12, "accuracy_pct": 68.0},
]


def _mock_db_no_filter(rows):
    mock_db = MagicMock()
    (
        mock_db.table.return_value
        .select.return_value
        .order.return_value
        .execute.return_value
        .data
    ) = rows
    return mock_db


def _mock_db_with_filter(rows):
    mock_db = MagicMock()
    (
        mock_db.table.return_value
        .select.return_value
        .eq.return_value
        .order.return_value
        .execute.return_value
        .data
    ) = rows
    return mock_db


def test_leaderboard_returns_all_rows():
    app.dependency_overrides[get_supabase] = lambda: _mock_db_no_filter(ROWS)
    try:
        res = TestClient(app).get("/api/leaderboard")
    finally:
        app.dependency_overrides.clear()

    assert res.status_code == 200
    data = res.json()
    assert len(data) == 2
    assert data[0]["region"] == "Almaty"
    assert data[1]["region"] == "Astana"


def test_leaderboard_region_filter():
    app.dependency_overrides[get_supabase] = lambda: _mock_db_with_filter([ROWS[0]])
    try:
        res = TestClient(app).get("/api/leaderboard?region=Almaty")
    finally:
        app.dependency_overrides.clear()

    assert res.status_code == 200
    data = res.json()
    assert len(data) == 1
    assert data[0]["region"] == "Almaty"


def test_leaderboard_empty():
    app.dependency_overrides[get_supabase] = lambda: _mock_db_no_filter([])
    try:
        res = TestClient(app).get("/api/leaderboard")
    finally:
        app.dependency_overrides.clear()

    assert res.status_code == 200
    assert res.json() == []
