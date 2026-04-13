from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.db import get_connection
from app.security import get_current_user, require_role
from typing import Optional


router = APIRouter()

# ----------------
# Schemas de actualización
# ----------------
class EstacionBaseUpdate(BaseModel):
    version: str
    codigo_emplazamiento: str

class EstacionBasePatch(BaseModel):
    version: Optional[str] = None
    codigo_emplazamiento: Optional[str] = None  

class UbicacionUpdate(BaseModel):
    direccion: str
    latitud: str  
    longitud: str 

class UbicacionPatch(BaseModel):
    direccion: Optional[str] = None
    latitud: Optional[str] = None  
    longitud: Optional[str] = None      

class DatosEmplazamientoUpdate(BaseModel):
    nombre_emplazamiento: str
    propietario_emplazamiento: str
    descripcion_emplazamiento: str
    realizado_por: str

class DatosEmplazamientoPatch(BaseModel):
    nombre_emplazamiento: Optional[str] = None
    propietario_emplazamiento: Optional[str] = None
    descripcion_emplazamiento: Optional[str] = None
    realizado_por: Optional[str] = None

class TipoEmplazamientoUpdate(BaseModel):
    tipo_estacion: str
    caseta: str
    instalacion_exterior: str
    emplazamiento_compartido: str

class TipoEmplazamientoPatch(BaseModel):    
    tipo_estacion: Optional[str] = None
    caseta: Optional[str] = None
    instalacion_exterior: Optional[str] = None
    emplazamiento_compartido: Optional[str] = None  

class DatosInstalacionUpdate(BaseModel):
    coc: str

class DatosInstalacionPatch(BaseModel):
    coc: Optional[str] = None   

class ConfiguracionEquipoUpdate(BaseModel):
    suministro_ini: str
    mod_bastidor_modulos_ini: str

class ConfiguracionEquipoPatch(BaseModel):
    suministro_ini: Optional[str] = None
    mod_bastidor_modulos_ini: Optional[str] = None  

class AlimentacionEstacionUpdate(BaseModel):
    modelo_cf_ini: str
    num_rectificadores_capacidad_ini: str
    mod_baterias_ini: str

class AlimentacionEstacionPatch(BaseModel):
    modelo_cf_ini: Optional[str] = None
    num_rectificadores_capacidad_ini: Optional[str] = None
    mod_baterias_ini: Optional[str] = None  

class EstacionUpdate(BaseModel):
    estacion: EstacionBaseUpdate
    ubicacion: UbicacionUpdate
    datos_emplazamiento: DatosEmplazamientoUpdate
    tipo_emplazamiento: TipoEmplazamientoUpdate
    datos_instalacion: DatosInstalacionUpdate
    configuracion_equipo: ConfiguracionEquipoUpdate
    alimentacion_estacion: AlimentacionEstacionUpdate

class EstacionPatch(BaseModel):
    estacion: Optional[EstacionBasePatch] = None
    ubicacion: Optional[UbicacionPatch] = None
    datos_emplazamiento: Optional[DatosEmplazamientoPatch] = None
    tipo_emplazamiento: Optional[TipoEmplazamientoPatch] = None
    datos_instalacion: Optional[DatosInstalacionPatch] = None
    configuracion_equipo: Optional[ConfiguracionEquipoPatch] = None
    alimentacion_estacion: Optional[AlimentacionEstacionPatch] = None


@router.put("/estaciones/{estacion_id}/update")
def update_estacion(
    estacion_id: int,
    data: EstacionUpdate,
    user: dict = Depends(get_current_user)
):
    require_role(['admin', 'edicion'], user)

    with get_connection() as conn:
        cursor = conn.cursor()
        try:
            cursor.execute("""
                UPDATE estaciones.estaciones
                SET version=%s, codigo_emplazamiento=%s
                WHERE id=%s
            """, (data.estacion.version, data.estacion.codigo_emplazamiento, estacion_id))

            cursor.execute("""
                UPDATE estaciones.ubicacion
                SET direccion=%s, latitud=%s, longitud=%s
                WHERE estacion_id=%s
            """, (data.ubicacion.direccion, data.ubicacion.latitud, data.ubicacion.longitud, estacion_id))

            cursor.execute("""
                UPDATE estaciones.datos_emplazamiento
                SET nombre_emplazamiento=%s, propietario_emplazamiento=%s,
                    descripcion_emplazamiento=%s, realizado_por=%s
                WHERE estacion_id=%s
            """, (
                data.datos_emplazamiento.nombre_emplazamiento,
                data.datos_emplazamiento.propietario_emplazamiento,
                data.datos_emplazamiento.descripcion_emplazamiento,
                data.datos_emplazamiento.realizado_por,
                estacion_id
            ))

            cursor.execute("""
                UPDATE estaciones.tipo_emplazamiento
                SET tipo_estacion=%s, caseta=%s, instalacion_exterior=%s, emplazamiento_compartido=%s
                WHERE estacion_id=%s
            """, (
                data.tipo_emplazamiento.tipo_estacion,
                data.tipo_emplazamiento.caseta,
                data.tipo_emplazamiento.instalacion_exterior,
                data.tipo_emplazamiento.emplazamiento_compartido,
                estacion_id
            ))

            cursor.execute("""
                UPDATE estaciones.datos_instalacion SET coc=%s WHERE estacion_id=%s
            """, (data.datos_instalacion.coc, estacion_id))

            cursor.execute("""
                UPDATE estaciones.configuracion
                SET suministro_ini=%s, mod_bastidor_modulos_ini=%s
                WHERE estacion_id=%s
            """, (
                data.configuracion_equipo.suministro_ini,
                data.configuracion_equipo.mod_bastidor_modulos_ini,
                estacion_id
            ))

            cursor.execute("""
                UPDATE estaciones.alimentacion_estacion
                SET modelo_cf_ini=%s, num_rectificadores_capacidad_ini=%s, mod_baterias_ini=%s
                WHERE estacion_id=%s
            """, (
                data.alimentacion_estacion.modelo_cf_ini,
                data.alimentacion_estacion.num_rectificadores_capacidad_ini,
                data.alimentacion_estacion.mod_baterias_ini,
                estacion_id
            ))

            conn.commit()
            cursor.close()
            return {"status": "ok", "message": "Estación actualizada correctamente"}

        except HTTPException:
            conn.rollback()
            raise
        except Exception:
            conn.rollback()
            raise HTTPException(status_code=500, detail="Error al actualizar la estación")


@router.get("/estaciones/{estacion_id}/detalle")
def get_estacion_detalle(
    estacion_id: int,
    user: dict = Depends(get_current_user)
):
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
                SELECT direccion, latitud, longitud FROM estaciones.ubicacion WHERE estacion_id = %s
            """, (estacion_id,))
            ubicacion = cursor.fetchone()
            ubicacion_data = dict(zip([d[0] for d in cursor.description], ubicacion)) if ubicacion else {
                "direccion": "", "latitud": "", "longitud": ""
            }

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
                SELECT coc FROM estaciones.datos_instalacion WHERE estacion_id = %s
            """, (estacion_id,))
            datos_instalacion = fetch_one_dict()

            cursor.execute("""
                SELECT suministro_ini, mod_bastidor_modulos_ini
                FROM estaciones.configuracion WHERE estacion_id = %s
            """, (estacion_id,))
            configuracion_equipo = fetch_one_dict()

            cursor.execute("""
                SELECT modelo_cf_ini, num_rectificadores_capacidad_ini, mod_baterias_ini
                FROM estaciones.alimentacion_estacion WHERE estacion_id = %s
            """, (estacion_id,))
            alimentacion_estacion = fetch_one_dict()

            cursor.execute("""
                SELECT id, nombre_archivo, tipo_archivo, url_archivo, extension_archivo
                FROM estaciones.archivos WHERE estacion_id = %s
            """, (estacion_id,))
            archivos = [dict(zip([d[0] for d in cursor.description], row)) for row in cursor.fetchall()]

            cursor.execute("""
                SELECT id, tipo_equipo, estado, num_serie, codigo
                FROM estaciones.equipos_site WHERE estacion_id = %s ORDER BY id
            """, (estacion_id,))
            equipos_site = [dict(zip([d[0] for d in cursor.description], row)) for row in cursor.fetchall()]

            cursor.close()
            return {
                "estacion": estacion_data,
                "ubicacion": ubicacion_data,
                "datos_emplazamiento": datos_emplazamiento,
                "tipo_emplazamiento": tipo_emplazamiento,
                "datos_instalacion": datos_instalacion,
                "configuracion_equipo": configuracion_equipo,
                "alimentacion_estacion": alimentacion_estacion,
                "equipos_site": equipos_site,
                "archivos": archivos
            }

        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=500, detail="Error al obtener el detalle de la estación")


@router.get("/estadisticas/general")
def get_estadisticas_general(user: dict = Depends(get_current_user)):
    with get_connection() as conn:
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT COUNT(*) FROM estaciones.estaciones")
            total_estaciones = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM estaciones.unidad_espacial")
            total_antenas = cursor.fetchone()[0]

            cursor.execute("""
                SELECT COALESCE(tipo_estacion, 'Sin clasificar') as tipo, COUNT(*) as cantidad
                FROM estaciones.tipo_emplazamiento
                GROUP BY tipo_estacion ORDER BY cantidad DESC
            """)
            estaciones_por_tipo = [{"tipo": row[0], "cantidad": row[1]} for row in cursor.fetchall()]

            cursor.execute("""
                SELECT COALESCE(propietario_emplazamiento, 'Desconocido') as propietario, COUNT(*) as cantidad
                FROM estaciones.datos_emplazamiento
                WHERE propietario_emplazamiento IS NOT NULL AND propietario_emplazamiento != ''
                GROUP BY propietario_emplazamiento ORDER BY cantidad DESC LIMIT 10
            """)
            top_propietarios = [{"propietario": row[0], "cantidad": row[1]} for row in cursor.fetchall()]

            cursor.execute("""
                SELECT column_name FROM information_schema.columns
                WHERE table_schema = 'estaciones' AND table_name = 'ubicacion' AND column_name = 'codigo_postal'
            """)
            tiene_codigo_postal = cursor.fetchone()

            if tiene_codigo_postal:
                cursor.execute("""
                    SELECT COALESCE(codigo_postal, 'Sin CP') as codigo_postal, COUNT(*) as cantidad
                    FROM estaciones.ubicacion GROUP BY codigo_postal ORDER BY cantidad DESC LIMIT 10
                """)
            else:
                cursor.execute("""
                    SELECT COALESCE(provincia, 'Sin provincia') as codigo_postal, COUNT(*) as cantidad
                    FROM estaciones.ubicacion GROUP BY provincia ORDER BY cantidad DESC LIMIT 10
                """)

            distribucion_geografica = [{"codigo_postal": row[0], "cantidad": row[1]} for row in cursor.fetchall()]
            if not distribucion_geografica:
                distribucion_geografica = [{"codigo_postal": "Sin datos", "cantidad": 0}]

            cursor.close()
            return {
                "total_estaciones": total_estaciones,
                "total_antenas": total_antenas,
                "estaciones_por_tipo": estaciones_por_tipo,
                "top_propietarios": top_propietarios,
                "distribucion_geografica": distribucion_geografica
            }

        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=500, detail="Error al obtener las estadísticas generales")


class NuevaAntennaRequest(BaseModel):
    lon: float
    lat: float
    codigo_emplazamiento: Optional[str] = None
    version: Optional[str] = "1.0"


@router.post("/estaciones/crear")
def crear_nueva_estacion(
    data: NuevaAntennaRequest,
    user: dict = Depends(get_current_user)
):
    require_role(['admin', 'edicion'], user)

    with get_connection() as conn:
        cursor = conn.cursor()
        try:
            if not data.codigo_emplazamiento:
                cursor.execute("""
                    SELECT COALESCE(MAX(CAST(codigo_emplazamiento AS INTEGER)), 3300000) + 1
                    FROM estaciones.estaciones WHERE codigo_emplazamiento ~ '^[0-9]+$'
                """)
                nuevo_codigo = str(cursor.fetchone()[0])
            else:
                nuevo_codigo = data.codigo_emplazamiento

            cursor.execute("""
                INSERT INTO estaciones.estaciones (version, codigo_emplazamiento)
                VALUES (%s, %s) RETURNING id
            """, (data.version, nuevo_codigo))
            estacion_id = cursor.fetchone()[0]

            cursor.execute("""
                INSERT INTO estaciones.ubicacion (
                    estacion_id, direccion, provincia, ayuntamiento, latitud, longitud
                ) VALUES (%s, %s, %s, %s, %s, %s) RETURNING id
            """, (estacion_id, 'SIN ESPECIFICAR', 'SIN ESPECIFICAR', 'SIN ESPECIFICAR',
                  f"{data.lat}° N", f"{data.lon}° W"))
            ubicacion_id = cursor.fetchone()[0]

            cursor.execute("""
                INSERT INTO estaciones.unidad_espacial (ubicacion_id, original, geompoint)
                VALUES (%s, %s, ST_Transform(ST_SetSRID(ST_MakePoint(%s, %s), 4326), 25830))
                RETURNING id
            """, (ubicacion_id, f"{data.lon},{data.lat}", data.lon, data.lat))
            unidad_espacial_id = cursor.fetchone()[0]

            cursor.execute("""
                INSERT INTO estaciones.datos_emplazamiento (
                    estacion_id, codigo_emplazamiento, nombre_emplazamiento,
                    propietario_emplazamiento, descripcion_emplazamiento, realizado_por
                ) VALUES (%s, %s, %s, %s, %s, %s)
            """, (estacion_id, nuevo_codigo, 'NUEVA ANTENA', 'SIN ESPECIFICAR',
                  'NUEVA ANTENA CREADA DESDE GEOPORTAL', 'GEOPORTAL'))

            cursor.execute("""
                INSERT INTO estaciones.tipo_emplazamiento (
                    estacion_id, tipo_estacion, caseta, sala_acondicionada,
                    instalacion_exterior, emplazamiento_compartido
                ) VALUES (%s, %s, %s, %s, %s, %s)
            """, (estacion_id, 'SIN ESPECIFICAR', 'N/A', 'N/A', 'N/A', 'NO'))

            cursor.execute("""
                INSERT INTO estaciones.datos_instalacion (estacion_id, coc, descripcion_obra)
                VALUES (%s, %s, %s)
            """, (estacion_id, 'N/A', 'NUEVA INSTALACIÓN'))

            cursor.execute("""
                INSERT INTO estaciones.configuracion (
                    estacion_id, equipo, suministro_ini, mod_bastidor_modulos_ini,
                    num_bastidor_ini, alimentacion_ini, configuracion_ini
                ) VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (estacion_id, 'N/A', 'N/A', 'N/A', '0', '-48Vcc', 'SIN CONFIGURAR'))

            cursor.execute("""
                INSERT INTO estaciones.alimentacion_estacion (
                    estacion_id, equipo, modelo_cf_ini, num_rectificadores_capacidad_ini,
                    mod_baterias_ini, mod_calibre_reconectadora_ini, tension_cf_ini,
                    num_bloques_ini, num_elem_bloque_ini, capacidad_baterias_ini,
                    mod_aire_acondicionado_ini
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id
            """, (estacion_id, 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', '-48Vcc', '0', '0', '0Ah', 'N/A'))
            alimentacion_id = cursor.fetchone()[0]

            cursor.execute("""
                INSERT INTO estaciones.calculo_alterna (
                    alimentacion_id, ct_equipos_tx_rbs_ini, consumo_aire_acondicionado_ini,
                    otros_ini, total_alterna_ini
                ) VALUES (%s, %s, %s, %s, %s)
            """, (alimentacion_id, 'N/A', 'N/A', 'N/A', 'N/A'))

            cursor.execute("""
                INSERT INTO estaciones.calculo_cc (
                    alimentacion_id, consumo_radio_ini, consumo_equipos_tx_ini,
                    consumo_equipos_otros_ini, consumo_refles_repetidores_ini,
                    otros_ini, capacidad_consumo_baterias_ini, consumo_total_continua_ini
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (alimentacion_id, 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A'))

            cursor.execute("""
                INSERT INTO estaciones.suministro_electrico (
                    alimentacion_id, tension_ini, valor_icp_ini, monofasico_ini, trifasico_ini
                ) VALUES (%s, %s, %s, %s, %s)
            """, (alimentacion_id, 'N/A', 'N/A', 'N/A', 'N/A'))

            cursor.execute("""
                INSERT INTO estaciones.descripcion_trabajos (
                    estacion_id, equipo_radio, toma_tierra, suministro_energia,
                    transmision, alarmas_externas, sistema_radiante, otros
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (estacion_id, 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A',
                  'NUEVA INSTALACIÓN - DATOS A COMPLETAR'))

            conn.commit()
            cursor.close()
            return {
                "status": "success",
                "message": f"Antena creada correctamente con código {nuevo_codigo}",
                "data": {
                    "estacion_id": estacion_id,
                    "codigo_emplazamiento": nuevo_codigo,
                    "ubicacion_id": ubicacion_id,
                    "unidad_espacial_id": unidad_espacial_id,
                    "lon": data.lon,
                    "lat": data.lat
                }
            }

        except HTTPException:
            conn.rollback()
            raise
        except Exception:
            conn.rollback()
            raise HTTPException(status_code=500, detail="Error al crear la estación")


@router.patch("/estaciones/{estacion_id}")
def patch_estacion(
    estacion_id: int,
    data: EstacionPatch,
    user: dict = Depends(get_current_user)
):
    require_role(['admin', 'edicion'], user)

    with get_connection() as conn:
        cursor = conn.cursor()
        try:
            if data.estacion:
                fields, values = [], []
                if data.estacion.version is not None:
                    fields.append("version=%s"); values.append(data.estacion.version)
                if data.estacion.codigo_emplazamiento is not None:
                    fields.append("codigo_emplazamiento=%s"); values.append(data.estacion.codigo_emplazamiento)
                if fields:
                    values.append(estacion_id)
                    cursor.execute(f"UPDATE estaciones.estaciones SET {', '.join(fields)} WHERE id=%s", tuple(values))

            if data.ubicacion:
                fields, values = [], []
                if data.ubicacion.direccion is not None:
                    fields.append("direccion=%s"); values.append(data.ubicacion.direccion)
                if data.ubicacion.latitud is not None:
                    fields.append("latitud=%s"); values.append(data.ubicacion.latitud)
                if data.ubicacion.longitud is not None:
                    fields.append("longitud=%s"); values.append(data.ubicacion.longitud)
                if fields:
                    values.append(estacion_id)
                    cursor.execute(f"UPDATE estaciones.ubicacion SET {', '.join(fields)} WHERE estacion_id=%s", tuple(values))

            if data.datos_emplazamiento:
                fields, values = [], []
                if data.datos_emplazamiento.nombre_emplazamiento is not None:
                    fields.append("nombre_emplazamiento=%s"); values.append(data.datos_emplazamiento.nombre_emplazamiento)
                if data.datos_emplazamiento.propietario_emplazamiento is not None:
                    fields.append("propietario_emplazamiento=%s"); values.append(data.datos_emplazamiento.propietario_emplazamiento)
                if data.datos_emplazamiento.descripcion_emplazamiento is not None:
                    fields.append("descripcion_emplazamiento=%s"); values.append(data.datos_emplazamiento.descripcion_emplazamiento)
                if data.datos_emplazamiento.realizado_por is not None:
                    fields.append("realizado_por=%s"); values.append(data.datos_emplazamiento.realizado_por)
                if fields:
                    values.append(estacion_id)
                    cursor.execute(f"UPDATE estaciones.datos_emplazamiento SET {', '.join(fields)} WHERE estacion_id=%s", tuple(values))

            if data.tipo_emplazamiento:
                fields, values = [], []
                if data.tipo_emplazamiento.tipo_estacion is not None:
                    fields.append("tipo_estacion=%s"); values.append(data.tipo_emplazamiento.tipo_estacion)
                if data.tipo_emplazamiento.caseta is not None:
                    fields.append("caseta=%s"); values.append(data.tipo_emplazamiento.caseta)
                if data.tipo_emplazamiento.instalacion_exterior is not None:
                    fields.append("instalacion_exterior=%s"); values.append(data.tipo_emplazamiento.instalacion_exterior)
                if data.tipo_emplazamiento.emplazamiento_compartido is not None:
                    fields.append("emplazamiento_compartido=%s"); values.append(data.tipo_emplazamiento.emplazamiento_compartido)
                if fields:
                    values.append(estacion_id)
                    cursor.execute(f"UPDATE estaciones.tipo_emplazamiento SET {', '.join(fields)} WHERE estacion_id=%s", tuple(values))

            if data.datos_instalacion:
                fields, values = [], []
                if data.datos_instalacion.coc is not None:
                    fields.append("coc=%s"); values.append(data.datos_instalacion.coc)
                if fields:
                    values.append(estacion_id)
                    cursor.execute(f"UPDATE estaciones.datos_instalacion SET {', '.join(fields)} WHERE estacion_id=%s", tuple(values))

            if data.configuracion_equipo:
                fields, values = [], []
                if data.configuracion_equipo.suministro_ini is not None:
                    fields.append("suministro_ini=%s"); values.append(data.configuracion_equipo.suministro_ini)
                if data.configuracion_equipo.mod_bastidor_modulos_ini is not None:
                    fields.append("mod_bastidor_modulos_ini=%s"); values.append(data.configuracion_equipo.mod_bastidor_modulos_ini)
                if fields:
                    values.append(estacion_id)
                    cursor.execute(f"UPDATE estaciones.configuracion SET {', '.join(fields)} WHERE estacion_id=%s", tuple(values))

            if data.alimentacion_estacion:
                fields, values = [], []
                if data.alimentacion_estacion.modelo_cf_ini is not None:
                    fields.append("modelo_cf_ini=%s"); values.append(data.alimentacion_estacion.modelo_cf_ini)
                if data.alimentacion_estacion.num_rectificadores_capacidad_ini is not None:
                    fields.append("num_rectificadores_capacidad_ini=%s"); values.append(data.alimentacion_estacion.num_rectificadores_capacidad_ini)
                if data.alimentacion_estacion.mod_baterias_ini is not None:
                    fields.append("mod_baterias_ini=%s"); values.append(data.alimentacion_estacion.mod_baterias_ini)
                if fields:
                    values.append(estacion_id)
                    cursor.execute(f"UPDATE estaciones.alimentacion_estacion SET {', '.join(fields)} WHERE estacion_id=%s", tuple(values))

            conn.commit()
            cursor.close()
            return {"status": "ok", "message": "Estación actualizada correctamente"}

        except HTTPException:
            conn.rollback()
            raise
        except Exception:
            conn.rollback()
            raise HTTPException(status_code=500, detail="Error al modificar la estación")


@router.delete("/estaciones/{estacion_id}")
def delete_estacion(
    estacion_id: int,
    user: dict = Depends(get_current_user)
):
    require_role(['admin', 'edicion'], user)

    with get_connection() as conn:
        cursor = conn.cursor()
        try:
            cursor.execute("""
                SELECT id, codigo_emplazamiento FROM estaciones.estaciones WHERE id = %s
            """, (estacion_id,))
            estacion = cursor.fetchone()
            if not estacion:
                raise HTTPException(status_code=404, detail="Estación no encontrada")
            codigo_emplazamiento = estacion[1]

            cursor.execute("SELECT id FROM estaciones.ubicacion WHERE estacion_id = %s", (estacion_id,))
            ubicacion_result = cursor.fetchone()
            ubicacion_id = ubicacion_result[0] if ubicacion_result else None

            if ubicacion_id:
                cursor.execute("DELETE FROM estaciones.unidad_espacial WHERE ubicacion_id = %s", (ubicacion_id,))

            cursor.execute("SELECT id FROM estaciones.alimentacion_estacion WHERE estacion_id = %s", (estacion_id,))
            alimentacion_result = cursor.fetchone()
            alimentacion_id = alimentacion_result[0] if alimentacion_result else None

            if alimentacion_id:
                cursor.execute("DELETE FROM estaciones.calculo_alterna WHERE alimentacion_id = %s", (alimentacion_id,))
                cursor.execute("DELETE FROM estaciones.calculo_cc WHERE alimentacion_id = %s", (alimentacion_id,))
                cursor.execute("DELETE FROM estaciones.suministro_electrico WHERE alimentacion_id = %s", (alimentacion_id,))

            cursor.execute("DELETE FROM estaciones.archivos WHERE estacion_id = %s", (estacion_id,))
            cursor.execute("DELETE FROM estaciones.descripcion_trabajos WHERE estacion_id = %s", (estacion_id,))
            cursor.execute("DELETE FROM estaciones.alimentacion_estacion WHERE estacion_id = %s", (estacion_id,))
            cursor.execute("DELETE FROM estaciones.configuracion WHERE estacion_id = %s", (estacion_id,))
            cursor.execute("DELETE FROM estaciones.datos_instalacion WHERE estacion_id = %s", (estacion_id,))
            cursor.execute("DELETE FROM estaciones.tipo_emplazamiento WHERE estacion_id = %s", (estacion_id,))
            cursor.execute("DELETE FROM estaciones.datos_emplazamiento WHERE estacion_id = %s", (estacion_id,))
            cursor.execute("DELETE FROM estaciones.ubicacion WHERE estacion_id = %s", (estacion_id,))
            cursor.execute("DELETE FROM estaciones.estaciones WHERE id = %s", (estacion_id,))

            conn.commit()
            cursor.close()
            return {
                "status": "success",
                "message": f"Estación {codigo_emplazamiento} eliminada correctamente con todos sus registros relacionados",
                "estacion_id": estacion_id,
                "codigo_emplazamiento": codigo_emplazamiento
            }

        except HTTPException:
            conn.rollback()
            raise
        except Exception:
            conn.rollback()
            raise HTTPException(status_code=500, detail="Error al eliminar la estación")