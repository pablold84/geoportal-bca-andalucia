import pytest
from fastapi.testclient import TestClient
from app.main import app


class TestAuth:

    def test_login_correcto(self, client, admin_token):
        assert admin_token is not None

    def test_login_credenciales_incorrectas(self, client):
        response = client.post("/api/login", json={
            "username": "pablo.lopez",
            "password": "wrongpassword"
        })
        assert response.status_code == 401

    def test_login_usuario_inexistente(self, client):
        response = client.post("/api/login", json={
            "username": "noexiste",
            "password": "cualquiera"
        })
        assert response.status_code == 401

    def test_me_sin_token(self, client):
        fresh = TestClient(app, raise_server_exceptions=False)
        response = fresh.get("/api/me")
        assert response.status_code == 401

    def test_me_con_token(self, client, auth_headers):
        response = client.get("/api/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "pablo.lopez"
        assert data["role"] == "admin"
        assert "exp" in data


class TestDashboardBCA:

    def test_resumen_sin_autenticar(self, client):
        fresh = TestClient(app, raise_server_exceptions=False)
        response = fresh.get("/api/bca/dashboard/resumen")
        assert response.status_code == 401

    def test_resumen_con_token(self, client, auth_headers):
        response = client.get("/api/bca/dashboard/resumen", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "objetos_unicos_total" in data
        assert "hojas_con_actividad" in data
        assert "fenomenos_afectados" in data
        assert data["objetos_unicos_total"] >= 0

    def test_por_tecnico_rol_admin(self, client, auth_headers):
        response = client.get("/api/bca/dashboard/por-tecnico", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "tecnicos" in data

    def test_filtros(self, client, auth_headers):
        response = client.get("/api/bca/dashboard/filtros", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "hojas" in data
        assert "fenomenos" in data

    def test_evolucion_agrupacion_invalida(self, client, auth_headers):
        response = client.get(
            "/api/bca/dashboard/evolucion?agrupacion=dia",
            headers=auth_headers
        )
        assert response.status_code == 400

    def test_evolucion_semanal(self, client, auth_headers):
        response = client.get(
            "/api/bca/dashboard/evolucion?agrupacion=semana",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "evolucion" in data
        assert data["agrupacion"] == "semana"


class TestDashboardProgreso:

    def test_resumen_hojas(self, client, auth_headers):
        response = client.get("/api/dashboard/bca/resumen", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_hojas" in data
        assert data["total_hojas"] == 2750

    def test_geojson_hojas(self, client, auth_headers):
        response = client.get("/api/dashboard/bca/hojas/geojson", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["type"] == "FeatureCollection"
        assert "features" in data


class TestDashboardAdmin:

    def test_resumen_admin_con_rol_admin(self, client, auth_headers):
        response = client.get("/api/dashboard/admin/resumen", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_usuarios" in data


class TestProjects:

    def test_listar_proyectos(self, client, auth_headers):
        response = client.get("/api/projects", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0

    def test_proyecto_bca_existe(self, client, auth_headers):
        response = client.get("/api/projects/bca", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["project_code"] == "bca"
