"""
Routes for Layer Styles management
Endpoints para gestión de estilos de capas
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from pydantic import BaseModel
import psycopg2
from psycopg2.extras import RealDictCursor, Json
from app.security import get_current_user
from app.db import get_connection

router = APIRouter(
    prefix="/api/styles",
    tags=["Styles"],
    responses={
        401: {"description": "No autenticado"},
        403: {"description": "Sin permisos suficientes"},
        404: {"description": "Recurso no encontrado"}
    }
)


class StyleTemplate(BaseModel):
    template_id: int
    template_name: str
    template_category: Optional[str]
    geometry_type: str
    template_config: dict
    preview_svg: Optional[str]

class LayerStyle(BaseModel):
    style_id: Optional[int] = None
    layer_id: int
    style_name: str
    style_type: str
    style_config: dict
    is_favorite: bool = False

class ApplyTemplateRequest(BaseModel):
    template_id: int

class ApplyStyleRequest(BaseModel):
    style_config: dict


@router.get("/templates", response_model=List[StyleTemplate])
async def get_style_templates(
    geometry_type: Optional[str] = None,
    category: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    with get_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        try:
            query = "SELECT * FROM public.style_templates WHERE 1=1"
            params = []
            if geometry_type:
                query += " AND geometry_type = %s"
                params.append(geometry_type)
            if category:
                query += " AND template_category = %s"
                params.append(category)
            query += " ORDER BY template_category, template_name"
            cursor.execute(query, params)
            templates = cursor.fetchall()
            cursor.close()
            return templates
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=500, detail="Error al obtener las plantillas de estilo")


@router.get("/templates/{template_id}", response_model=StyleTemplate)
async def get_template_by_id(
    template_id: int,
    user: dict = Depends(get_current_user)
):
    with get_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        try:
            cursor.execute("SELECT * FROM public.style_templates WHERE template_id = %s", (template_id,))
            template = cursor.fetchone()
            cursor.close()
            if not template:
                raise HTTPException(status_code=404, detail="Plantilla no encontrada")
            return template
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=500, detail="Error al obtener la plantilla de estilo")


@router.get("/layer/{layer_id}/active")
async def get_active_layer_style(
    layer_id: int,
    user: dict = Depends(get_current_user)
):
    with get_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        try:
            cursor.execute(
                "SELECT layer_id, layer_name, style_config FROM public.layers WHERE layer_id = %s",
                (layer_id,)
            )
            layer = cursor.fetchone()
            cursor.close()
            if not layer:
                raise HTTPException(status_code=404, detail="Capa no encontrada")
            return {
                "layer_id": layer["layer_id"],
                "layer_name": layer["layer_name"],
                "style_config": layer["style_config"] or {}
            }
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=500, detail="Error al obtener el estilo activo de la capa")


@router.put("/layer/{layer_id}/active")
async def update_active_layer_style(
    layer_id: int,
    request: ApplyStyleRequest,
    user: dict = Depends(get_current_user)
):
    with get_connection() as conn:
        cursor = conn.cursor()
        try:
            cursor.execute(
                """
                UPDATE public.layers
                SET style_config = %s, updated_at = CURRENT_TIMESTAMP
                WHERE layer_id = %s RETURNING layer_id
                """,
                (Json(request.style_config), layer_id)
            )
            result = cursor.fetchone()
            if not result:
                conn.rollback()
                raise HTTPException(status_code=404, detail="Capa no encontrada")
            conn.commit()
            cursor.close()
            return {
                "success": True,
                "message": "Estilo actualizado correctamente",
                "layer_id": layer_id,
                "style_config": request.style_config
            }
        except HTTPException:
            conn.rollback()
            raise
        except Exception:
            conn.rollback()
            raise HTTPException(status_code=500, detail="Error al actualizar el estilo de la capa")


@router.put("/layer/{layer_id}/apply-template")
async def apply_template_to_layer(
    layer_id: int,
    request: ApplyTemplateRequest,
    user: dict = Depends(get_current_user)
):
    with get_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        try:
            cursor.execute(
                "SELECT template_config FROM public.style_templates WHERE template_id = %s",
                (request.template_id,)
            )
            template = cursor.fetchone()
            if not template:
                raise HTTPException(status_code=404, detail="Plantilla no encontrada")
            template_config = template["template_config"]
            cursor.execute(
                """
                UPDATE public.layers
                SET style_config = %s, updated_at = CURRENT_TIMESTAMP
                WHERE layer_id = %s RETURNING layer_id
                """,
                (Json(template_config), layer_id)
            )
            result = cursor.fetchone()
            if not result:
                conn.rollback()
                raise HTTPException(status_code=404, detail="Capa no encontrada")
            conn.commit()
            cursor.close()
            return {
                "success": True,
                "message": "Plantilla aplicada correctamente",
                "layer_id": layer_id,
                "style_config": template_config
            }
        except HTTPException:
            conn.rollback()
            raise
        except Exception:
            conn.rollback()
            raise HTTPException(status_code=500, detail="Error al aplicar la plantilla de estilo")


@router.get("/layer/{layer_id}/saved", response_model=List[LayerStyle])
async def get_saved_layer_styles(
    layer_id: int,
    user: dict = Depends(get_current_user)
):
    with get_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        try:
            cursor.execute(
                """
                SELECT * FROM public.layer_styles
                WHERE layer_id = %s ORDER BY is_favorite DESC, created_at DESC
                """,
                (layer_id,)
            )
            styles = cursor.fetchall()
            cursor.close()
            return styles
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=500, detail="Error al obtener los estilos guardados")


@router.post("/layer/{layer_id}/saved", response_model=LayerStyle)
async def save_layer_style(
    layer_id: int,
    style: LayerStyle,
    user: dict = Depends(get_current_user)
):
    with get_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        try:
            cursor.execute(
                """
                INSERT INTO public.layer_styles
                (layer_id, style_name, style_type, style_config, is_favorite, created_by)
                VALUES (%s, %s, %s, %s, %s, %s) RETURNING *
                """,
                (layer_id, style.style_name, style.style_type,
                 Json(style.style_config), style.is_favorite, user.get("username", "unknown"))
            )
            new_style = cursor.fetchone()
            conn.commit()
            cursor.close()
            return new_style
        except psycopg2.IntegrityError:
            conn.rollback()
            raise HTTPException(status_code=400, detail="Ya existe un estilo con ese nombre para esta capa")
        except HTTPException:
            conn.rollback()
            raise
        except Exception:
            conn.rollback()
            raise HTTPException(status_code=500, detail="Error al guardar el estilo")


@router.put("/layer/{layer_id}/saved/{style_id}/apply")
async def apply_saved_style(
    layer_id: int,
    style_id: int,
    user: dict = Depends(get_current_user)
):
    with get_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        try:
            cursor.execute(
                "SELECT style_config FROM public.layer_styles WHERE style_id = %s AND layer_id = %s",
                (style_id, layer_id)
            )
            saved_style = cursor.fetchone()
            if not saved_style:
                raise HTTPException(status_code=404, detail="Estilo o capa no encontrada")
            style_config = saved_style["style_config"]
            cursor.execute(
                """
                UPDATE public.layers
                SET style_config = %s, updated_at = CURRENT_TIMESTAMP
                WHERE layer_id = %s RETURNING layer_id
                """,
                (Json(style_config), layer_id)
            )
            result = cursor.fetchone()
            if not result:
                conn.rollback()
                raise HTTPException(status_code=404, detail="Capa no encontrada")
            conn.commit()
            cursor.close()
            return {
                "success": True,
                "message": "Estilo aplicado correctamente",
                "layer_id": layer_id,
                "style_config": style_config
            }
        except HTTPException:
            conn.rollback()
            raise
        except Exception:
            conn.rollback()
            raise HTTPException(status_code=500, detail="Error al aplicar el estilo guardado")


@router.delete("/saved/{style_id}")
async def delete_saved_style(
    style_id: int,
    user: dict = Depends(get_current_user)
):
    with get_connection() as conn:
        cursor = conn.cursor()
        try:
            cursor.execute(
                "DELETE FROM public.layer_styles WHERE style_id = %s RETURNING style_id",
                (style_id,)
            )
            result = cursor.fetchone()
            if not result:
                conn.rollback()
                raise HTTPException(status_code=404, detail="Estilo no encontrado")
            conn.commit()
            cursor.close()
            return {"success": True, "message": "Estilo eliminado correctamente"}
        except HTTPException:
            conn.rollback()
            raise
        except Exception:
            conn.rollback()
            raise HTTPException(status_code=500, detail="Error al eliminar el estilo")


@router.put("/saved/{style_id}/favorite")
async def toggle_favorite_style(
    style_id: int,
    user: dict = Depends(get_current_user)
):
    with get_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        try:
            cursor.execute(
                """
                UPDATE public.layer_styles
                SET is_favorite = NOT is_favorite, updated_at = CURRENT_TIMESTAMP
                WHERE style_id = %s RETURNING is_favorite
                """,
                (style_id,)
            )
            result = cursor.fetchone()
            if not result:
                conn.rollback()
                raise HTTPException(status_code=404, detail="Estilo no encontrado")
            conn.commit()
            cursor.close()
            return {"success": True, "is_favorite": result["is_favorite"]}
        except HTTPException:
            conn.rollback()
            raise
        except Exception:
            conn.rollback()
            raise HTTPException(status_code=500, detail="Error al actualizar el favorito")