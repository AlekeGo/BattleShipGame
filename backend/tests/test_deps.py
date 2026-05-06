from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

from app.deps import get_auth_user


async def test_get_auth_user_no_header_returns_none():
    result = await get_auth_user(authorization=None, db=MagicMock())
    assert result is None


async def test_get_auth_user_bad_format_raises_401():
    with pytest.raises(HTTPException) as exc_info:
        await get_auth_user(authorization="Token abc", db=MagicMock())
    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Invalid authorization header"


async def test_get_auth_user_valid_token_upserts_and_returns_user():
    mock_user = MagicMock()
    mock_user.id = "auth-uuid"
    mock_user.email = "a@b.com"

    mock_db = MagicMock()
    mock_db.table.return_value.upsert.return_value.execute.return_value.data = [
        {"id": "auth-uuid", "auth_id": "auth-uuid", "email": "a@b.com"}
    ]

    with patch("app.deps.verify_token", new_callable=AsyncMock) as mock_verify:
        mock_verify.return_value = mock_user
        result = await get_auth_user(authorization="Bearer valid-token", db=mock_db)

    mock_verify.assert_called_once_with("valid-token")
    assert result == mock_user
    mock_db.table.assert_called_with("users")
