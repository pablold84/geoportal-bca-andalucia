from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, List
from app.security import get_current_user, require_role
from app.db import get_connection
from app.logger import get_logger, log_error

logger = get_logger("dashboard_admin")

router = APIRouter(
    tags=["Dashboard Admin"],
    responses={
        401: {"description": "No autenticado"},
        403: {"description": "Sin permisos suficientes"},
        404: {"description": "Recurso no encontrado"}
    }
)


@router.get("/admin/resumen")
def get_admin_resumen(current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    require_role(["admin"], current_user)
    with get_connection() as conn:
        cursor = conn.cursor()
        try:
            cursor.execute('SELECT * FROM "Dashboard".v_admin_resumen_global')
            row = cursor.fetchone()
            cursor.close()
            if not row:
                return {"total_usuarios": 0, "total_actividades": 0, "dias_trabajados": 0,
                        "total_horas": 0, "promedio_horas_por_actividad": 0}
            columns = [desc[0] for desc in cursor.description]
            return dict(zip(columns, row))
        except HTTPException:
            raise
        except Exception as e:
            log_error(logger, "Error al obtener resumen admin", exc=e, username=current_user.get("username", ""))
            raise HTTPException(status_code=500, detail="Error al obtener el resumen de administración")


@router.get("/admin/horas-usuario")
def get_admin_horas_usuario(current_user: dict = Depends(get_current_user)) -> List[Dict[str, Any]]:
    require_role(["admin"], current_user)
    with get_connection() as conn:
        cursor = conn.cursor()
        try:
            cursor.execute('SELECT * FROM "Dashboard".v_admin_horas_usuario')
            rows = cursor.fetchall()
            columns = [desc[0] for desc in cursor.description]
            cursor.close()
            return [dict(zip(columns, row)) for row in rows]
        except HTTPException:
            raise
        except Exception as e:
            log_error(logger, "Error al obtener horas por usuario", exc=e, username=current_user.get("username", ""))
            raise HTTPException(status_code=500, detail="Error al obtener las horas por usuario")


@router.get("/admin/distribucion-actividades")
def get_admin_distribucion_actividades(current_user: dict = Depends(get_current_user)) -> List[Dict[str, Any]]:
    require_role(["admin"], current_user)
    with get_connection() as conn:
        cursor = conn.cursor()
        try:
            cursor.execute('SELECT * FROM "Dashboard".v_admin_distribucion_actividades')
            rows = cursor.fetchall()
            columns = [desc[0] for desc in cursor.description]
            cursor.close()
            return [dict(zip(columns, row)) for row in rows]
        except HTTPException:
            raise
        except Exception as e:
            log_error(logger, "Error al obtener distribución de actividades", exc=e, username=current_user.get("username", ""))
            raise HTTPException(status_code=500, detail="Error al obtener la distribución de actividades")


@router.get("/admin/productividad-diaria")
def get_admin_productividad_diaria(current_user: dict = Depends(get_current_user)) -> List[Dict[str, Any]]:
    require_role(["admin"], current_user)
    with get_connection() as conn:
        cursor = conn.cursor()
        try:
            cursor.execute('SELECT * FROM "Dashboard".v_admin_productividad_diaria')
            rows = cursor.fetchall()
            columns = [desc[0] for desc in cursor.description]
            cursor.close()
            return [dict(zip(columns, row)) for row in rows]
        except HTTPException:
            raise
        except Exception as e:
            log_error(logger, "Error al obtener productividad diaria", exc=e, username=current_user.get("username", ""))
            raise HTTPException(status_code=500, detail="Error al obtener la productividad diaria")


@router.get("/admin/productividad-semanal")
def get_admin_productividad_semanal(current_user: dict = Depends(get_current_user)) -> List[Dict[str, Any]]:
    require_role(["admin"], current_user)
    with get_connection() as conn:
        cursor = conn.cursor()
        try:
            cursor.execute('SELECT * FROM "Dashboard".v_admin_productividad_semanal')
            rows = cursor.fetchall()
            columns = [desc[0] for desc in cursor.description]
            cursor.close()
            return [dict(zip(columns, row)) for row in rows]
        except HTTPException:
            raise
        except Exception as e:
            log_error(logger, "Error al obtener productividad semanal", exc=e, username=current_user.get("username", ""))
            raise HTTPException(status_code=500, detail="Error al obtener la productividad semanal")


@router.get("/admin/comparativa-usuarios")
def get_admin_comparativa_usuarios(current_user: dict = Depends(get_current_user)) -> List[Dict[str, Any]]:
    require_role(["admin"], current_user)
    with get_connection() as conn:
        cursor = conn.cursor()
        try:
            cursor.execute('SELECT * FROM "Dashboard".v_admin_comparativa_usuarios')
            rows = cursor.fetchall()
            columns = [desc[0] for desc in cursor.description]
            cursor.close()
            return [dict(zip(columns, row)) for row in rows]
        except HTTPException:
            raise
        except Exception as e:
            log_error(logger, "Error al obtener comparativa de usuarios", exc=e, username=current_user.get("username", ""))
            raise HTTPException(status_code=500, detail="Error al obtener la comparativa de usuarios")


@router.get("/admin/evolucion-actividades")
def get_admin_evolucion_actividades(current_user: dict = Depends(get_current_user)) -> List[Dict[str, Any]]:
    require_role(["admin"], current_user)
    with get_connection() as conn:
        cursor = conn.cursor()
        try:
            cursor.execute('SELECT * FROM "Dashboard".v_admin_evolucion_actividades')
            rows = cursor.fetchall()
            columns = [desc[0] for desc in cursor.description]
            cursor.close()
            return [dict(zip(columns, row)) for row in rows]
        except HTTPException:
            raise
        except Exception as e:
            log_error(logger, "Error al obtener evolución de actividades", exc=e, username=current_user.get("username", ""))
            raise HTTPException(status_code=500, detail="Error al obtener la evolución de actividades")