"""
Dashboard - Indicadores de progreso por proyecto
Endpoints genéricos para KPIs y visualización
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any

from app.db import get_connection
from app.security import get_current_user

router = APIRouter(
    tags=["Dashboard"],
    responses={
        401: {"description": "No autenticado"},
        403: {"description": "Sin permisos suficientes"},
        404: {"description": "Recurso no encontrado"}
    }
)


@router.get("/bca/resumen")
def get_bca_resumen(current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    """KPIs globales del proyecto BCA."""
    with get_connection() as conn:
        cursor = conn.cursor()
        try:
            cursor.execute('SELECT * FROM "Dashboard".v_dashboard_resumen')
            row = cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="No hay datos de resumen")
            columns = [desc[0] for desc in cursor.description]
            cursor.close()
            return dict(zip(columns, row))
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=500, detail="Error al obtener el resumen del dashboard")


@router.get("/bca/hojas")
def get_bca_hojas(
    limite: int = 100,
    current_user: dict = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """Estado de cada hoja individual con metadatos."""
    if limite > 1000:
        limite = 1000
    with get_connection() as conn:
        cursor = conn.cursor()
        try:
            cursor.execute(f'''
                SELECT
                    id, id_hoja, estado_res, estado_edicion, estado_produccion,
                    fecha_creacion_res, fecha_mod_res,
                    fecha_creacion_edi, fecha_mod_edi,
                    fecha_creacion_prod, fecha_mod_prod,
                    fase_actual, fecha_vuelo, empresa, vuelo
                FROM "Dashboard".v_dashboard_hojas
                LIMIT {limite}
            ''')
            rows = cursor.fetchall()
            columns = [desc[0] for desc in cursor.description]
            cursor.close()
            return [dict(zip(columns, row)) for row in rows]
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=500, detail="Error al obtener las hojas del dashboard")


@router.get("/bca/hojas/geojson")
def get_bca_hojas_geojson(current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    """Hojas con geometría en formato GeoJSON para visualización en mapa."""
    with get_connection() as conn:
        cursor = conn.cursor()
        try:
            cursor.execute('''
                SELECT
                    id, id_hoja, estado_res, estado_edicion, estado_produccion,
                    fase_actual, empresa, vuelo, fecha_vuelo,
                    ST_AsText(the_geom) as wkt_geom
                FROM "Dashboard".v_dashboard_hojas
                WHERE the_geom IS NOT NULL
            ''')
            rows = cursor.fetchall()
            cursor.close()

            if not rows:
                return {"type": "FeatureCollection", "features": []}

            from shapely import wkt
            from shapely.geometry import mapping
            from shapely.ops import transform as shapely_transform
            import pyproj

            project = pyproj.Transformer.from_crs('EPSG:25830', 'EPSG:4326', always_xy=True).transform

            features = []
            for row in rows:
                geom_25830 = wkt.loads(row[9])
                geom_4326 = shapely_transform(project, geom_25830)
                features.append({
                    "type": "Feature",
                    "id": row[0],
                    "geometry": mapping(geom_4326),
                    "properties": {
                        "id_hoja": row[1],
                        "estado_res": row[2],
                        "estado_edicion": row[3],
                        "estado_produccion": row[4],
                        "fase_actual": row[5],
                        "empresa": row[6],
                        "vuelo": row[7],
                        "fecha_vuelo": str(row[8]) if row[8] else None
                    }
                })

            return {"type": "FeatureCollection", "features": features}

        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=500, detail="Error al obtener el GeoJSON de hojas")


@router.get("/bca/entregas")
def get_bca_entregas(current_user: dict = Depends(get_current_user)) -> List[Dict[str, Any]]:
    """Progreso por lote/proveedor."""
    with get_connection() as conn:
        cursor = conn.cursor()
        try:
            cursor.execute('SELECT * FROM "Dashboard".v_dashboard_entregas')
            rows = cursor.fetchall()
            columns = [desc[0] for desc in cursor.description]
            cursor.close()
            return [dict(zip(columns, row)) for row in rows]
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=500, detail="Error al obtener las entregas del dashboard")