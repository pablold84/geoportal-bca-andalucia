from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from app.security import get_current_user
from app.schemas import (
    LayerGroupResponse,
    LayerListItem,
    LayerResponse,
    FeatureCollectionResponse,
    BBox
)
from app.db import (
    get_project_by_code,
    get_layer_groups_hierarchy,
    get_layers_by_project,
    get_layer_by_id,
    get_layer_features,
    get_layer_bbox
)

router = APIRouter(
    tags=["Layers"],
    responses={
        401: {"description": "No autenticado"},
        403: {"description": "Sin permisos suficientes"},
        404: {"description": "Recurso no encontrado"}
    }
)


@router.get("/projects/{project_code}/groups", response_model=List[LayerGroupResponse])
def get_layer_groups_tree(
    project_code: str,
    user: dict = Depends(get_current_user)
):
    try:
        project = get_project_by_code(project_code)
        groups_tree = get_layer_groups_hierarchy(project["project_id"])
        return groups_tree
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Error al obtener los grupos de capas del proyecto"
        )


@router.get("/projects/{project_code}/layers", response_model=List[LayerListItem])
def get_project_layers(
    project_code: str,
    user: dict = Depends(get_current_user)
):
    try:
        project = get_project_by_code(project_code)
        layers = get_layers_by_project(project_code)
        return layers
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Error al obtener las capas del proyecto"
        )


@router.get("/layers/{layer_id}", response_model=LayerResponse)
def get_layer_detail(
    layer_id: int,
    user: dict = Depends(get_current_user)
):
    try:
        layer = get_layer_by_id(layer_id)
        return layer
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Error al obtener el detalle de la capa"
        )


@router.get("/layers/{layer_id}/features", response_model=FeatureCollectionResponse)
def get_layer_features_geojson(
    layer_id: int,
    bbox: Optional[str] = Query(None, description="Bounding box: 'xmin,ymin,xmax,ymax' en EPSG:4326"),
    filters: Optional[str] = Query(None, description="Filtros de atributos en formato JSON"),
    limit: Optional[int] = Query(1000, ge=1, le=10000, description="Máximo número de features (1-10000)"),
    simplify_tolerance: Optional[float] = Query(None, ge=0, description="Tolerancia de simplificación en metros"),
    user: dict = Depends(get_current_user)
):
    try:
        bbox_validated = None
        if bbox:
            try:
                coords = [float(x.strip()) for x in bbox.split(',')]
                if len(coords) != 4:
                    raise ValueError("Debe tener 4 coordenadas")
                bbox_validated = bbox
            except Exception:
                raise HTTPException(
                    status_code=400,
                    detail="Formato de bbox inválido. Usar: 'xmin,ymin,xmax,ymax'"
                )

        feature_collection = get_layer_features(
            layer_id=layer_id,
            bbox=bbox_validated,
            limit=limit,
            simplify_tolerance=simplify_tolerance,
            filters=filters
        )

        return feature_collection

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Error al obtener las features de la capa"
        )


@router.get("/layers/{layer_id}/bbox", response_model=BBox)
def get_layer_bounding_box(
    layer_id: int,
    user: dict = Depends(get_current_user)
):
    try:
        bbox = get_layer_bbox(layer_id)
        return bbox
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Error al obtener el bounding box de la capa"
        )