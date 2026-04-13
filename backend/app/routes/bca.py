from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from datetime import date, datetime
from app.db import get_connection
from app.security import get_current_user, require_role
from app.logger import get_logger, log_error

logger = get_logger("bca")

router = APIRouter(tags=["BCA Dashboard"])


def _build_filters_unicas(
    fecha_desde: Optional[date],
    fecha_hasta: Optional[date],
    hoja: Optional[str],
    fenomeno: Optional[str],
) -> tuple:
    filtros = []
    params = []
    if fecha_desde:
        filtros.append("primera_actuacion >= %s")
        params.append(datetime.combine(fecha_desde, datetime.min.time()))
    if fecha_hasta:
        filtros.append("ultima_actuacion <= %s")
        params.append(datetime.combine(fecha_hasta, datetime.max.time()))
    if hoja:
        filtros.append("id_hoja = %s")
        params.append(hoja)
    if fenomeno:
        filtros.append("tabla_nombre = %s")
        params.append(fenomeno)
    where = ("WHERE " + " AND ".join(filtros)) if filtros else ""
    return where, params


def _build_filters_tecnico(
    fecha_desde: Optional[date],
    fecha_hasta: Optional[date],
    hoja: Optional[str],
    fenomeno: Optional[str],
    usuario: Optional[str],
) -> tuple:
    filtros = []
    params = []
    if fecha_desde:
        filtros.append("primera_actuacion >= %s")
        params.append(datetime.combine(fecha_desde, datetime.min.time()))
    if fecha_hasta:
        filtros.append("ultima_actuacion <= %s")
        params.append(datetime.combine(fecha_hasta, datetime.max.time()))
    if hoja:
        filtros.append("id_hoja = %s")
        params.append(hoja)
    if fenomeno:
        filtros.append("tabla_nombre = %s")
        params.append(fenomeno)
    if usuario:
        filtros.append("usuario = %s")
        params.append(usuario)
    where = ("WHERE " + " AND ".join(filtros)) if filtros else ""
    return where, params


@router.get("/resumen")
def get_resumen(
    fecha_desde: Optional[date] = Query(None, description="Fecha inicio YYYY-MM-DD"),
    fecha_hasta: Optional[date] = Query(None, description="Fecha fin YYYY-MM-DD"),
    hoja:        Optional[str]  = Query(None, description="Filtrar por id_hoja"),
    fenomeno:    Optional[str]  = Query(None, description="Filtrar por tabla_nombre"),
    user: dict = Depends(get_current_user)
):
    with get_connection() as conn:
        cursor = conn.cursor()
        try:
            where, params = _build_filters_unicas(fecha_desde, fecha_hasta, hoja, fenomeno)
            cursor.execute(f"""
                SELECT
                    COUNT(*)                                                    AS objetos_unicos_total,
                    COUNT(DISTINCT id_hoja)                                     AS hojas_con_actividad,
                    COUNT(DISTINCT tabla_nombre)                                AS fenomenos_afectados,
                    SUM(num_operaciones)                                        AS total_operaciones,
                    COUNT(*) FILTER (WHERE accion_principal = 'I')             AS objetos_creados,
                    COUNT(*) FILTER (WHERE accion_principal = 'U')             AS objetos_modificados,
                    COUNT(*) FILTER (WHERE accion_principal = 'D')             AS objetos_eliminados,
                    MIN(primera_actuacion)                                      AS primera_actuacion,
                    MAX(ultima_actuacion)                                       AS ultima_actuacion
                FROM "Dashboard".v_actuaciones_unicas
                {where}
            """, params)
            row = cursor.fetchone()
            cursor.close()
            return {
                "objetos_unicos_total":  row[0] or 0,
                "hojas_con_actividad":   row[1] or 0,
                "fenomenos_afectados":   row[2] or 0,
                "total_operaciones":     int(row[3]) if row[3] else 0,
                "objetos_creados":       row[4] or 0,
                "objetos_modificados":   row[5] or 0,
                "objetos_eliminados":    row[6] or 0,
                "primera_actuacion":     row[7].isoformat() if row[7] else None,
                "ultima_actuacion":      row[8].isoformat() if row[8] else None,
                "filtros_aplicados": {
                    "fecha_desde": fecha_desde.isoformat() if fecha_desde else None,
                    "fecha_hasta": fecha_hasta.isoformat() if fecha_hasta else None,
                    "hoja":        hoja,
                    "fenomeno":    fenomeno,
                }
            }
        except HTTPException:
            raise
        except Exception as e:
            log_error(logger, "Error al obtener el resumen BCA", exc=e, username=user.get("username", ""))
            raise HTTPException(status_code=500, detail="Error al obtener el resumen del dashboard BCA")


@router.get("/por-fenomeno")
def get_por_fenomeno(
    fecha_desde: Optional[date] = Query(None),
    fecha_hasta: Optional[date] = Query(None),
    hoja:        Optional[str]  = Query(None),
    user: dict = Depends(get_current_user)
):
    with get_connection() as conn:
        cursor = conn.cursor()
        try:
            where, params = _build_filters_unicas(fecha_desde, fecha_hasta, hoja, None)
            cursor.execute(f"""
                SELECT
                    tabla_nombre                                                AS fenomeno,
                    COUNT(*)                                                    AS objetos_unicos,
                    COUNT(*) FILTER (WHERE accion_principal = 'I')             AS creaciones,
                    COUNT(*) FILTER (WHERE accion_principal = 'U')             AS modificaciones,
                    COUNT(*) FILTER (WHERE accion_principal = 'D')             AS eliminaciones,
                    SUM(num_operaciones)                                        AS total_operaciones,
                    ROUND(AVG(num_operaciones)::numeric, 1)                    AS media_ops_por_objeto,
                    MAX(ultima_actuacion)                                       AS ultimo_cambio
                FROM "Dashboard".v_actuaciones_unicas
                {where}
                GROUP BY tabla_nombre
                ORDER BY objetos_unicos DESC
            """, params)
            columnas = [
                "fenomeno", "objetos_unicos", "creaciones", "modificaciones",
                "eliminaciones", "total_operaciones", "media_ops_por_objeto", "ultimo_cambio"
            ]
            resultado = []
            for row in cursor.fetchall():
                item = dict(zip(columnas, row))
                if item["ultimo_cambio"]:
                    item["ultimo_cambio"] = item["ultimo_cambio"].isoformat()
                resultado.append(item)
            cursor.close()
            return {"fenomenos": resultado, "total": len(resultado)}
        except HTTPException:
            raise
        except Exception as e:
            log_error(logger, "Error al obtener datos por fenómeno BCA", exc=e, username=user.get("username", ""))
            raise HTTPException(status_code=500, detail="Error al obtener los datos por fenómeno")


@router.get("/por-hoja")
def get_por_hoja(
    fecha_desde: Optional[date] = Query(None),
    fecha_hasta: Optional[date] = Query(None),
    fenomeno:    Optional[str]  = Query(None),
    user: dict = Depends(get_current_user)
):
    with get_connection() as conn:
        cursor = conn.cursor()
        try:
            where, params = _build_filters_unicas(fecha_desde, fecha_hasta, None, fenomeno)
            cursor.execute(f"""
                SELECT
                    id_hoja,
                    COUNT(*)                                                    AS objetos_unicos,
                    COUNT(DISTINCT tabla_nombre)                                AS fenomenos_en_hoja,
                    COUNT(*) FILTER (WHERE accion_principal = 'I')             AS creaciones,
                    COUNT(*) FILTER (WHERE accion_principal = 'U')             AS modificaciones,
                    COUNT(*) FILTER (WHERE accion_principal = 'D')             AS eliminaciones,
                    MAX(ultima_actuacion)                                       AS ultimo_cambio
                FROM "Dashboard".v_actuaciones_unicas
                {where}
                GROUP BY id_hoja
                ORDER BY objetos_unicos DESC
            """, params)
            columnas = [
                "id_hoja", "objetos_unicos", "fenomenos_en_hoja",
                "creaciones", "modificaciones", "eliminaciones", "ultimo_cambio"
            ]
            resultado = []
            for row in cursor.fetchall():
                item = dict(zip(columnas, row))
                if item["ultimo_cambio"]:
                    item["ultimo_cambio"] = item["ultimo_cambio"].isoformat()
                resultado.append(item)
            cursor.close()
            return {"hojas": resultado, "total": len(resultado)}
        except HTTPException:
            raise
        except Exception as e:
            log_error(logger, "Error al obtener datos por hoja BCA", exc=e, username=user.get("username", ""))
            raise HTTPException(status_code=500, detail="Error al obtener los datos por hoja")


@router.get("/por-tecnico")
def get_por_tecnico(
    fecha_desde: Optional[date] = Query(None),
    fecha_hasta: Optional[date] = Query(None),
    hoja:        Optional[str]  = Query(None),
    fenomeno:    Optional[str]  = Query(None),
    user: dict = Depends(get_current_user)
):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo los administradores pueden ver datos por técnico")

    with get_connection() as conn:
        cursor = conn.cursor()
        try:
            where, params = _build_filters_tecnico(fecha_desde, fecha_hasta, hoja, fenomeno, None)
            cursor.execute(f"""
                SELECT
                    usuario,
                    SUM(objetos_unicos_actuados)                AS objetos_unicos,
                    SUM(objetos_creados)                        AS creaciones,
                    SUM(objetos_modificados)                    AS modificaciones,
                    SUM(objetos_eliminados)                     AS eliminaciones,
                    SUM(total_operaciones)                      AS total_operaciones,
                    MIN(primera_actuacion)                      AS primera_actuacion,
                    MAX(ultima_actuacion)                       AS ultima_actuacion
                FROM "Dashboard".v_actuaciones_por_tecnico
                {where}
                GROUP BY usuario
                ORDER BY objetos_unicos DESC
            """, params)
            columnas = [
                "usuario", "objetos_unicos", "creaciones", "modificaciones",
                "eliminaciones", "total_operaciones", "primera_actuacion", "ultima_actuacion"
            ]
            resultado = []
            for row in cursor.fetchall():
                item = dict(zip(columnas, row))
                for campo in ("primera_actuacion", "ultima_actuacion"):
                    if item[campo]:
                        item[campo] = item[campo].isoformat()
                resultado.append(item)
            cursor.close()
            return {"tecnicos": resultado, "total": len(resultado)}
        except HTTPException:
            raise
        except Exception as e:
            log_error(logger, "Error al obtener datos por técnico BCA", exc=e, username=user.get("username", ""))
            raise HTTPException(status_code=500, detail="Error al obtener los datos por técnico")


@router.get("/evolucion")
def get_evolucion(
    fecha_desde: Optional[date] = Query(None),
    fecha_hasta: Optional[date] = Query(None),
    fenomeno:    Optional[str]  = Query(None),
    agrupacion:  str            = Query("semana", description="semana | mes"),
    user: dict = Depends(get_current_user)
):
    if agrupacion not in ("semana", "mes"):
        raise HTTPException(status_code=400, detail="agrupacion debe ser 'semana' o 'mes'")
    trunc = "week" if agrupacion == "semana" else "month"

    with get_connection() as conn:
        cursor = conn.cursor()
        try:
            where, params = _build_filters_unicas(fecha_desde, fecha_hasta, None, fenomeno)
            cursor.execute(f"""
                SELECT
                    DATE_TRUNC('{trunc}', primera_actuacion)::date  AS periodo,
                    COUNT(*)                                          AS objetos_unicos,
                    COUNT(DISTINCT tabla_nombre)                      AS fenomenos_activos,
                    SUM(num_operaciones)                              AS operaciones
                FROM "Dashboard".v_actuaciones_unicas
                {where}
                GROUP BY DATE_TRUNC('{trunc}', primera_actuacion)
                ORDER BY periodo
            """, params)
            resultado = [
                {
                    "periodo":           row[0].isoformat() if row[0] else None,
                    "objetos_unicos":    row[1],
                    "fenomenos_activos": row[2],
                    "operaciones":       int(row[3]) if row[3] else 0,
                }
                for row in cursor.fetchall()
            ]
            cursor.close()
            return {"evolucion": resultado, "agrupacion": agrupacion}
        except HTTPException:
            raise
        except Exception as e:
            log_error(logger, "Error al obtener evolución temporal BCA", exc=e, username=user.get("username", ""))
            raise HTTPException(status_code=500, detail="Error al obtener la evolución temporal")


@router.get("/filtros")
def get_filtros(user: dict = Depends(get_current_user)):
    with get_connection() as conn:
        cursor = conn.cursor()
        try:
            cursor.execute("""
                SELECT id_hoja, COUNT(*) AS objetos_unicos
                FROM "Dashboard".v_actuaciones_unicas
                GROUP BY id_hoja ORDER BY id_hoja
            """)
            hojas = [{"id_hoja": r[0], "objetos_unicos": r[1]} for r in cursor.fetchall()]

            cursor.execute("""
                SELECT tabla_nombre, COUNT(*) AS objetos_unicos
                FROM "Dashboard".v_actuaciones_unicas
                GROUP BY tabla_nombre ORDER BY tabla_nombre
            """)
            fenomenos = [{"fenomeno": r[0], "objetos_unicos": r[1]} for r in cursor.fetchall()]

            tecnicos = []
            if user.get("role") == "admin":
                cursor.execute("""
                    SELECT usuario, SUM(objetos_unicos_actuados) AS objetos_unicos
                    FROM "Dashboard".v_actuaciones_por_tecnico
                    GROUP BY usuario ORDER BY usuario
                """)
                tecnicos = [{"usuario": r[0], "objetos_unicos": r[1]} for r in cursor.fetchall()]

            cursor.close()
            return {"hojas": hojas, "fenomenos": fenomenos, "tecnicos": tecnicos}
        except HTTPException:
            raise
        except Exception as e:
            log_error(logger, "Error al obtener filtros BCA", exc=e, username=user.get("username", ""))
            raise HTTPException(status_code=500, detail="Error al obtener los filtros del dashboard")