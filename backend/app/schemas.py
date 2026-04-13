# backend/app/schemas.py
"""
Schemas Pydantic para validación de datos y documentación automática en Swagger.

Estos schemas definen la estructura de los datos que entran y salen de la API.
No son modelos de base de datos (no usamos ORM), sino validadores y documentadores.

CAMBIOS RECIENTES (2026-01-22):
✅ Corregido: ProjectStats ahora usa 'layers_by_type' en lugar de 'layers_by_geometry_type'
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime


# ============================================================================
# SCHEMAS DE PROYECTOS
# ============================================================================

class ProjectResponse(BaseModel):
    """
    Respuesta básica de un proyecto.
    Usado en: GET /api/projects (lista de proyectos)
    """
    project_id: int = Field(..., description="ID único del proyecto")
    project_code: str = Field(..., description="Código único (ej: 'bca', 'telefonica')")
    project_name: str = Field(..., description="Nombre descriptivo del proyecto")
    description: Optional[str] = Field(None, description="Descripción del proyecto")
    is_active: bool = Field(..., description="Si el proyecto está activo")
    created_at: datetime = Field(..., description="Fecha de creación")
    updated_at: datetime = Field(..., description="Fecha de última actualización")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "project_id": 1,
                "project_code": "bca",
                "project_name": "Base Cartográfica Andaluza",
                "description": "Cartografía oficial de Andalucía",
                "is_active": True,
                "created_at": "2026-01-22T08:00:00",
                "updated_at": "2026-01-22T08:00:00"
            }
        }
    )


class DataSourceResponse(BaseModel):
    """
    Fuente de datos (schema PostgreSQL) asociada a un proyecto.
    """
    source_id: int = Field(..., description="ID de la fuente")
    postgis_schema: str = Field(..., description="Schema de PostgreSQL (ej: 'bca', 'estaciones')")
    is_primary: bool = Field(..., description="Si es el schema principal del proyecto")
    description: Optional[str] = Field(None, description="Descripción de la fuente")


class ProjectDetail(ProjectResponse):
    """
    Detalle completo de un proyecto (incluye fuentes de datos y estadísticas).
    Usado en: GET /api/projects/{code}
    """
    data_sources: List[DataSourceResponse] = Field(
        default_factory=list, 
        description="Schemas de PostgreSQL asociados"
    )
    total_groups: int = Field(0, description="Total de grupos de capas")
    total_layers: int = Field(0, description="Total de capas")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "project_id": 1,
                "project_code": "bca",
                "project_name": "Base Cartográfica Andaluza",
                "description": "Cartografía oficial de Andalucía",
                "is_active": True,
                "created_at": "2026-01-22T08:00:00",
                "updated_at": "2026-01-22T08:00:00",
                "data_sources": [
                    {
                        "source_id": 1,
                        "postgis_schema": "bca",
                        "is_primary": True,
                        "description": "Datos cartográficos BCA"
                    }
                ],
                "total_groups": 24,
                "total_layers": 165
            }
        }
    )


class ProjectStats(BaseModel):
    """
    Estadísticas de un proyecto.
    Usado en: GET /api/projects/{code}/stats
    
    ✅ CORREGIDO (2026-01-22): Ahora usa 'layers_by_type' en lugar de 'layers_by_geometry_type'
    porque la tabla layers tiene la columna 'layer_type' (vector, raster, wms)
    pero NO tiene 'geometry_type'.
    """
    project_code: str
    project_name: str
    total_groups: int = Field(..., description="Total de grupos (incluyendo subgrupos)")
    total_root_groups: int = Field(..., description="Total de grupos raíz (sin padre)")
    total_layers: int = Field(..., description="Total de capas")
    layers_by_type: Dict[str, int] = Field(
        default_factory=dict,
        description="Capas agrupadas por tipo (vector, raster, wms, etc.)"
    )
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "project_code": "bca",
                "project_name": "Base Cartográfica Andaluza",
                "total_groups": 24,
                "total_root_groups": 9,
                "total_layers": 165,
                "layers_by_type": {
                    "vector": 150,
                    "wms": 10,
                    "raster": 5
                }
            }
        }
    )


# ============================================================================
# SCHEMAS DE GRUPOS DE CAPAS
# ============================================================================

class LayerGroupFlat(BaseModel):
    """
    Grupo de capas sin jerarquía (plano).
    Útil para listados simples.
    """
    group_id: int = Field(..., description="ID único del grupo")
    group_code: str = Field(..., description="Código único del grupo")
    group_name: str = Field(..., description="Nombre descriptivo")
    description: Optional[str] = Field(None, description="Descripción del grupo")
    parent_group_id: Optional[int] = Field(None, description="ID del grupo padre (null = raíz)")
    display_order: int = Field(..., description="Orden de visualización")
    is_expanded: bool = Field(True, description="Si se muestra expandido por defecto")
    icon: Optional[str] = Field(None, description="Icono del grupo (ej: 'radio', 'map-pin')")


class LayerGroupResponse(LayerGroupFlat):
    """
    Grupo de capas CON jerarquía recursiva.
    Usado en: GET /api/projects/{code}/groups
    
    IMPORTANTE: Este schema se auto-referencia para crear árboles de grupos.
    """
    children: List['LayerGroupResponse'] = Field(
        default_factory=list,
        description="Subgrupos anidados"
    )
    layer_count: int = Field(0, description="Número de capas directas en este grupo")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "group_id": 1,
                "group_code": "geodesia",
                "group_name": "Geodesia",
                "description": "Redes geodésicas y puntos de control",
                "parent_group_id": None,
                "display_order": 1,
                "is_expanded": False,
                "icon": "map-pin",
                "children": [
                    {
                        "group_id": 10,
                        "group_code": "geodesia_redes",
                        "group_name": "Redes Geodésicas",
                        "parent_group_id": 1,
                        "display_order": 1,
                        "is_expanded": True,
                        "icon": "grid",
                        "children": [],
                        "layer_count": 2
                    }
                ],
                "layer_count": 0
            }
        }
    )


# ============================================================================
# SCHEMAS DE CAPAS
# ============================================================================

class LayerListItem(BaseModel):
    """
    Resumen de una capa (para listados).
    Usado en: GET /api/projects/{code}/layers
    """
    layer_id: int = Field(..., description="ID único de la capa")
    layer_code: str = Field(..., description="Código único de la capa")
    layer_name: str = Field(..., description="Nombre descriptivo")
    group_id: int = Field(..., description="ID del grupo al que pertenece")
    postgis_schema: str = Field(..., description="Schema de PostgreSQL")
    postgis_table: str = Field(..., description="Tabla con los datos")
    layer_type: Optional[str] = Field(None, description="Tipo de capa (vector, raster, wms)")
    visible_by_default: bool = Field(False, description="Si se muestra por defecto")


class LayerResponse(LayerListItem):
    """
    Información COMPLETA de una capa.
    Usado en: GET /api/layers/{id}
    """
    description: Optional[str] = Field(None, description="Descripción de la capa")
    geometry_column: str = Field(..., description="Nombre de la columna de geometría")
    srid: Optional[int] = Field(None, description="Sistema de referencia espacial")
    min_zoom: Optional[int] = Field(None, description="Zoom mínimo de visualización")
    max_zoom: Optional[int] = Field(None, description="Zoom máximo de visualización")
    opacity_default: Optional[int] = Field(100, description="Opacidad por defecto (0-100)")
    style_config: Optional[Dict[str, Any]] = Field(
        None, 
        description="Configuración de estilo en formato JSON"
    )
    created_at: datetime = Field(..., description="Fecha de creación")
    updated_at: datetime = Field(..., description="Fecha de actualización")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "layer_id": 1,
                "layer_code": "TM1_0142_PuntoGNSS_C",
                "layer_name": "Punto GNSS",
                "group_id": 10,
                "postgis_schema": "bca",
                "postgis_table": "TM1_0142_PuntoGNSS_C",
                "layer_type": "vector",
                "geometry_column": "the_geom",
                "srid": 25830,
                "visible_by_default": False,
                "min_zoom": 10,
                "max_zoom": 20,
                "opacity_default": 100,
                "style_config": {
                    "fill": {"color": "#4DABF7", "opacity": 0.3},
                    "stroke": {"color": "#1971C2", "width": 2}
                },
                "created_at": "2026-01-22T08:00:00",
                "updated_at": "2026-01-22T08:00:00"
            }
        }
    )


# ============================================================================
# SCHEMAS DE FEATURES (GeoJSON)
# ============================================================================

class BBox(BaseModel):
    """
    Bounding Box (extensión espacial).
    Formato: [minx, miny, maxx, maxy]
    """
    minx: float = Field(..., description="Coordenada X mínima")
    miny: float = Field(..., description="Coordenada Y mínima")
    maxx: float = Field(..., description="Coordenada X máxima")
    maxy: float = Field(..., description="Coordenada Y máxima")
    srid: int = Field(25830, description="Sistema de referencia espacial")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "minx": 100000.0,
                "miny": 4000000.0,
                "maxx": 200000.0,
                "maxy": 4100000.0,
                "srid": 25830
            }
        }
    )


class GeometryGeoJSON(BaseModel):
    """
    Geometría en formato GeoJSON.
    """
    type: str = Field(..., description="Tipo de geometría (Point, LineString, Polygon, etc.)")
    coordinates: Any = Field(..., description="Coordenadas (formato varía según tipo)")


class FeatureGeoJSON(BaseModel):
    """
    Feature individual en formato GeoJSON.
    """
    type: str = Field(default="Feature", description="Tipo (siempre 'Feature')")
    id: Optional[Any] = Field(None, description="ID del feature")
    geometry: Optional[GeometryGeoJSON] = Field(None, description="Geometría del feature")
    properties: Dict[str, Any] = Field(
        default_factory=dict,
        description="Propiedades alfanuméricas del feature"
    )


class FeatureCollectionResponse(BaseModel):
    """
    Colección de features en formato GeoJSON estándar.
    Usado en: GET /api/layers/{id}/features
    
    Este es el formato estándar GeoJSON que OpenLayers puede consumir directamente.
    """
    type: str = Field(default="FeatureCollection", description="Tipo (siempre 'FeatureCollection')")
    features: List[FeatureGeoJSON] = Field(
        default_factory=list,
        description="Array de features"
    )
    crs: Optional[Dict[str, Any]] = Field(
        None,
        description="Sistema de referencia de coordenadas"
    )
    bbox: Optional[List[float]] = Field(
        None,
        description="Bounding box de toda la colección [minx, miny, maxx, maxy]"
    )
    total_features: Optional[int] = Field(
        None,
        description="Total de features (si está paginado)"
    )
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "type": "FeatureCollection",
                "features": [
                    {
                        "type": "Feature",
                        "id": 1,
                        "geometry": {
                            "type": "Point",
                            "coordinates": [150000.0, 4050000.0]
                        },
                        "properties": {
                            "codigo": "GNSS001",
                            "nombre": "Estación GNSS de Sevilla",
                            "tipo": "Permanente"
                        }
                    }
                ],
                "crs": {
                    "type": "name",
                    "properties": {
                        "name": "EPSG:25830"
                    }
                },
                "bbox": [100000.0, 4000000.0, 200000.0, 4100000.0],
                "total_features": 1
            }
        }
    )


# ============================================================================
# SCHEMAS DE BÚSQUEDA Y FILTROS
# ============================================================================

class LayerSearchParams(BaseModel):
    """
    Parámetros de búsqueda para filtrar features de una capa.
    Usado como query params en: GET /api/layers/{id}/features
    """
    bbox: Optional[str] = Field(
        None,
        description="Bounding box en formato 'minx,miny,maxx,maxy'"
    )
    limit: Optional[int] = Field(
        100,
        description="Número máximo de features a devolver",
        ge=1,
        le=10000
    )
    offset: Optional[int] = Field(
        0,
        description="Offset para paginación",
        ge=0
    )
    simplify_tolerance: Optional[float] = Field(
        None,
        description="Tolerancia de simplificación de geometrías (en unidades del SRID)",
        ge=0
    )
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "bbox": "100000,4000000,200000,4100000",
                "limit": 500,
                "offset": 0,
                "simplify_tolerance": 10.0
            }
        }
    )


# ============================================================================
# SCHEMAS PARA ADMINISTRACIÓN (Futura Fase 5)
# ============================================================================

class ProjectCreate(BaseModel):
    """
    Schema para crear un nuevo proyecto (solo admin).
    NOTA: Esto es para la futura fase de administración.
    """
    project_code: str = Field(..., min_length=2, max_length=50)
    project_name: str = Field(..., min_length=3, max_length=200)
    description: Optional[str] = None
    is_active: bool = Field(default=True)


class LayerCreate(BaseModel):
    """
    Schema para crear una nueva capa (solo admin).
    NOTA: Esto es para la futura fase de administración.
    """
    group_id: int
    layer_code: str = Field(..., min_length=2, max_length=100)
    layer_name: str = Field(..., min_length=2, max_length=200)
    description: Optional[str] = None
    postgis_schema: str = Field(..., min_length=2, max_length=100)
    postgis_table: str = Field(..., min_length=2, max_length=100)
    geometry_column: str = Field(default="the_geom")
    layer_type: Optional[str] = Field(default="vector")
    srid: Optional[int] = Field(default=25830)
    visible_by_default: bool = Field(default=False)
    min_zoom: Optional[int] = Field(None, ge=0, le=22)
    max_zoom: Optional[int] = Field(None, ge=0, le=22)
    style_config: Optional[Dict[str, Any]] = None


# ============================================================================
# SCHEMAS DE RESPUESTAS GENÉRICAS
# ============================================================================

class SuccessResponse(BaseModel):
    """
    Respuesta genérica de éxito.
    """
    status: str = Field(default="success")
    message: str
    data: Optional[Dict[str, Any]] = None


class ErrorResponse(BaseModel):
    """
    Respuesta genérica de error.
    """
    status: str = Field(default="error")
    message: str
    detail: Optional[str] = None
    error_code: Optional[str] = None


# ============================================================================
# ACTUALIZAR FORWARD REFERENCES (Para recursión)
# ============================================================================

# Esto es necesario para que LayerGroupResponse pueda referenciarse a sí mismo
LayerGroupResponse.model_rebuild()
