from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

from app.db import get_connection
from app.security import get_current_user, require_role
from app.api_key_utils import create_api_key, revoke_api_key, RATE_LIMIT_TIERS
from app.logger import get_logger, log_operation, log_error

router = APIRouter()
logger = get_logger("admin")


class CreateAPIKeyRequest(BaseModel):
    client_name: str
    client_email: EmailStr
    description: str
    rate_limit_tier: str = "basic"
    expires_in_days: Optional[int] = None

    class Config:
        json_schema_extra = {
            "example": {
                "client_name": "Empresa ABC S.L.",
                "client_email": "contacto@empresaabc.com",
                "description": "API key para integración con sistema de monitoreo",
                "rate_limit_tier": "basic",
                "expires_in_days": 365
            }
        }


class APIKeyResponse(BaseModel):
    id: int
    api_key: Optional[str] = None
    key_prefix: str
    client_name: str
    client_email: Optional[str]
    description: Optional[str]
    rate_limit_tier: str
    requests_per_hour: int
    is_active: bool
    created_at: datetime
    created_by: Optional[str]
    last_used_at: Optional[datetime]
    expires_at: Optional[datetime]
    revoked_at: Optional[datetime]
    revoked_by: Optional[str]


class APIKeyListItem(BaseModel):
    id: int
    key_prefix: str
    client_name: str
    rate_limit_tier: str
    requests_per_hour: int
    is_active: bool
    created_at: datetime
    last_used_at: Optional[datetime]
    expires_at: Optional[datetime]


class UsageStatsResponse(BaseModel):
    total_requests: int
    successful_requests: int
    failed_requests: int
    avg_response_time_ms: int
    requests_last_hour: int
    requests_today: int
    top_endpoints: List[dict]


@router.post("/admin/api-keys", response_model=APIKeyResponse, tags=["Admin - API Keys"])
def create_new_api_key(
    request: Request,
    body: CreateAPIKeyRequest,
    current_user: dict = Depends(get_current_user)
):
    require_role(['admin'], current_user)

    if body.rate_limit_tier not in RATE_LIMIT_TIERS:
        raise HTTPException(
            status_code=400,
            detail=f"Tier inválido. Opciones válidas: {list(RATE_LIMIT_TIERS.keys())}"
        )

    with get_connection() as conn:
        try:
            key_data = create_api_key(
                client_name=body.client_name,
                client_email=body.client_email,
                description=body.description,
                rate_limit_tier=body.rate_limit_tier,
                created_by=current_user['username'],
                expires_in_days=body.expires_in_days,
                db_conn=conn
            )

            if not key_data:
                raise HTTPException(status_code=500, detail="Error al crear la API key")

            log_operation(
                logger,
                action="create_api_key",
                resource=f"api_key:{key_data['key_prefix']}",
                username=current_user['username'],
                detail=f"cliente={body.client_name} tier={body.rate_limit_tier}"
            )

            return APIKeyResponse(
                id=key_data['id'],
                api_key=key_data['api_key'],
                key_prefix=key_data['key_prefix'],
                client_name=key_data['client_name'],
                client_email=body.client_email,
                description=body.description,
                rate_limit_tier=key_data['rate_limit_tier'],
                requests_per_hour=key_data['requests_per_hour'],
                is_active=True,
                created_at=key_data['created_at'],
                created_by=current_user['username'],
                last_used_at=None,
                expires_at=key_data.get('expires_at'),
                revoked_at=None,
                revoked_by=None
            )
        except HTTPException:
            raise
        except Exception as e:
            log_error(logger, "Error al crear API key", exc=e, username=current_user['username'])
            raise HTTPException(status_code=500, detail="Error al crear la API key")


@router.get("/admin/api-keys", response_model=List[APIKeyListItem], tags=["Admin - API Keys"])
def list_api_keys(
    include_revoked: bool = False,
    current_user: dict = Depends(get_current_user)
):
    require_role(['admin'], current_user)

    with get_connection() as conn:
        cursor = conn.cursor()
        try:
            query = """
                SELECT id, key_prefix, client_name, rate_limit_tier,
                       requests_per_hour, is_active, created_at, last_used_at, expires_at
                FROM public.api_keys
            """
            if not include_revoked:
                query += " WHERE is_active = TRUE"
            query += " ORDER BY created_at DESC"

            cursor.execute(query)
            rows = cursor.fetchall()
            colnames = [desc[0] for desc in cursor.description]
            cursor.close()
            return [APIKeyListItem(**dict(zip(colnames, row))) for row in rows]
        except HTTPException:
            raise
        except Exception as e:
            log_error(logger, "Error al listar API keys", exc=e, username=current_user['username'])
            raise HTTPException(status_code=500, detail="Error al listar las API keys")


@router.get("/admin/api-keys/{api_key_id}", response_model=APIKeyResponse, tags=["Admin - API Keys"])
def get_api_key_details(
    api_key_id: int,
    current_user: dict = Depends(get_current_user)
):
    require_role(['admin'], current_user)

    with get_connection() as conn:
        cursor = conn.cursor()
        try:
            cursor.execute("""
                SELECT id, key_prefix, client_name, client_email, description,
                       rate_limit_tier, requests_per_hour, is_active, created_at,
                       created_by, last_used_at, expires_at, revoked_at, revoked_by
                FROM public.api_keys
                WHERE id = %s
            """, (api_key_id,))
            row = cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="API key no encontrada")
            colnames = [desc[0] for desc in cursor.description]
            cursor.close()
            return APIKeyResponse(**dict(zip(colnames, row)))
        except HTTPException:
            raise
        except Exception as e:
            log_error(logger, "Error al obtener API key", exc=e, username=current_user['username'])
            raise HTTPException(status_code=500, detail="Error al obtener el detalle de la API key")


@router.delete("/admin/api-keys/{api_key_id}", tags=["Admin - API Keys"])
def revoke_api_key_endpoint(
    api_key_id: int,
    current_user: dict = Depends(get_current_user)
):
    require_role(['admin'], current_user)

    with get_connection() as conn:
        try:
            success = revoke_api_key(
                api_key_id=api_key_id,
                revoked_by=current_user['username'],
                db_conn=conn
            )

            if not success:
                raise HTTPException(status_code=404, detail="API key no encontrada")

            log_operation(
                logger,
                action="revoke_api_key",
                resource=f"api_key:{api_key_id}",
                username=current_user['username'],
                detail=f"api_key_id={api_key_id}"
            )

            return {
                "status": "success",
                "message": f"API key {api_key_id} revocada correctamente",
                "revoked_by": current_user['username']
            }
        except HTTPException:
            raise
        except Exception as e:
            log_error(logger, "Error al revocar API key", exc=e, username=current_user['username'])
            raise HTTPException(status_code=500, detail="Error al revocar la API key")


@router.get("/admin/api-keys/{api_key_id}/usage", response_model=UsageStatsResponse, tags=["Admin - API Keys"])
def get_api_key_usage_stats(
    api_key_id: int,
    current_user: dict = Depends(get_current_user)
):
    require_role(['admin'], current_user)

    with get_connection() as conn:
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT id FROM public.api_keys WHERE id = %s", (api_key_id,))
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="API key no encontrada")

            cursor.execute("""
                SELECT
                    COUNT(*) as total_requests,
                    SUM(CASE WHEN response_status < 400 THEN 1 ELSE 0 END) as successful_requests,
                    SUM(CASE WHEN response_status >= 400 THEN 1 ELSE 0 END) as failed_requests,
                    AVG(response_time_ms)::INTEGER as avg_response_time_ms
                FROM public.api_usage_logs
                WHERE api_key_id = %s
            """, (api_key_id,))
            stats = cursor.fetchone()

            cursor.execute("""
                SELECT COUNT(*) FROM public.api_usage_logs
                WHERE api_key_id = %s AND timestamp > CURRENT_TIMESTAMP - INTERVAL '1 hour'
            """, (api_key_id,))
            last_hour = cursor.fetchone()[0]

            cursor.execute("""
                SELECT COUNT(*) FROM public.api_usage_logs
                WHERE api_key_id = %s AND timestamp::DATE = CURRENT_DATE
            """, (api_key_id,))
            today = cursor.fetchone()[0]

            cursor.execute("""
                SELECT endpoint, COUNT(*) as request_count, AVG(response_time_ms)::INTEGER as avg_response_time
                FROM public.api_usage_logs
                WHERE api_key_id = %s
                GROUP BY endpoint
                ORDER BY request_count DESC
                LIMIT 10
            """, (api_key_id,))
            top_endpoints = [
                {"endpoint": row[0], "request_count": row[1], "avg_response_time_ms": row[2]}
                for row in cursor.fetchall()
            ]
            cursor.close()

            return UsageStatsResponse(
                total_requests=stats[0] or 0,
                successful_requests=stats[1] or 0,
                failed_requests=stats[2] or 0,
                avg_response_time_ms=stats[3] or 0,
                requests_last_hour=last_hour or 0,
                requests_today=today or 0,
                top_endpoints=top_endpoints
            )
        except HTTPException:
            raise
        except Exception as e:
            log_error(logger, "Error al obtener estadísticas de uso", exc=e, username=current_user['username'])
            raise HTTPException(status_code=500, detail="Error al obtener las estadísticas de uso")


@router.get("/admin/api-keys/stats/global", tags=["Admin - API Keys"])
def get_global_api_stats(
    current_user: dict = Depends(get_current_user)
):
    require_role(['admin'], current_user)

    with get_connection() as conn:
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT COUNT(*) FROM public.api_keys WHERE is_active = TRUE")
            total_active_keys = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM public.api_usage_logs")
            total_requests = cursor.fetchone()[0]

            cursor.execute("""
                SELECT COUNT(*) FROM public.api_usage_logs
                WHERE timestamp::DATE = CURRENT_DATE
            """)
            requests_today = cursor.fetchone()[0]

            cursor.execute("""
                SELECT k.key_prefix, k.client_name, COUNT(l.id) as request_count
                FROM public.api_keys k
                LEFT JOIN public.api_usage_logs l ON k.id = l.api_key_id
                WHERE k.is_active = TRUE
                GROUP BY k.id, k.key_prefix, k.client_name
                ORDER BY request_count DESC
                LIMIT 10
            """)
            top_keys = [
                {"key_prefix": row[0], "client_name": row[1], "request_count": row[2]}
                for row in cursor.fetchall()
            ]
            cursor.close()

            return {
                "total_active_keys": total_active_keys,
                "total_requests": total_requests,
                "requests_today": requests_today,
                "top_keys": top_keys
            }
        except HTTPException:
            raise
        except Exception as e:
            log_error(logger, "Error al obtener estadísticas globales", exc=e, username=current_user['username'])
            raise HTTPException(status_code=500, detail="Error al obtener las estadísticas globales")