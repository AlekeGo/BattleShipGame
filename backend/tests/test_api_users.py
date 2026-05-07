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


def test_update_profile_saves_name_and_region():
    mock_repo = MagicMock()
    mock_repo.update_profile = AsyncMock(return_value={
        "id": "user-123", "display_name": "New Name", "region": "Astana, KZ", "email": None
    })

    app.dependency_overrides[get_users_repo] = lambda: mock_repo
    app.dependency_overrides[get_supabase] = lambda: MagicMock()

    try:
        client = TestClient(app)
        res = client.patch(
            "/api/users/user-123/profile",
            json={"display_name": "New Name", "region": "Astana, KZ"},
        )
    finally:
        app.dependency_overrides.clear()

    assert res.status_code == 200
    assert res.json()["display_name"] == "New Name"
    assert res.json()["region"] == "Astana, KZ"
    mock_repo.update_profile.assert_called_once_with("user-123", "New Name", "Astana, KZ")


def test_update_profile_partial_update():
    mock_repo = MagicMock()
    mock_repo.update_profile = AsyncMock(return_value={
        "id": "user-123", "display_name": None, "region": "Almaty, KZ", "email": None
    })

    app.dependency_overrides[get_users_repo] = lambda: mock_repo
    app.dependency_overrides[get_supabase] = lambda: MagicMock()

    try:
        client = TestClient(app)
        res = client.patch("/api/users/user-123/profile", json={"region": "Almaty, KZ"})
    finally:
        app.dependency_overrides.clear()

    assert res.status_code == 200
    mock_repo.update_profile.assert_called_once_with("user-123", None, "Almaty, KZ")
