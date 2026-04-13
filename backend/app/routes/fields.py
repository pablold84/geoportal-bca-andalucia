from fastapi import APIRouter, HTTPException, Depends
from app.db import get_connection
from app.security import get_current_user

router = APIRouter()


@router.get("/layers/{layer_id}/fields")
def get_layer_fields(
    layer_id: int,
    user: dict = Depends(get_current_user)
):
    with get_connection() as conn:
        cursor = conn.cursor()
        try:
            cursor.execute("""
                SELECT postgis_table, postgis_schema
                FROM public.layers WHERE layer_id = %s
            """, (layer_id,))
            layer = cursor.fetchone()
            if not layer:
                raise HTTPException(status_code=404, detail="Capa no encontrada")
            table_name = layer[0]
            schema_name = layer[1] or 'public'
            cursor.execute("""
                SELECT
                    column_name, data_type,
                    character_maximum_length, is_nullable
                FROM information_schema.columns
                WHERE table_schema = %s AND table_name = %s
                AND column_name NOT IN ('geom', 'geometry', 'the_geom', 'geompoint')
                ORDER BY ordinal_position
            """, (schema_name, table_name))
            fields_raw = cursor.fetchall()
            cursor.close()
            return [
                {
                    "column_name": row[0],
                    "data_type": row[1],
                    "character_maximum_length": row[2],
                    "is_nullable": row[3]
                }
                for row in fields_raw
            ]
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=500, detail="Error al obtener los campos de la capa")