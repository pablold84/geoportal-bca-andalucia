from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Depends, APIRouter, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from app.routes import admin, projects, layers, dashboard, dashboard_admin
from app.routes.bca import router as bca_router
from app.db import init_db_pools, close_db_pools
from app.security import get_current_user, authenticate_user, create_access_token, change_user_password, validate_password_complexity, ACCESS_TOKEN_EXPIRE_MINUTES
from app.api_key_middleware import APIKeyMiddleware
from app.logger import setup_logging, get_logger, log_auth, log_error
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import os
from datetime import timedelta
from pydantic import BaseModel
from fastapi.security import OAuth2PasswordRequestForm

setup_logging()
logger = get_logger("main")

CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000")
origins = [o.strip() for o in CORS_ORIGINS.split(",")]
limiter = Limiter(key_func=get_remote_address)

COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"
COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "lax")
COOKIE_MAX_AGE = ACCESS_TOKEN_EXPIRE_MINUTES * 60


def _set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=COOKIE_MAX_AGE,
        path="/"
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db_pools()
    logger.info("Pools de conexiones a BD inicializados")
    yield
    close_db_pools()
    logger.info("Pools de conexiones a BD cerrados")


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        return response


class StaticFilesCORSMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        if request.url.path.startswith('/api/uploads/'):
            response.headers["Access-Control-Allow-Origin"] = origins[0]
            response.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type"
            response.headers["Cross-Origin-Resource-Policy"] = "cross-origin"
        return response


app = FastAPI(
    title="Geoportal GIS API",
    description="API del Sistema Geoportal GIS — Seresco Geoinformación",
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    openapi_tags=[
        {"name": "Auth",             "description": "Autenticación y gestión de sesiones (JWT)"},
        {"name": "Admin - API Keys", "description": "Administración de API keys (solo admins)"},
        {"name": "BCA Dashboard",    "description": "Indicadores de consumo interno BCA Andalucía (requiere JWT)"},
        {"name": "Dashboard",        "description": "Progreso de hojas cartográficas BCA (requiere JWT)"},
        {"name": "Dashboard Admin",  "description": "Productividad del equipo (solo admin)"},
        {"name": "Layers",           "description": "Capas cartográficas del proyecto (requiere JWT)"},
        {"name": "Projects",         "description": "Proyectos disponibles (requiere JWT)"},
        {"name": "Styles",           "description": "Estilos de capas (requiere JWT)"},
    ]
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(APIKeyMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(StaticFilesCORSMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
    expose_headers=["Content-Disposition", "X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"]
)


class LoginRequest(BaseModel):
    username: str
    password: str

    class Config:
        json_schema_extra = {
            "example": {
                "username": "admin",
                "password": "Temporal123!"
            }
        }

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    username: str
    role: str
    requires_password_change: bool

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str


login_router = APIRouter(tags=["Auth"])


@login_router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
def login(request: Request, response: Response, data: LoginRequest):
    ip = request.client.host if request.client else "unknown"
    user = authenticate_user(data.username, data.password)
    if not user:
        log_auth(logger, "login", data.username, ip, success=False)
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")

    access_token = create_access_token(
        data={
            "sub": data.username,
            "role": user["rol"],
            "requires_password_change": user.get("requires_password_change", False)
        },
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    _set_auth_cookie(response, access_token)
    log_auth(logger, "login", data.username, ip, success=True)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "username": user["username"],
        "role": user["rol"],
        "requires_password_change": user.get("requires_password_change", False)
    }


@login_router.post("/logout")
def logout(request: Request, response: Response, current_user: dict = Depends(get_current_user)):
    ip = request.client.host if request.client else "unknown"
    log_auth(logger, "logout", current_user["username"], ip, success=True)
    response.delete_cookie(key="access_token", path="/")
    return {"message": "Sesión cerrada correctamente"}


@login_router.post("/change-password")
def change_password(
    request: Request,
    response: Response,
    password_data: PasswordChangeRequest,
    current_user: dict = Depends(get_current_user)
):
    ip = request.client.host if request.client else "unknown"
    user = authenticate_user(current_user["username"], password_data.current_password)
    if not user:
        log_auth(logger, "change_password", current_user["username"], ip, success=False)
        raise HTTPException(status_code=400, detail="La contraseña actual es incorrecta")

    if password_data.new_password == password_data.current_password:
        raise HTTPException(status_code=400, detail="La nueva contraseña debe ser diferente a la actual")

    valid, message = validate_password_complexity(password_data.new_password, current_user["username"])
    if not valid:
        raise HTTPException(status_code=400, detail=message)

    success = change_user_password(current_user["username"], password_data.new_password)
    if not success:
        log_error(logger, "Error al cambiar contraseña", username=current_user["username"])
        raise HTTPException(status_code=500, detail="Error al cambiar la contraseña")

    log_auth(logger, "change_password", current_user["username"], ip, success=True)

    new_token = create_access_token(
        data={
            "sub": current_user["username"],
            "role": user["rol"],
            "requires_password_change": False
        },
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    _set_auth_cookie(response, new_token)

    return {
        "message": "Contraseña actualizada exitosamente",
        "access_token": new_token,
        "token_type": "bearer"
    }


@login_router.get("/me")
def get_user_info(current_user: dict = Depends(get_current_user)):
    return {
        "username": current_user["username"],
        "role": current_user["role"],
        "requires_password_change": current_user.get("requires_password_change", False),
        "exp": current_user.get("exp")
    }


@login_router.post("/token")
def token(request: Request, form_data: OAuth2PasswordRequestForm = Depends()):
    ip = request.client.host if request.client else "unknown"
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        log_auth(logger, "token", form_data.username, ip, success=False)
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")

    access_token = create_access_token(
        data={
            "sub": form_data.username,
            "role": user["rol"],
            "requires_password_change": user.get("requires_password_change", False)
        },
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    log_auth(logger, "token", form_data.username, ip, success=True)
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


app.include_router(login_router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(projects.router, dependencies=[Depends(get_current_user)])
app.include_router(layers.router, prefix="/api", dependencies=[Depends(get_current_user)])
app.include_router(dashboard.router, prefix="/api/dashboard", dependencies=[Depends(get_current_user)])
app.include_router(dashboard_admin.router, prefix="/api/dashboard", dependencies=[Depends(get_current_user)])
app.include_router(bca_router, prefix="/api/bca/dashboard", dependencies=[Depends(get_current_user)])


@app.get("/", tags=["Info"])
def root():
    return {
        "name": "Geoportal GIS API",
        "version": "2.0.0",
        "docs": "/api/docs",
        "health": "/api/public/health"
    }