from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

from app.auth import verify_token
from app.db.repositories.users import UsersRepo


async def test_verify_token_valid():
    mock_user = MagicMock()
    mock_user.id = "user-uuid-123"
    mock_response = MagicMock()
    mock_response.user = mock_user

    with patch("app.auth.get_supabase") as mock_get:
        mock_get.return_value.auth.get_user.return_value = mock_response
        user = await verify_token("valid-token")
        assert user.id == "user-uuid-123"
        mock_get.return_value.auth.get_user.assert_called_once_with("valid-token")


async def test_verify_token_invalid_raises_401():
    mock_response = MagicMock()
    mock_response.user = None

    with patch("app.auth.get_supabase") as mock_get:
        mock_get.return_value.auth.get_user.return_value = mock_response
        with pytest.raises(HTTPException) as exc_info:
            await verify_token("bad-token")
        assert exc_info.value.status_code == 401
        assert exc_info.value.detail == "Invalid token"


async def test_upsert_auth_user_returns_row():
    mock_db = MagicMock()
    mock_db.table.return_value.upsert.return_value.execute.return_value.data = [
        {"id": "auth-uuid", "auth_id": "auth-uuid", "email": "a@b.com"}
    ]
    repo = UsersRepo(mock_db)
    result = await repo.upsert_auth_user("auth-uuid", "a@b.com")
    assert result["auth_id"] == "auth-uuid"
    assert result["email"] == "a@b.com"
    mock_db.table.assert_called_with("users")
    mock_db.table.return_value.upsert.assert_called_once_with(
        {"id": "auth-uuid", "auth_id": "auth-uuid", "email": "a@b.com"},
        on_conflict="auth_id",
    )
