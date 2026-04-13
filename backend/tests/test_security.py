import pytest
from app.security import validate_password_complexity, create_access_token
from jose import jwt
class TestValidatePasswordComplexity:

    def test_password_too_short(self):
        ok, msg = validate_password_complexity("Ab1!")
        assert ok is False
        assert "10 caracteres" in msg

    def test_password_contains_username(self):
        ok, msg = validate_password_complexity("pablo123ABC!", "pablo.lopez")
        assert ok is False
        assert "usuario" in msg

    def test_password_only_lowercase(self):
        ok, msg = validate_password_complexity("abcdefghij")
        assert ok is False
        assert "categorías" in msg

    def test_password_two_categories_insufficient(self):
        ok, msg = validate_password_complexity("abcdefgh12")
        assert ok is False
        assert "categorías" in msg

    def test_password_three_categories_valid(self):
        ok, msg = validate_password_complexity("Abcdefgh12")
        assert ok is True
        assert msg == ""

    def test_password_all_categories_valid(self):
        ok, msg = validate_password_complexity("985260640aaA@")
        assert ok is True
        assert msg == ""

    def test_password_special_chars_valid(self):
        ok, msg = validate_password_complexity("abcdefgh12@")
        assert ok is True
        assert msg == ""

    def test_empty_username_no_fragment_check(self):
        ok, msg = validate_password_complexity("Abcdefgh12", "")
        assert ok is True

    def test_short_username_no_fragment_check(self):
        ok, msg = validate_password_complexity("Abcdefgh12", "ab")
        assert ok is True


class TestCreateAccessToken:

    def test_token_contains_subject(self):
        from app.security import SECRET_KEY, ALGORITHM
        token = create_access_token({"sub": "pablo.lopez", "role": "admin"})
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        assert payload["sub"] == "pablo.lopez"
        assert payload["role"] == "admin"

    def test_token_contains_expiry(self):
        from app.security import SECRET_KEY, ALGORITHM
        token = create_access_token({"sub": "test.user"})
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        assert "exp" in payload

    def test_token_custom_expiry(self):
        from datetime import timedelta
        from app.security import SECRET_KEY, ALGORITHM
        token = create_access_token({"sub": "test.user"}, expires_delta=timedelta(minutes=30))
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        assert payload["sub"] == "test.user"
