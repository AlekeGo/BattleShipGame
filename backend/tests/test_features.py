import pytest

from app.engine.features import extract_features


def test_extract_features_stub():
    with pytest.raises(NotImplementedError):
        extract_features([], [], "easy")
