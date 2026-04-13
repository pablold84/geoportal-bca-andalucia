from fastapi import HTTPException, Depends, Request, Cookie
from jose import JWTError, jwt
from datetime import datetime, timedelta
from passlib.context import CryptContext
from typing import Optional
from fastapi.security import OAuth2PasswordBearer
import os
import re
import psycopg2
from psycopg2.extras import RealDictCursor


SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY no está configurada. Define la variable de entorno SECRET_KEY antes de arrancar.")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/token", auto_error=False)


def get_db_connection():
    database_url = os.getenv("CONFIG_DATABASE_URL") or os.getenv("DATABASE_URL")
    if not database_url:
        raise ValueError("CONFIG_DATABASE_URL (o DATABASE_URL) no está configurada")
    try:
        return psycopg2.connect(database_url, cursor_factory=RealDictCursor)
    except Exception:
        raise HTTPException(status_code=500, detail="Error de conexión a la base de datos")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def validate_password_complexity(password: str, username: str = "") -> tuple[bool, str]:
    if len(password) < 10:
        return False, "La contraseña debe tener al menos 10 caracteres"

    if username and len(username) > 2:
        for i in range(len(username) - 2):
            fragment = username[i:i+3].lower()
            if fragment in password.lower():
                return False, "La contraseña no puede contener partes del nombre de usuario"

    categories = 0
    if any(c.isupper() for c in password):
        categories += 1
    if any(c.islower() for c in password):
        categories += 1
    if any(c.isdigit() for c in password):
        categories += 1
    if re.search(r"[^a-zA-Z0-9]", password):
        categories += 1

    if categories < 3:
        return False, "La contraseña debe incluir caracteres de al menos 3 categorías: mayúsculas, minúsculas, dígitos y caracteres especiales"

    return True, ""


def get_user_from_db(username: str) -> Optional[dict]:
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT username, password_hash, rol, is_active, requires_password_change FROM public.users WHERE username = %s",
            (username,)
        )
        result = cursor.fetchone()
        return dict(result) if result else None
    except Exception:
        return None
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


def authenticate_user(username: str, password: str) -> Optional[dict]:
    user = get_user_from_db(username)
    if not user:
        return None
    if not user.get('is_active'):
        return None
    if not verify_password(password, user['password_hash']):
        return None
    return user


def change_user_password(username: str, new_password: str) -> bool:
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        new_hash = hash_password(new_password)
        cursor.execute("""
            UPDATE public.users
            SET
                password_hash = %s,
                requires_password_change = FALSE,
                password_changed_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE username = %s
        """, (new_hash, username))
        conn.commit()
        return cursor.rowcount > 0
    except Exception:
        if conn:
            conn.rollback()
        return False
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    request: Request,
    token_header: Optional[str] = Depends(oauth2_scheme),
    access_token: Optional[str] = Cookie(default=None)
) -> dict:
    credentials_exception = HTTPException(
        status_code=401,
        detail="No se pudieron validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    token = token_header or access_token
    if not token:
        raise credentials_exception
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        return {
            "username": username,
            "role": payload.get("role"),
            "requires_password_change": payload.get("requires_password_change", False),
            "exp": payload.get("exp")
        }
    except JWTError:
        raise credentials_exception


def require_role(allowed_roles: list, user: dict):
    if user.get("role") not in allowed_roles:
        raise HTTPException(
            status_code=403,
            detail=f"Acceso denegado. Roles permitidos: {', '.join(allowed_roles)}"
        )