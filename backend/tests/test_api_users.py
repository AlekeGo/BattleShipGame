from unittest.mock import AsyncMock, MagicMock

from fastapi.testclient import TestClient

from app.main import app
from app.db.supabase import get_supabase
from app.deps import get_users_repo


def test_create_anon_user_returns_user_id():
    mock_repo = MagicMock()
    mock_repo.create_anon = AsyncMock(return_value={"id": "anon-uuid-123"})

    app.dependency_overrides[get_users_repo] = lambda: mock_repo
    app.dependency_overrides[get_supabase] = lambda: MagicMock()

    try:
        client = TestClient(app)
        response = client.post("/api/users/anon")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == {"user_id": "anon-uuid-123"}


def test_get_user_returns_user():
    mock_repo = MagicMock()
    mock_repo.get = AsyncMock(return_value={
        "id": "user-123", "display_name": "Cap", "region": "Almaty, KZ", "email": None
    })

    app.dependency_overrides[get_users_repo] = lambda: mock_repo
    app.dependency_overrides[get_supabase] = lambda: MagicMock()

    try:
        client = TestClient(app)
        res = client.get("/api/users/user-123")
    finally:
        app.dependency_overrides.clear()

    assert res.status_code == 200
    assert res.json()["display_name"] == "Cap"
    assert res.json()["region"] == "Almaty, KZ"


def test_get_user_404_when_not_found():
    mock_repo = MagicMock()
    mock_repo.get = AsyncMock(return_value=None)

    app.dependency_overrides[get_users_repo] = lambda: mock_repo
    app.dependency_overrides[get_supabase] = lambda: MagicMock()

    try:
        client = TestClient(app)
        res = client.get("/api/users/missing-user")
    finally:
        app.dependency_overrides.clear()

    assert res.status_code == 404
