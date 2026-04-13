import os
import re
import psycopg2
import psycopg2.extras
import psycopg2.pool
from psycopg2 import sql
from urllib.parse import urlparse
from fastapi import HTTPException
from typing import List, Dict, Any, Optional, Tuple
from contextlib import contextmanager
import json


DATABASE_URL = os.getenv("DATABASE_URL")
CONFIG_DATABASE_URL = os.getenv("CONFIG_DATABASE_URL")

_main_pool: psycopg2.pool.ThreadedConnectionPool = None
_config_pool: psycopg2.pool.ThreadedConnectionPool = None

_ALLOWED_SCHEMAS = frozenset({
    'public', 'bca', 'cartografia', 'andalucia', 'datos', 'capas',
    'restitution', 'edicion', 'produccion'
})

_ALLOWED_SRIDS = frozenset({4326, 25828, 25829, 25830, 25831, 32628, 32629, 32630})

_IDENTIFIER_RE = re.compile(r'^[a-zA-Z_][a-zA-Z0-9_]*$')

_STATIC_FEATURES_TEMPLATE = (
    "SELECT ST_AsGeoJSON(ST_Transform({geom},4326)::geometry,6,0)::json AS geometry,"
    " json_build_object({pairs}) AS properties"
    " FROM {schema}.{table} {where} LIMIT {limit} OFFSET {offset}"
)

_STATIC_COUNT_TEMPLATE = (
    "SELECT COUNT(*) AS total FROM {schema}.{table} {where}"
)

_STATIC_BBOX_TEMPLATE = (
    "SELECT ST_XMin(e) AS minx, ST_YMin(e) AS miny,"
    " ST_XMax(e) AS maxx, ST_YMax(e) AS maxy"
    " FROM (SELECT ST_Extent({geom}) AS e FROM {schema}.{table}) AS sub"
)

_STATIC_COLUMNS_QUERY = (
    "SELECT column_name FROM information_schema.columns"
    " WHERE table_schema = %s AND table_name = %s AND column_name != %s"
    " ORDER BY ordinal_position"
)


def _parse_dsn(url: str) -> dict:
    result = urlparse(url)
    return {
        "dbname": result.path[1:],
        "user": result.username,
        "password": result.password,
        "host": result.hostname,
        "port": result.port
    }


def init_db_pools() -> None:
    """Inicializa los pools de conexiones. Llamar al arranque de la app."""
    global _main_pool, _config_pool
    if DATABASE_URL:
        _main_pool = psycopg2.pool.ThreadedConnectionPool(
            minconn=2, maxconn=10, **_parse_dsn(DATABASE_URL)
        )
    config_url = CONFIG_DATABASE_URL or DATABASE_URL
    if config_url:
        _config_pool = psycopg2.pool.ThreadedConnectionPool(
            minconn=2, maxconn=10, **_parse_dsn(config_url)
        )


def close_db_pools() -> None:
    """Cierra los pools al apagar la app."""
    global _main_pool, _config_pool
    if _main_pool:
        _main_pool.closeall()
    if _config_pool:
        _config_pool.closeall()


@contextmanager
def get_connection():
    """Context manager — devuelve conexión del pool y la libera al salir."""
    if not _main_pool:
        raise HTTPException(status_code=500, detail="Pool de BD no inicializado")
    conn = None
    try:
        conn = _main_pool.getconn()
        yield conn
    except psycopg2.pool.PoolError:
        raise HTTPException(status_code=503, detail="Sin conexiones disponibles — intenta de nuevo")
    except Exception:
        raise HTTPException(status_code=500, detail="Error de conexión a la base de datos de explotación")
    finally:
        if conn:
            _main_pool.putconn(conn)


@contextmanager
def get_config_connection():
    """Context manager — devuelve conexión del pool de config y la libera al salir."""
    if not _config_pool:
        raise HTTPException(status_code=500, detail="Pool de BD de configuración no inicializado")
    conn = None
    try:
        conn = _config_pool.getconn()
        yield conn
    except psycopg2.pool.PoolError:
        raise HTTPException(status_code=503, detail="Sin conexiones disponibles — intenta de nuevo")
    except Exception:
        raise HTTPException(status_code=500, detail="Error de conexión a la base de datos de configuración")
    finally:
        if conn:
            _config_pool.putconn(conn)


def get_all_projects(active_only: bool = True) -> List[Dict[str, Any]]:
    with get_config_connection() as conn:
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        try:
            if active_only:
                cursor.execute("SELECT project_id, project_code, project_name, description, is_active, created_at, updated_at FROM projects WHERE is_active = TRUE ORDER BY project_code")
            else:
                cursor.execute("SELECT project_id, project_code, project_name, description, is_active, created_at, updated_at FROM projects ORDER BY project_code")
            return [dict(row) for row in cursor.fetchall()]
        finally:
            cursor.close()


def get_project_by_code(project_code: str) -> Optional[Dict[str, Any]]:
    with get_config_connection() as conn:
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        try:
            cursor.execute("""
                SELECT project_id, project_code, project_name,
                       description, is_active, created_at, updated_at
                FROM projects
                WHERE project_code = %s
            """, (project_code,))
            result = cursor.fetchone()
            if not result:
                raise HTTPException(status_code=404, detail=f"Proyecto '{project_code}' no encontrado")
            return dict(result)
        finally:
            cursor.close()


def get_project_data_sources(project_id: int) -> List[Dict[str, Any]]:
    with get_config_connection() as conn:
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        try:
            cursor.execute("""
                SELECT source_id, project_id, source_name, db_host, db_port,
                       db_name, db_schema, db_user, geoserver_workspace, is_active
                FROM project_data_sources
                WHERE project_id = %s AND is_active = true
                ORDER BY source_name
            """, (project_id,))
            return [dict(row) for row in cursor.fetchall()]
        finally:
            cursor.close()


def get_project_stats(project_code: str) -> Dict[str, Any]:
    with get_config_connection() as conn:
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        try:
            cursor.execute("SELECT project_id, project_code, project_name FROM projects WHERE project_code = %s", (project_code,))
            project = cursor.fetchone()
            if not project:
                raise HTTPException(status_code=404, detail=f"Proyecto '{project_code}' no encontrado")
            project_id = project['project_id']
            cursor.execute("SELECT COUNT(*) as total FROM layer_groups WHERE project_id = %s", (project_id,))
            total_groups = cursor.fetchone()['total']
            cursor.execute("SELECT COUNT(*) as total FROM layer_groups WHERE project_id = %s AND parent_group_id IS NULL", (project_id,))
            total_root_groups = cursor.fetchone()['total']
            cursor.execute("""
                SELECT COUNT(*) as total FROM layers l
                INNER JOIN layer_groups lg ON l.group_id = lg.group_id
                WHERE lg.project_id = %s
            """, (project_id,))
            total_layers = cursor.fetchone()['total']
            cursor.execute("""
                SELECT layer_type, COUNT(*) as count
                FROM layers l
                INNER JOIN layer_groups lg ON l.group_id = lg.group_id
                WHERE lg.project_id = %s AND layer_type IS NOT NULL
                GROUP BY layer_type ORDER BY count DESC
            """, (project_id,))
            layer_types = {row['layer_type']: row['count'] for row in cursor.fetchall()}
            return {
                "project_code": project['project_code'],
                "project_name": project['project_name'],
                "total_groups": total_groups,
                "total_root_groups": total_root_groups,
                "total_layers": total_layers,
                "layers_by_type": layer_types
            }
        finally:
            cursor.close()


def get_layer_groups_flat(project_id: int) -> List[Dict[str, Any]]:
    with get_config_connection() as conn:
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        try:
            cursor.execute("""
                SELECT group_id, group_code, group_name, description,
                       parent_group_id, display_order, is_expanded, icon
                FROM layer_groups
                WHERE project_id = %s
                ORDER BY display_order, group_name
            """, (project_id,))
            return [dict(row) for row in cursor.fetchall()]
        finally:
            cursor.close()


def get_layer_groups_hierarchy(project_id: int) -> List[Dict[str, Any]]:
    with get_config_connection() as conn:
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        try:
            cursor.execute("""
                SELECT lg.group_id, lg.group_code, lg.group_name, lg.description,
                       lg.parent_group_id, lg.display_order, lg.is_expanded, lg.icon,
                       COUNT(l.layer_id) as layer_count
                FROM layer_groups lg
                LEFT JOIN layers l ON lg.group_id = l.group_id
                WHERE lg.project_id = %s
                GROUP BY lg.group_id
                ORDER BY lg.display_order, lg.group_name
            """, (project_id,))
            all_groups = [dict(row) for row in cursor.fetchall()]
            groups_by_id = {g['group_id']: {**g, 'children': []} for g in all_groups}
            root_groups = []
            for group in all_groups:
                if group['parent_group_id'] is None:
                    root_groups.append(groups_by_id[group['group_id']])
                else:
                    parent = groups_by_id.get(group['parent_group_id'])
                    if parent:
                        parent['children'].append(groups_by_id[group['group_id']])
            return root_groups
        finally:
            cursor.close()


def get_layers_by_project(project_code: str) -> List[Dict[str, Any]]:
    with get_config_connection() as conn:
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        try:
            cursor.execute("""
                SELECT l.layer_id, l.layer_code, l.layer_name, l.group_id,
                       l.postgis_schema, l.postgis_table, l.layer_type, l.visible_by_default
                FROM layers l
                INNER JOIN layer_groups lg ON l.group_id = lg.group_id
                INNER JOIN projects p ON lg.project_id = p.project_id
                WHERE p.project_code = %s
                ORDER BY l.layer_name
            """, (project_code,))
            return [dict(row) for row in cursor.fetchall()]
        finally:
            cursor.close()


def get_layer_by_id(layer_id: int) -> Dict[str, Any]:
    with get_config_connection() as conn:
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        try:
            cursor.execute("""
                SELECT layer_id, group_id, layer_code, layer_name, description,
                       layer_type, postgis_schema, postgis_table, geometry_column,
                       srid, visible_by_default, min_zoom, max_zoom,
                       opacity_default, style_config, created_at, updated_at
                FROM layers
                WHERE layer_id = %s
            """, (layer_id,))
            result = cursor.fetchone()
            if not result:
                raise HTTPException(status_code=404, detail=f"Capa con ID {layer_id} no encontrada")
            layer = dict(result)
            if layer.get('style_config') and isinstance(layer['style_config'], str):
                try:
                    layer['style_config'] = json.loads(layer['style_config'])
                except Exception:
                    pass
            return layer
        finally:
            cursor.close()


def _resolve_layer_identifiers(layer_id: int) -> Tuple[str, str, str, int]:
    layer = get_layer_by_id(layer_id)
    raw_schema = layer.get('postgis_schema', '')
    raw_table = layer.get('postgis_table', '')
    raw_geom = layer.get('geometry_column', '')
    raw_srid = layer.get('srid') or 25830

    if raw_schema not in _ALLOWED_SCHEMAS:
        raise HTTPException(status_code=400, detail="Schema no permitido")
    if not raw_table or not _IDENTIFIER_RE.match(raw_table):
        raise HTTPException(status_code=400, detail="Tabla no permitida")
    if not raw_geom or not _IDENTIFIER_RE.match(raw_geom):
        raise HTTPException(status_code=400, detail="Columna de geometria no permitida")
    srid = int(raw_srid)
    if srid not in _ALLOWED_SRIDS:
        raise HTTPException(status_code=400, detail="SRID no permitido")

    return raw_schema, raw_table, raw_geom, srid


def _build_filter_clauses(filters_str: str, allowed_columns: list):
    where_clauses = []
    if not filters_str:
        return where_clauses
    try:
        filters_list = json.loads(filters_str)
        for filter_obj in filters_list:
            field = filter_obj.get('field')
            operator = filter_obj.get('operator')
            value = filter_obj.get('value', '')
            if not field or not operator or field not in allowed_columns:
                continue
            if not _IDENTIFIER_RE.match(field):
                continue
            field_id = sql.Identifier(field)
            if operator == 'equal':
                where_clauses.append(sql.SQL("{f}::text = {v}").format(f=field_id, v=sql.Literal(str(value))))
            elif operator == 'not_equal':
                where_clauses.append(sql.SQL("{f}::text != {v}").format(f=field_id, v=sql.Literal(str(value))))
            elif operator == 'contains':
                where_clauses.append(sql.SQL("{f}::text ILIKE {v}").format(f=field_id, v=sql.Literal(f"%{value}%")))
            elif operator == 'not_contains':
                where_clauses.append(sql.SQL("{f}::text NOT ILIKE {v}").format(f=field_id, v=sql.Literal(f"%{value}%")))
            elif operator == 'starts_with':
                where_clauses.append(sql.SQL("{f}::text ILIKE {v}").format(f=field_id, v=sql.Literal(f"{value}%")))
            elif operator == 'ends_with':
                where_clauses.append(sql.SQL("{f}::text ILIKE {v}").format(f=field_id, v=sql.Literal(f"%{value}")))
            elif operator == 'greater_than':
                where_clauses.append(sql.SQL("{f}::numeric > {v}").format(f=field_id, v=sql.Literal(float(value))))
            elif operator == 'less_than':
                where_clauses.append(sql.SQL("{f}::numeric < {v}").format(f=field_id, v=sql.Literal(float(value))))
            elif operator == 'greater_equal':
                where_clauses.append(sql.SQL("{f}::numeric >= {v}").format(f=field_id, v=sql.Literal(float(value))))
            elif operator == 'less_equal':
                where_clauses.append(sql.SQL("{f}::numeric <= {v}").format(f=field_id, v=sql.Literal(float(value))))
            elif operator == 'is_empty':
                where_clauses.append(sql.SQL("({f} IS NULL OR {f}::text = '')").format(f=field_id))
            elif operator == 'is_not_empty':
                where_clauses.append(sql.SQL("({f} IS NOT NULL AND {f}::text != '')").format(f=field_id))
    except (json.JSONDecodeError, ValueError):
        pass
    return where_clauses


def _compile_features_query(
    conn,
    schema: str,
    table: str,
    geom_column: str,
    srid: int,
    allowed_columns: List[str],
    bbox: Optional[str],
    filters: Optional[str],
    limit: int,
    offset: int
) -> str:
    where_clauses = []

    if bbox:
        try:
            minx, miny, maxx, maxy = map(float, bbox.split(','))
            where_clauses.append(
                sql.SQL(
                    "ST_Intersects({geom}, ST_Transform("
                    "ST_MakeEnvelope({minx},{miny},{maxx},{maxy},4326),{srid}))"
                ).format(
                    geom=sql.Identifier(geom_column),
                    minx=sql.Literal(minx),
                    miny=sql.Literal(miny),
                    maxx=sql.Literal(maxx),
                    maxy=sql.Literal(maxy),
                    srid=sql.Literal(srid)
                )
            )
        except ValueError:
            pass

    filter_clauses = _build_filter_clauses(filters, allowed_columns)
    where_clauses.extend(filter_clauses)

    where_sql = (
        sql.SQL("WHERE ") + sql.SQL(" AND ").join(where_clauses)
        if where_clauses else sql.SQL("")
    )

    property_pairs = sql.SQL(", ").join([
        sql.SQL("{lit}, {col}::text").format(
            lit=sql.Literal(col),
            col=sql.Identifier(col)
        ) for col in allowed_columns
    ])

    features_query = sql.SQL(_STATIC_FEATURES_TEMPLATE).format(
        geom=sql.Identifier(geom_column),
        pairs=property_pairs,
        schema=sql.Identifier(schema),
        table=sql.Identifier(table),
        where=where_sql,
        limit=sql.Literal(limit),
        offset=sql.Literal(offset)
    )

    count_query = sql.SQL(_STATIC_COUNT_TEMPLATE).format(
        schema=sql.Identifier(schema),
        table=sql.Identifier(table),
        where=where_sql
    )

    return (
        features_query.as_string(conn),
        count_query.as_string(conn)
    )


def _compile_bbox_query(conn, schema: str, table: str, geom_column: str) -> str:
    return sql.SQL(_STATIC_BBOX_TEMPLATE).format(
        geom=sql.Identifier(geom_column),
        schema=sql.Identifier(schema),
        table=sql.Identifier(table)
    ).as_string(conn)


def get_layer_features(
    layer_id: int,
    bbox: Optional[str] = None,
    limit: int = 5000,
    offset: int = 0,
    simplify_tolerance: Optional[float] = None,
    filters: Optional[str] = None
) -> Dict[str, Any]:
    schema, table, geom_column, srid = _resolve_layer_identifiers(layer_id)

    with get_connection() as conn:
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        try:
            cursor.execute(_STATIC_COLUMNS_QUERY, (schema, table, geom_column))
            allowed_columns = [row['column_name'] for row in cursor.fetchall()]

            features_str, count_str = _compile_features_query(
                conn, schema, table, geom_column, srid,
                allowed_columns, bbox, filters, limit, offset
            )

            cursor.execute(features_str)
            rows = cursor.fetchall()

            features = [
                {
                    "type": "Feature",
                    "id": idx + offset,
                    "geometry": row['geometry'],
                    "properties": row['properties']
                }
                for idx, row in enumerate(rows)
            ]

            cursor.execute(count_str)
            total_features = cursor.fetchone()['total']

            return {
                "type": "FeatureCollection",
                "features": features,
                "crs": {"type": "name", "properties": {"name": "EPSG:4326"}},
                "total_features": total_features
            }
        finally:
            cursor.close()


def get_layer_bbox(layer_id: int) -> Dict[str, Any]:
    schema, table, geom_column, _ = _resolve_layer_identifiers(layer_id)

    with get_connection() as conn:
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        try:
            bbox_str = _compile_bbox_query(conn, schema, table, geom_column)
            cursor.execute(bbox_str)
            result = cursor.fetchone()

            if not result or result['minx'] is None:
                raise HTTPException(
                    status_code=404,
                    detail=f"No se pudo calcular el bbox de la capa {layer_id}"
                )

            return {
                "minx": float(result['minx']),
                "miny": float(result['miny']),
                "maxx": float(result['maxx']),
                "maxy": float(result['maxy'])
            }
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=500, detail="Error de conexión a la base de datos")
        finally:
            cursor.close()


def execute_query(query: sql.Composable, params: Tuple = None) -> List[Dict[str, Any]]:
    if not isinstance(query, sql.Composable):
        raise ValueError("execute_query solo acepta objetos sql.Composable")
    with get_connection() as conn:
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        try:
            cursor.execute(query.as_string(conn))
            return [dict(row) for row in cursor.fetchall()]
        finally:
            cursor.close()