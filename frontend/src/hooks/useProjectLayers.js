// /home/pablold/visor-gis/frontend/src/hooks/useProjectLayers.js
// 🎨 NUEVO: Soporte para estilos dinámicos desde BD
// 🐛 DEBUG: Logs para diagnosticar re-renders

import { useEffect, useRef } from 'react';
import { layerService } from '../services/LayerService';

/**
 * Hook para gestionar capas de proyecto en OpenLayers
 * 
 * @param {Object} mapInstanceRef - Referencia al mapa OpenLayers
 * @param {Set} visibleLayers - Set de layer_ids visibles
 * @param {Array} allLayers - Array con todas las capas disponibles
 */
export default function useProjectLayers({ mapInstanceRef, visibleLayers, allLayers }) {
  const previousVisibleLayers = useRef(new Set());
  const previousProjectId = useRef(null);

  useEffect(() => {
    

    if (!mapInstanceRef.current || !allLayers || allLayers.length === 0) {
      return;
    }

    const map = mapInstanceRef.current;

    const currentProjectId = allLayers.length > 0 ? allLayers[0]?.group_id : null;
    
    if (previousProjectId.current !== null && 
        previousProjectId.current !== currentProjectId) {
      // Cambió de proyecto → Limpiar todas las capas del proyecto anterior
      
      layerService.clearAllLayers(map);
      previousVisibleLayers.current.clear();
    }
    
    previousProjectId.current = currentProjectId;

    // Detectar cambios en capas visibles
    const layersToAdd = [];
    const layersToRemove = [];

    // Capas que se activaron (están en visibleLayers pero no en previousVisibleLayers)
    visibleLayers.forEach(layerId => {
      if (!previousVisibleLayers.current.has(layerId)) {
        layersToAdd.push(layerId);
      }
    });

    // Capas que se desactivaron (están en previousVisibleLayers pero no en visibleLayers)
    previousVisibleLayers.current.forEach(layerId => {
      if (!visibleLayers.has(layerId)) {
        layersToRemove.push(layerId);
      }
    });

    

    // Añadir capas nuevas
    layersToAdd.forEach(layerId => {
      const layerData = allLayers.find(l => l.layer_id === layerId);
      
      if (layerData) {
        
        
        // Determinar tipo de geometría desde el nombre de tabla
        let geometryType = null;
        const tableName = layerData.postgis_table || layerData.layer_code || '';
        
        if (tableName.endsWith('_C')) {
          geometryType = 'Point';
        } else if (tableName.endsWith('_L')) {
          geometryType = 'LineString';
        } else if (tableName.endsWith('_S')) {
          geometryType = 'Polygon';
        }

        // 🎨 NUEVO: Pasar style_config si existe en layerData
        const styleConfig = layerData.style_config || null;

        layerService.addLayerToMap(
          map,
          layerId,
          layerData.layer_name,
          geometryType,
          styleConfig
        );
      }
    });

    // Remover capas desactivadas
    layersToRemove.forEach(layerId => {
      const layerData = allLayers.find(l => l.layer_id === layerId);
      
      
      layerService.removeLayerFromMap(map, layerId);
    });

    // Actualizar referencia anterior
    previousVisibleLayers.current = new Set(visibleLayers);

  }, [mapInstanceRef, visibleLayers, allLayers]);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        
        layerService.clearAllLayers(mapInstanceRef.current);
      }
    };
  }, [mapInstanceRef]);

  return {
    // Funciones útiles para exportar
    zoomToLayer: (layerId) => {
      if (mapInstanceRef.current) {
        layerService.zoomToLayer(mapInstanceRef.current, layerId);
      }
    },
    getActiveLayersCount: () => layerService.getActiveLayersCount(),
    isLayerActive: (layerId) => layerService.isLayerActive(layerId),
    
    // 🎨 NUEVO: Actualizar estilo de una capa en tiempo real
    updateLayerStyle: async (layerId, newStyleConfig) => {
      const result = await layerService.updateLayerStyle(layerId, newStyleConfig);
      
      return result;  // ← Asegúrate de que esté este return
    }
  };
}