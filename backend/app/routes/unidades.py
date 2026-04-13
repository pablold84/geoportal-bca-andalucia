from fastapi import APIRouter, HTTPException, Query
from app.db import get_connection
import json

router = APIRouter()


@router.get("/unidades")
def get_unidades(
    limit: int = 10,
    search: str = Query(None, description="Texto de búsqueda para filtrar")
):
    with get_connection() as conn:
        cursor = conn.cursor()
        try:
            base_query = """
                SELECT
                    u.id AS unidad_id,
                    u.ubicacion_id,
                    ub.estacion_id,
                    e.id AS estacion_id,
                    e.codigo_emplazamiento,
                    ub.provincia,
                    ub.ayuntamiento,
                    ub.direccion,
                    ST_X(ST_Transform(u.geompoint, 4326)) AS lon,
                    ST_Y(ST_Transform(u.geompoint, 4326)) AS lat,
                    ST_X(u.geompoint) AS x,
                    ST_Y(u.geompoint) AS y
                FROM estaciones.unidad_espacial u
                LEFT JOIN estaciones.ubicacion ub ON u.ubicacion_id = ub.id
                LEFT JOIN estaciones.estaciones e ON ub.estacion_id = e.id
            """
            params = []
            if search and search.strip():
                search_term = f"%{search.strip()}%"
                base_query += """
                    WHERE
                        CAST(e.codigo_emplazamiento AS TEXT) ILIKE %s
                        OR ub.provincia ILIKE %s
                        OR ub.ayuntamiento ILIKE %s
                        OR ub.direccion ILIKE %s
                """
                params = [search_term] * 4
            base_query += " LIMIT %s"
            params.append(limit)
            cursor.execute(base_query, params)
            rows = cursor.fetchall()
            colnames = [desc[0] for desc in cursor.description]
            cursor.close()
            return {"data": [dict(zip(colnames, r)) for r in rows]}
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=500, detail="Error al obtener las unidades")


@router.get("/unidades/geojson")
def get_unidades_geojson():
    with get_connection() as conn:
        cursor = conn.cursor()
        try:
            cursor.execute("""
                SELECT
                    u.id,
                    u.ubicacion_id,
                    ST_AsGeoJSON(ST_Transform(u.geompoint, 25830)) AS geom_json
                FROM estaciones.unidad_espacial u
            """)
            rows = cursor.fetchall()
            cursor.close()
            features = []
            for row in rows:
                geom = json.loads(row[2]) if row[2] else None
                features.append({
                    "type": "Feature",
                    "geometry": geom,
                    "properties": {"id": row[0], "ubicacion_id": row[1]}
                })
            return {"type": "FeatureCollection", "features": features}
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=500, detail="Error al obtener las unidades en formato GeoJSON")