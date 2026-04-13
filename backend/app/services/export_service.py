from typing import List, Optional
from app.schemas.export_schemas import (
    EstacionExportWrapper,
    EstacionExport,
    DatosEmplazamiento,
    DatosInstalacion,
    UbicacionEB,
    Coordenadas,
    TipoEmplazamiento,
    DescripcionTrabajos,
    EquipoSite,
    AlimentacionEstacionBase,
    Equipo1,
    ModeloCF,
    ModeloBaterias,
    NumeroBloques,
    SuministroElectricoEB,
    ConsumoRadio,
    CalculoCCTotal,
    CalculoAlterna
)


class ExportService:
    
    @staticmethod
    def exportar_estacion(cursor, estacion_id: int) -> Optional[EstacionExportWrapper]:
        """
        Exporta una estación completa con todas sus tablas relacionadas
        """
        # Consulta la estación principal
        cursor.execute(
            """
            SELECT id, version, codigo_emplazamiento
            FROM estaciones.estaciones
            WHERE id = %s
            """,
            (estacion_id,)
        )
        
        estacion = cursor.fetchone()
        
        if not estacion:
            return None
        
        # Construir el objeto completo
        return EstacionExportWrapper(
            json_featuretype="estructura",
            json=EstacionExport(
                DATOS_EMPLAZAMIENTO=ExportService._get_datos_emplazamiento(cursor, estacion_id),
                DATOS_INSTALACION=ExportService._get_datos_instalacion(cursor, estacion_id),
                UBICACION_EB=ExportService._get_ubicacion(cursor, estacion_id),
                TIPO_EMPLAZAMIENTO=ExportService._get_tipo_emplazamiento(cursor, estacion_id),
                DESCRIPCION_TRABAJOS_REALIZADOS=ExportService._get_descripcion_trabajos(cursor, estacion_id),
                CONFIGURACION=ExportService._get_configuracion(cursor, estacion_id),
                RELACION_DE_EQUIPOS_EN_EL_SITE=ExportService._get_equipos_site(cursor, estacion_id),
                ALIMENTACION_DE_LA_ESTACION_BASE=ExportService._get_alimentacion(cursor, estacion_id)
            )
        )
    
    @staticmethod
    def _get_datos_emplazamiento(cursor, estacion_id: int) -> Optional[DatosEmplazamiento]:
        cursor.execute(
            """
            SELECT 
                e.version as version_nap48,
                de.codigo_emplazamiento,
                de.nombre_emplazamiento,
                de.propietario_emplazamiento,
                de.descripcion_emplazamiento,
                de.realizado_por
            FROM estaciones.estaciones e
            LEFT JOIN estaciones.datos_emplazamiento de ON e.id = de.estacion_id
            WHERE e.id = %s
            """,
            (estacion_id,)
        )
        
        result = cursor.fetchone()
        
        if not result:
            return None
        
        return DatosEmplazamiento(
            Version_NAP48=result[0],
            Codigo_Emplazamiento=result[1],
            Nombre_Emplazamiento=result[2],
            Propietario_Emplazamiento=result[3],
            Descripcion_Emplazamiento=result[4],
            Realizado_por=result[5]
        )
    
    @staticmethod
    def _get_datos_instalacion(cursor, estacion_id: int) -> Optional[DatosInstalacion]:
        cursor.execute(
            """
            SELECT 
                coc,
                descripcion_obra,
                TO_CHAR(fecha_instalacion, 'YYYYMMDD') as fecha_instalacion
            FROM estaciones.datos_instalacion
            WHERE estacion_id = %s
            """,
            (estacion_id,)
        )
        
        result = cursor.fetchone()
        
        if not result:
            return None
        
        return DatosInstalacion(
            COC=result[0],
            Descripcion_Obra=result[1],
            Fecha_instalacion=result[2]
        )
    
    @staticmethod
    def _get_ubicacion(cursor, estacion_id: int) -> Optional[dict]:
        cursor.execute(
            """
            SELECT 
                direccion,
                provincia,
                ayuntamiento,
                latitud,
                longitud
            FROM estaciones.ubicacion
            WHERE estacion_id = %s
            """,
            (estacion_id,)
        )
        
        result = cursor.fetchone()
        
        if not result:
            return None
        
        # Devolver dict en lugar de objetos Pydantic
        ubicacion_dict = {
            "Direccion": result[0],
            "Provincia": result[1],
            "Ayuntamiento": result[2]
        }
        
        # Agregar coordenadas si existen
        if result[3] and result[4]:
            ubicacion_dict["Coordenadas"] = {
                "Latitud": result[3],
                "Longitud": result[4]
            }
        else:
            ubicacion_dict["Coordenadas"] = None
        
        return ubicacion_dict
    
    @staticmethod
    def _get_tipo_emplazamiento(cursor, estacion_id: int) -> Optional[TipoEmplazamiento]:
        cursor.execute(
            """
            SELECT 
                tipo_estacion,
                caseta,
                sala_acondicionada,
                instalacion_exterior,
                emplazamiento_compartido
            FROM estaciones.tipo_emplazamiento
            WHERE estacion_id = %s
            """,
            (estacion_id,)
        )
        
        result = cursor.fetchone()
        
        if not result:
            return None
        
        return TipoEmplazamiento(
            Tipo_estacion_Interior_exterior=result[0],
            Caseta=result[1],
            Sala_acondicionada=result[2],
            Instalacion_exterior_azotea_suelotorre=result[3],
            Emplazamiento_compartido=result[4]
        )
    
    @staticmethod
    def _get_descripcion_trabajos(cursor, estacion_id: int) -> Optional[DescripcionTrabajos]:
        cursor.execute(
            """
            SELECT 
                equipo_radio,
                toma_tierra,
                suministro_energia,
                transmision,
                alarmas_externas,
                sistema_radiante,
                otros
            FROM estaciones.descripcion_trabajos
            WHERE estacion_id = %s
            """,
            (estacion_id,)
        )
        
        result = cursor.fetchone()
        
        if not result:
            return None
        
        return DescripcionTrabajos(
            Equipos_Radio=result[0],
            Toma_de_Tierra=result[1],
            Suministro_de_Energia=result[2],
            Transmision=result[3],
            Alarmas_Externas=result[4],
            Sistema_Radiante=result[5],
            Otros=result[6]
        )
    
    @staticmethod
    def _get_configuracion(cursor, estacion_id: int) -> List[dict]:
        cursor.execute(
            """
            SELECT 
                equipo,
                suministro_ini,
                mod_bastidor_modulos_ini,
                num_bastidor_ini,
                alimentacion_ini,
                configuracion_ini
            FROM estaciones.configuracion
            WHERE estacion_id = %s
            ORDER BY id
            """,
            (estacion_id,)
        )
        
        results = cursor.fetchall()
        
        configuraciones = []
        for row in results:
            config_dict = {
                row[0]: {  # equipo
                    "Suministrador": row[1],
                    "ModBastidor_o_Modulos": row[2],
                    "N_Bastidores": row[3],
                    "Alimentacion": row[4],
                    "Configuracion": row[5]
                }
            }
            configuraciones.append(config_dict)
        
        return configuraciones
    
    @staticmethod
    def _get_equipos_site(cursor, estacion_id: int) -> List[EquipoSite]:
        cursor.execute(
            """
            SELECT 
                tipo_equipo,
                estado,
                num_serie,
                codigo
            FROM estaciones.equipos_site
            WHERE estacion_id = %s
            ORDER BY id
            """,
            (estacion_id,)
        )
        
        results = cursor.fetchall()
        
        equipos = []
        for row in results:
            equipos.append(EquipoSite(
                Tipo=row[0],
                Estado=row[1],
                N_Serie=row[2],
                Codigo=row[3]
            ))
        
        return equipos
    
    @staticmethod
    def _get_alimentacion(cursor, estacion_id: int) -> Optional[dict]:
        # Consultar alimentacion_estacion
        cursor.execute(
            """
            SELECT *
            FROM estaciones.alimentacion_estacion
            WHERE estacion_id = %s
            """,
            (estacion_id,)
        )
        
        alim = cursor.fetchone()
        
        if not alim:
            return None
        
        # Obtener nombres de columnas
        colnames = [desc[0] for desc in cursor.description]
        alim_dict = dict(zip(colnames, alim))
        
        # Consultar suministro_electrico
        cursor.execute(
            """
            SELECT *
            FROM estaciones.suministro_electrico
            WHERE alimentacion_id = %s
            """,
            (alim_dict['id'],)
        )
        
        sumin_row = cursor.fetchone()
        sumin = None
        if sumin_row:
            sumin_colnames = [desc[0] for desc in cursor.description]
            sumin = dict(zip(sumin_colnames, sumin_row))
        
        # Consultar calculo_cc
        cursor.execute(
            """
            SELECT *
            FROM estaciones.calculo_cc
            WHERE alimentacion_id = %s
            """,
            (alim_dict['id'],)
        )
        
        calc_cc_row = cursor.fetchone()
        calc_cc = None
        if calc_cc_row:
            calc_cc_colnames = [desc[0] for desc in cursor.description]
            calc_cc = dict(zip(calc_cc_colnames, calc_cc_row))
        
        # Consultar calculo_alterna
        cursor.execute(
            """
            SELECT *
            FROM estaciones.calculo_alterna
            WHERE alimentacion_id = %s
            """,
            (alim_dict['id'],)
        )
        
        calc_alt_row = cursor.fetchone()
        calc_alt = None
        if calc_alt_row:
            calc_alt_colnames = [desc[0] for desc in cursor.description]
            calc_alt = dict(zip(calc_alt_colnames, calc_alt_row))
        
        # Construir diccionario directamente en el formato esperado
        return {
            "Equipo_1": {
                "Modelo_de_CF": {
                    "Inicial": alim_dict.get('modelo_cf_ini'),
                    "Final": alim_dict.get('modelo_cf_fin')
                },
                "Rectificadores_existentes_y_capacidad": {
                    "Inicial": alim_dict.get('num_rectificadores_capacidad_ini'),
                    "Final": alim_dict.get('num_rectificadores_capacidad_fin')
                },
                "Modelo_de_baterias": {
                    "Inicial1": alim_dict.get('mod_baterias_ini'),
                    "Final1": alim_dict.get('mod_baterias_fin'),
                    "Inicial2": "N/A",
                    "Final2": "N/A",
                    "Inicial3": "N/A",
                    "Final3": "N/A"
                },
                "Modelo_y_calibre_de_reconectadora": {
                    "Inicial": alim_dict.get('mod_calibre_reconectadora_ini'),
                    "Final": alim_dict.get('mod_calibre_reconectadora_fin')
                },
                "Tension_de_CF": {
                    "Inicial": alim_dict.get('tension_cf_ini'),
                    "Final": alim_dict.get('tension_cf_fin')
                },
                "Numero_de_bloques": {
                    "Inicial": int(alim_dict.get('num_bloques_ini')) if alim_dict.get('num_bloques_ini') and str(alim_dict.get('num_bloques_ini')).isdigit() else None,
                    "Final": int(alim_dict.get('num_bloques_fin')) if alim_dict.get('num_bloques_fin') and str(alim_dict.get('num_bloques_fin')).isdigit() else None
                },
                "Numero_de_elementos_por_bloque": {
                    "Inicial": int(alim_dict.get('num_elem_bloque_ini')) if alim_dict.get('num_elem_bloque_ini') and str(alim_dict.get('num_elem_bloque_ini')).isdigit() else None,
                    "Final": int(alim_dict.get('num_elem_bloque_fin')) if alim_dict.get('num_elem_bloque_fin') and str(alim_dict.get('num_elem_bloque_fin')).isdigit() else None
                },
                "Capacidad_de_baterias": {
                    "Inicial": alim_dict.get('capacidad_baterias_ini'),
                    "Final": alim_dict.get('capacidad_baterias_fin')
                },
                "Modelo_Aire_Acondicionado": {
                    "Inicial": alim_dict.get('mod_aire_acondicionado_ini'),
                    "Final": alim_dict.get('mod_aire_acondicionado_fin')
                }
            },
            "Suministro_Electrico_EB": {
                "Tension_V": {
                    "Inicial": sumin.get('tension_ini') if sumin else None,
                    "Final": sumin.get('tension_fin') if sumin else None
                },
                "Valor_ICP": {
                    "Inicial": sumin.get('valor_icp_ini') if sumin else None,
                    "Final": sumin.get('valor_icp_fin') if sumin else None
                },
                "Monofasico": {
                    "Inicial": sumin.get('monofasico_ini') if sumin else None,
                    "Final": sumin.get('monofasico_fin') if sumin else None
                },
                "Trifasico": {
                    "Inicial": sumin.get('trifasico_ini') if sumin else None,
                    "Final": sumin.get('trifasico_fin') if sumin else None
                }
            } if sumin else None,
            "Calculo_CC_total_W": {
                "Consumo_Radio": {
                    "Inicial": int(calc_cc.get('consumo_radio_ini')) if calc_cc and calc_cc.get('consumo_radio_ini') and str(calc_cc.get('consumo_radio_ini')).isdigit() else None,
                    "Final": int(calc_cc.get('consumo_radio_fin')) if calc_cc and calc_cc.get('consumo_radio_fin') and str(calc_cc.get('consumo_radio_fin')).isdigit() else None
                },
                "Comsumo_equipos_de_Tx": {
                    "Inicial": calc_cc.get('consumo_equipos_tx_ini') if calc_cc else None,
                    "Final": calc_cc.get('consumo_equipos_tx_fin') if calc_cc else None
                },
                "Consumo_equipos_otros_operadores": {
                    "Inicial": calc_cc.get('consumo_equipos_otros_ini') if calc_cc else None,
                    "Final": calc_cc.get('consumo_equipos_otros_fin') if calc_cc else None
                },
                "Consumo_Refles_Repetidores": {
                    "Inicial": calc_cc.get('consumo_refles_repetidores_ini') if calc_cc else None,
                    "Final": calc_cc.get('consumo_refles_repetidores_fin') if calc_cc else None
                },
                "Otros": {
                    "Inicial": calc_cc.get('otros_ini') if calc_cc else None,
                    "Final": calc_cc.get('otros_fin') if calc_cc else None
                },
                "Capacidad_consumo_baterias_10_pct": {
                    "Inicial": calc_cc.get('capacidad_consumo_baterias_ini') if calc_cc else None,
                    "Final": calc_cc.get('capacidad_consumo_baterias_fin') if calc_cc else None
                },
                "Consumo_total_continua": {
                    "Inicial": int(calc_cc.get('consumo_total_continua_ini')) if calc_cc and calc_cc.get('consumo_total_continua_ini') and str(calc_cc.get('consumo_total_continua_ini')).isdigit() else None,
                    "Final": int(calc_cc.get('consumo_total_continua_fin')) if calc_cc and calc_cc.get('consumo_total_continua_fin') and str(calc_cc.get('consumo_total_continua_fin')).isdigit() else None
                }
            } if calc_cc else None,
            "CalculoAlterna": {
                "ConsumoTxRBS98": {
                    "Inicial": calc_alt.get('ct_equipos_tx_rbs_ini') if calc_alt else None,
                    "Final": calc_alt.get('ct_equipos_tx_rbs_fin') if calc_alt else None
                },
                "ConsumoAireAcondicionado": {
                    "Inicial": calc_alt.get('consumo_aire_acondicionado_ini') if calc_alt else None,
                    "Final": calc_alt.get('consumo_aire_acondicionado_fin') if calc_alt else None
                },
                "Otros": {
                    "Inicial": calc_alt.get('otros_ini') if calc_alt else None,
                    "Final": calc_alt.get('otros_fin') if calc_alt else None
                },
                "TotalAlterna": {
                    "Inicial": calc_alt.get('total_alterna_ini') if calc_alt else None,
                    "Final": calc_alt.get('total_alterna_fin') if calc_alt else None
                }
            } if calc_alt else None
        }
    
    @staticmethod
    def exportar_todas_estaciones(cursor) -> List[EstacionExportWrapper]:
        """
        Exporta todas las estaciones de la base de datos
        """
        cursor.execute(
            """
            SELECT id
            FROM estaciones.estaciones
            ORDER BY id
            """
        )
        
        estaciones = cursor.fetchall()
        
        resultado = []
        for estacion in estaciones:
            export = ExportService.exportar_estacion(cursor, estacion[0])
            if export:
                resultado.append(export)
        
        return resultado