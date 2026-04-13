from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Any
from datetime import datetime


# Modelos anidados según la estructura del JSON
class DatosEmplazamiento(BaseModel):
    Version_NAP48: Optional[str] = None
    Codigo_Emplazamiento: Optional[str] = None
    Nombre_Emplazamiento: Optional[str] = None
    Propietario_Emplazamiento: Optional[str] = None
    Descripcion_Emplazamiento: Optional[str] = None
    Realizado_por: Optional[str] = None


class DatosInstalacion(BaseModel):
    COC: Optional[str] = None
    Descripcion_Obra: Optional[str] = None
    Fecha_instalacion: Optional[str] = None


class Coordenadas(BaseModel):
    Latitud: Optional[str] = None
    Longitud: Optional[str] = None


class UbicacionEB(BaseModel):
    Direccion: Optional[str] = None
    Provincia: Optional[str] = None
    Ayuntamiento: Optional[str] = None
    Coordenadas: Optional['Coordenadas'] = None


class TipoEmplazamiento(BaseModel):
    Tipo_estacion_Interior_exterior: Optional[str] = None
    Caseta: Optional[str] = None
    Sala_acondicionada: Optional[str] = None
    Instalacion_exterior_azotea_suelotorre: Optional[str] = None
    Emplazamiento_compartido: Optional[str] = None


class DescripcionTrabajos(BaseModel):
    Equipos_Radio: Optional[str] = None
    Toma_de_Tierra: Optional[str] = None
    Suministro_de_Energia: Optional[str] = None
    Transmision: Optional[str] = None
    Alarmas_Externas: Optional[str] = None
    Sistema_Radiante: Optional[str] = None
    Otros: Optional[str] = None


class ConfiguracionItem(BaseModel):
    Suministrador: Optional[str] = None
    ModBastidor_o_Modulos: Optional[str] = None
    N_Bastidores: Optional[str] = None
    Alimentacion: Optional[str] = None
    Configuracion: Optional[str] = None


class EquipoSite(BaseModel):
    Tipo: Optional[str] = None
    Estado: Optional[str] = None
    N_Serie: Optional[str] = None
    Codigo: Optional[str] = None


class ModeloCF(BaseModel):
    Inicial: Optional[str] = None
    Final: Optional[str] = None


class ModeloBaterias(BaseModel):
    Inicial1: Optional[str] = None
    Final1: Optional[str] = None
    Inicial2: Optional[str] = None
    Final2: Optional[str] = None
    Inicial3: Optional[str] = None
    Final3: Optional[str] = None


class NumeroBloques(BaseModel):
    Inicial: Optional[int] = None
    Final: Optional[int] = None


class Equipo1(BaseModel):
    Modelo_de_CF: Optional['ModeloCF'] = None
    Rectificadores_existentes_y_capacidad: Optional['ModeloCF'] = None
    Modelo_de_baterias: Optional['ModeloBaterias'] = None
    Modelo_y_calibre_de_reconectadora: Optional['ModeloCF'] = None
    Tension_de_CF: Optional['ModeloCF'] = None
    Numero_de_bloques: Optional['NumeroBloques'] = None
    Numero_de_elementos_por_bloque: Optional['NumeroBloques'] = None
    Capacidad_de_baterias: Optional['ModeloCF'] = None
    Modelo_Aire_Acondicionado: Optional['ModeloCF'] = None


class SuministroElectricoEB(BaseModel):
    Tension_V: Optional['ModeloCF'] = None
    Valor_ICP: Optional['ModeloCF'] = None
    Monofasico: Optional['ModeloCF'] = None
    Trifasico: Optional['ModeloCF'] = None


class ConsumoRadio(BaseModel):
    Inicial: Optional[int] = None
    Final: Optional[int] = None


class CalculoCCTotal(BaseModel):
    Consumo_Radio: Optional['ConsumoRadio'] = None
    Comsumo_equipos_de_Tx: Optional['ModeloCF'] = None
    Consumo_equipos_otros_operadores: Optional['ModeloCF'] = None
    Consumo_Refles_Repetidores: Optional['ModeloCF'] = None
    Otros: Optional['ModeloCF'] = None
    Capacidad_consumo_baterias_10_pct: Optional['ModeloCF'] = None
    Consumo_total_continua: Optional['ConsumoRadio'] = None


class CalculoAlterna(BaseModel):
    ConsumoTxRBS98: Optional['ModeloCF'] = None
    ConsumoAireAcondicionado: Optional['ModeloCF'] = None
    Otros: Optional['ModeloCF'] = None
    TotalAlterna: Optional['ModeloCF'] = None


class AlimentacionEstacionBase(BaseModel):
    Equipo_1: Optional['Equipo1'] = None
    Suministro_Electrico_EB: Optional['SuministroElectricoEB'] = None
    Calculo_CC_total_W: Optional['CalculoCCTotal'] = None
    CalculoAlterna: Optional['CalculoAlterna'] = None


# Modelo principal de exportación - ACEPTA DICT en lugar de objetos Pydantic
class EstacionExport(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)
    
    DATOS_EMPLAZAMIENTO: Optional[DatosEmplazamiento] = None
    DATOS_INSTALACION: Optional[DatosInstalacion] = None
    UBICACION_EB: Optional[Any] = None  # Acepta dict o objeto
    TIPO_EMPLAZAMIENTO: Optional[TipoEmplazamiento] = None
    DESCRIPCION_TRABAJOS_REALIZADOS: Optional[DescripcionTrabajos] = None
    CONFIGURACION: Optional[List[dict]] = None
    RELACION_DE_EQUIPOS_EN_EL_SITE: Optional[List[EquipoSite]] = None
    ALIMENTACION_DE_LA_ESTACION_BASE: Optional[Any] = None  # Acepta dict o objeto


class EstacionExportWrapper(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True, populate_by_name=True)
    
    json_featuretype: str = "estructura"
    json_data: EstacionExport = Field(alias="json")


# ============================================================================
# SCHEMAS PARA PROYECTOS
# ============================================================================

class ProjectResponse(BaseModel):
    """Schema básico de proyecto para listados"""
    project_id: int
    project_code: str
    project_name: str
    description: Optional[str] = None
    is_active: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DataSource(BaseModel):
    """Schema para fuentes de datos (schemas PostgreSQL)"""
    source_id: int
    project_id: int
    source_name: str
    db_host: Optional[str] = None
    db_port: Optional[int] = None
    db_name: Optional[str] = None
    db_schema: Optional[str] = None
    db_user: Optional[str] = None
    geoserver_workspace: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True


class ProjectDetail(BaseModel):
    """Schema detallado de proyecto con fuentes de datos"""
    project_id: int
    project_code: str
    project_name: str
    description: Optional[str] = None
    is_active: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    data_sources: List[DataSource] = []

    class Config:
        from_attributes = True


class ProjectStats(BaseModel):
    """Schema para estadísticas de proyecto"""
    project_code: str
    project_name: str
    total_groups: int
    total_root_groups: int
    total_layers: int
    layers_by_type: dict = {}

    class Config:
        from_attributes = True

# ============================================================================
# SCHEMAS PARA CAPAS Y GRUPOS
# ============================================================================

class LayerGroupResponse(BaseModel):
    """Schema para grupo de capas"""
    group_id: int
    group_code: str
    group_name: str
    description: Optional[str] = None
    parent_group_id: Optional[int] = None
    display_order: Optional[int] = None
    is_expanded: Optional[bool] = None
    icon: Optional[str] = None
    layer_count: int = 0
    children: List['LayerGroupResponse'] = []

    class Config:
        from_attributes = True


class LayerListItem(BaseModel):
    """Schema básico de capa para listados"""
    layer_id: int
    layer_code: str
    layer_name: str
    group_id: int
    postgis_schema: str
    postgis_table: str
    layer_type: Optional[str] = None
    visible_by_default: Optional[bool] = None

    class Config:
        from_attributes = True


class LayerResponse(BaseModel):
    """Schema completo de capa"""
    layer_id: int
    group_id: int
    layer_code: str
    layer_name: str
    description: Optional[str] = None
    layer_type: Optional[str] = None
    postgis_schema: str
    postgis_table: str
    geometry_column: Optional[str] = None
    srid: Optional[int] = None
    visible_by_default: Optional[bool] = None
    min_zoom: Optional[int] = None
    max_zoom: Optional[int] = None
    opacity_default: Optional[int] = None
    style_config: Optional[dict] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class FeatureCollectionResponse(BaseModel):
    """Schema para GeoJSON FeatureCollection"""
    type: str = "FeatureCollection"
    features: List[dict]
    crs: Optional[dict] = None
    total_features: Optional[int] = None

    class Config:
        from_attributes = True


class BBox(BaseModel):
    """Schema para bounding box"""
    minx: float
    miny: float
    maxx: float
    maxy: float
    srid: int

    class Config:
        from_attributes = True


# Necesario para la recursión de LayerGroupResponse
LayerGroupResponse.model_rebuild()