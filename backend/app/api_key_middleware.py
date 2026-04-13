# /home/pablold/visor-gis/backend/app/api_key_middleware.py

from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Callable
import time
from app.db import get_connection
from app.api_key_utils import validate_api_key, check_rate_limit, log_api_usage

# ============================================================================
# MIDDLEWARE DE VALIDACIÓN DE API KEYS
# ============================================================================

class APIKeyMiddleware(BaseHTTPMiddleware):
    """
    Middleware que valida API keys para endpoints públicos (/api/public/*).
    
    - Verifica que el header X-API-Key esté presente
    - Valida la key contra la base de datos
    - Aplica rate limiting según el tier del cliente
    - Registra cada petición en api_usage_logs
    """
    
    async def dispatch(self, request: Request, call_next: Callable):
        # Solo aplicar a rutas /api/public/*
        if not request.url.path.startswith("/api/public"):
            return await call_next(request)
        
        # Medir tiempo de respuesta
        start_time = time.time()
        
        # Extraer API key del header
        api_key = request.headers.get("X-API-Key")
        
        if not api_key:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={
                    "detail": "API key requerida. Incluya el header 'X-API-Key' en su petición.",
                    "error_code": "MISSING_API_KEY"
                }
            )
        
        # Conectar a la base de datos
        conn = None
        try:
            conn = get_connection()
            
            # Validar API key
            key_info = validate_api_key(api_key, conn)
            
            if not key_info:
                response_time = int((time.time() - start_time) * 1000)
                return JSONResponse(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    content={
                        "detail": "API key inválida o inactiva.",
                        "error_code": "INVALID_API_KEY"
                    }
                )
            
            # Verificar rate limit
            can_proceed, current_requests, limit = check_rate_limit(key_info['id'], conn)
            
            if not can_proceed:
                response_time = int((time.time() - start_time) * 1000)
                
                # Registrar intento bloqueado
                log_api_usage(
                    api_key_id=key_info['id'],
                    endpoint=request.url.path,
                    method=request.method,
                    response_status=429,
                    response_time_ms=response_time,
                    ip_address=request.client.host if request.client else None,
                    user_agent=request.headers.get("user-agent"),
                    db_conn=conn
                )
                
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={
                        "detail": f"Rate limit excedido. Límite: {limit} peticiones/hora. Realizadas: {current_requests}.",
                        "error_code": "RATE_LIMIT_EXCEEDED",
                        "rate_limit": {
                            "limit": limit,
                            "current": current_requests,
                            "tier": key_info['rate_limit_tier']
                        }
                    },
                    headers={
                        "X-RateLimit-Limit": str(limit),
                        "X-RateLimit-Remaining": str(max(0, limit - current_requests - 1)),
                        "X-RateLimit-Reset": "3600"  # Segundos hasta reset
                    }
                )
            
            # Agregar información de la API key al request state
            request.state.api_key_info = key_info
            
            # Ejecutar la petición
            response = await call_next(request)
            
            # Calcular tiempo de respuesta
            response_time = int((time.time() - start_time) * 1000)
            
            # Registrar uso exitoso
            log_api_usage(
                api_key_id=key_info['id'],
                endpoint=request.url.path,
                method=request.method,
                response_status=response.status_code,
                response_time_ms=response_time,
                ip_address=request.client.host if request.client else None,
                user_agent=request.headers.get("user-agent"),
                db_conn=conn
            )
            
            # Agregar headers de rate limit a la respuesta
            response.headers["X-RateLimit-Limit"] = str(limit)
            response.headers["X-RateLimit-Remaining"] = str(max(0, limit - current_requests - 1))
            response.headers["X-RateLimit-Reset"] = "3600"
            response.headers["X-API-Key-Client"] = key_info['client_name']
            
            return response
            
        except Exception as e:
            
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={
                    "detail": "Error al procesar la solicitud"
                }
            )
        finally:
            if conn:
                conn.close()


# ============================================================================
# DEPENDENCY PARA OBTENER INFO DE LA API KEY EN ENDPOINTS
# ============================================================================

def get_api_key_info(request: Request) -> dict:
    """
    Dependency para obtener información de la API key validada en endpoints.
    
    Uso:
        @router.get("/api/public/algo")
        def mi_endpoint(api_key_info: dict = Depends(get_api_key_info)):
    """
    if not hasattr(request.state, 'api_key_info'):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key no validada correctamente"
        )
    
    return request.state.api_key_info