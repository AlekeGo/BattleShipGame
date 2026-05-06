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
