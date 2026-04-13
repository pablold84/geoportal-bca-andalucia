from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from typing import List
import json
from datetime import datetime

from app.db import get_connection
from app.schemas.export_schemas import EstacionExportWrapper
from app.services.export_service import ExportService

router = APIRouter()


@router.get("/public/estaciones", tags=["Public API"],
    summary="Listar todas las estaciones")
def list_all_estaciones(request: Request):
    with get_connection() as conn:
        cursor = conn.cursor()
        try:
            cursor.execute("""
                SELECT
                    e.id, e.codigo_emplazamiento, e.version,
                    u.direccion, u.provincia, u.ayuntamiento, u.latitud, u.longitud,
                    de.nombre_emplazamiento, de.propietario_emplazamiento,
                    te.tipo_estacion
                FROM estaciones.estaciones e
                LEFT JOIN estaciones.ubicacion u ON e.id = u.estacion_id
                LEFT JOIN estaciones.datos_emplazamiento de ON e.id = de.estacion_id
                LEFT JOIN estaciones.tipo_emplazamiento te ON e.id = te.estacion_id
                ORDER BY e.id
            """)
            rows = cursor.fetchall()
            colnames = [desc[0] for desc in cursor.description]
            cursor.close()
            estaciones = [dict(zip(colnames, row)) for row in rows]
            return {"total": len(estaciones), "data": estaciones}
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=500, detail="Error al listar las estaciones")


@router.get("/public/estacion/{estacion_id}", tags=["Public API"],
    summary="Obtener detalle de estación")
def get_estacion_detail(estacion_id: int, request: Request):
    with get_connection() as conn:
        cursor = conn.cursor()
        try:
            cursor.execute("""
                SELECT id, version, codigo_emplazamiento
                FROM estaciones.estaciones WHERE id = %s
            """, (estacion_id,))
            estacion = cursor.fetchone()
            if not estacion:
                raise HTTPException(status_code=404, detail="Estación no encontrada")

            estacion_data = {
                "id": estacion[0],
                "version": estacion[1],
                "codigo_emplazamiento": estacion[2],
            }

            def fetch_one_dict():
                row = cursor.fetchone()
                return dict(zip([d[0] for d in cursor.description], row)) if row else {}

            cursor.execute("""
                SELECT direccion, provincia, ayuntamiento, latitud, longitud
                FROM estaciones.ubicacion WHERE estacion_id = %s
            """, (estacion_id,))
            ubicacion = fetch_one_dict()

            cursor.execute("""
                SELECT nombre_emplazamiento, propietario_emplazamiento,
                       descripcion_emplazamiento, realizado_por
                FROM estaciones.datos_emplazamiento WHERE estacion_id = %s
            """, (estacion_id,))
            datos_emplazamiento = fetch_one_dict()

            cursor.execute("""
                SELECT tipo_estacion, caseta, instalacion_exterior, emplazamiento_compartido
                FROM estaciones.tipo_emplazamiento WHERE estacion_id = %s
            """, (estacion_id,))
            tipo_emplazamiento = fetch_one_dict()

            cursor.execute("""
                SELECT id, tipo_equipo, estado, num_serie, codigo
                FROM estaciones.equipos_site WHERE estacion_id = %s ORDER BY id
            """, (estacion_id,))
            equipos_site = [dict(zip([d[0] for d in cursor.description], row)) for row in cursor.fetchall()]

            cursor.close()
            return {
                "estacion": estacion_data,
                "ubicacion": ubicacion,
                "datos_emplazamiento": datos_emplazamiento,
                "tipo_emplazamiento": tipo_emplazamiento,
                "equipos_site": equipos_site
            }
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=500, detail="Error al obtener el detalle de la estación")


@router.get("/public/export/estacion/{estacion_id}",
    response_model=EstacionExportWrapper, tags=["Public API - Export"],
    summary="Exportar estación a JSON")
def export_estacion_json(estacion_id: int, request: Request):
    with get_connection() as conn:
        cursor = conn.cursor()
        try:
            resultado = ExportService.exportar_estacion(cursor, estacion_id)
            cursor.close()
            if not resultado:
                raise HTTPException(status_code=404, detail=f"Estación con ID {estacion_id} no encontrada")
            return resultado
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=500, detail="Error al exportar la estación")


@router.get("/public/export/estaciones",
    response_model=List[EstacionExportWrapper], tags=["Public API - Export"],
    summary="Exportar todas las estaciones a JSON")
def export_all_estaciones_json(request: Request):
    with get_connection() as conn:
        cursor = conn.cursor()
        try:
            resultado = ExportService.exportar_todas_estaciones(cursor)
            cursor.close()
            if not resultado:
                raise HTTPException(status_code=404, detail="No se encontraron estaciones")
            return resultado
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=500, detail="Error al exportar las estaciones")


@router.get("/public/export/estaciones/download", tags=["Public API - Export"],
    summary="Descargar todas las estaciones como archivo JSON")
def download_all_estaciones(request: Request):
    with get_connection() as conn:
        cursor = conn.cursor()
        try:
            resultado = ExportService.exportar_todas_estaciones(cursor)
            cursor.close()
            if not resultado:
                raise HTTPException(status_code=404, detail="No se encontraron estaciones")
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"estaciones_export_{timestamp}.json"
            json_data = json.dumps([r.dict() for r in resultado], ensure_ascii=False, indent=2)
            return JSONResponse(
                content=json.loads(json_data),
                headers={"Content-Disposition": f"attachment; filename={filename}"}
            )
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=500, detail="Error al descargar las estaciones")


@router.get("/public/export/estacion/{estacion_id}/download", tags=["Public API - Export"],
    summary="Descargar estación como archivo JSON")
def download_estacion(estacion_id: int, request: Request):
    with get_connection() as conn:
        cursor = conn.cursor()
        try:
            resultado = ExportService.exportar_estacion(cursor, estacion_id)
            cursor.close()
            if not resultado:
                raise HTTPException(status_code=404, detail=f"Estación con ID {estacion_id} no encontrada")
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"estacion_{estacion_id}_export_{timestamp}.json"
            json_data = json.dumps(resultado.dict(), ensure_ascii=False, indent=2)
            return JSONResponse(
                content=json.loads(json_data),
                headers={"Content-Disposition": f"attachment; filename={filename}"}
            )
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=500, detail="Error al descargar la estación")


@router.get("/public/health", tags=["Public API"], summary="Health check del API")
def health_check(request: Request):
    api_key_info = getattr(request.state, 'api_key_info', None)
    return {
        "status": "ok",
        "message": "Geoportal API funcionando correctamente",
        "timestamp": datetime.now().isoformat(),
        "client": api_key_info['client_name'] if api_key_info else "Unknown"
    }