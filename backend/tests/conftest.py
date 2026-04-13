import os
import pytest

os.environ["SECRET_KEY"] = "test-secret-key-for-testing-only-32chars"
os.environ["DATABASE_URL"] = "postgresql://postgres:root@localhost:5435/geoportal_andalucia_dev"
os.environ["CONFIG_DATABASE_URL"] = "postgresql://postgres:root@localhost:5436/geoportal_config"
os.environ["COOKIE_SECURE"] = "false"
os.environ["COOKIE_SAMESITE"] = "lax"

from app.db import init_db_pools
init_db_pools()

from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture(scope="session")
def client():
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c

@pytest.fixture(scope="session")
def admin_token(client):
    response = client.post("/api/login", json={
        "username": "pablo.lopez",
        "password": "985260640aaA@"
    })
    assert response.status_code == 200
    return response.json()["access_token"]

@pytest.fixture(scope="session")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}
