from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from typing import List
import json
from datetime import datetime

from app.db import get_connection
from app.schemas.export_schemas import EstacionExportWrapper
from app.services.export_service import ExportService
from app.security import get_current_user

router = APIRouter()


@router.get("/export/estacion/{estacion_id}", response_model=EstacionExportWrapper)
def exportar_estacion(
    estacion_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Exporta una estación específica a formato JSON."""
    with get_connection() as conn:
        cursor = conn.cursor()
        try:
            resultado = ExportService.exportar_estacion(cursor, estacion_id)
            cursor.close()
            if not resultado:
                raise HTTPException(
                    status_code=404,
                    detail=f"Estación con ID {estacion_id} no encontrada"
                )
            return resultado
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=500, detail="Error al exportar la estación")


@router.get("/export/estaciones", response_model=List[EstacionExportWrapper])
def exportar_todas_estaciones(
    current_user: dict = Depends(get_current_user)
):
    """Exporta todas las estaciones a formato JSON."""
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


@router.get("/export/estaciones/download")
def descargar_todas_estaciones(
    current_user: dict = Depends(get_current_user)
):
    """Descarga todas las estaciones como archivo JSON."""
    with get_connection() as conn:
        cursor = conn.cursor()
        try:
            resultado = ExportService.exportar_todas_estaciones(cursor)
            cursor.close()
            if not resultado:
                raise HTTPException(status_code=404, detail="No se encontraron estaciones")
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"estaciones_export_{timestamp}.json"
            json_data = json.dumps(
                [r.dict() for r in resultado],
                ensure_ascii=False,
                indent=2
            )
            return JSONResponse(
                content=json.loads(json_data),
                headers={"Content-Disposition": f"attachment; filename={filename}"}
            )
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=500, detail="Error al descargar las estaciones")


@router.get("/export/estacion/{estacion_id}/download")
def descargar_estacion(
    estacion_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Descarga una estación específica como archivo JSON."""
    with get_connection() as conn:
        cursor = conn.cursor()
        try:
            resultado = ExportService.exportar_estacion(cursor, estacion_id)
            cursor.close()
            if not resultado:
                raise HTTPException(
                    status_code=404,
                    detail=f"Estación con ID {estacion_id} no encontrada"
                )
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"estacion_{estacion_id}_export_{timestamp}.json"
            json_data = json.dumps(
                resultado.dict(),
                ensure_ascii=False,
                indent=2
            )
            return JSONResponse(
                content=json.loads(json_data),
                headers={"Content-Disposition": f"attachment; filename={filename}"}
            )
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=500, detail="Error al descargar la estación")