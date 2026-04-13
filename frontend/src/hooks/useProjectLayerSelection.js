// /home/pablold/visor-gis/frontend/src/hooks/useProjectLayerSelection.js
// Hook para detectar clicks en features de capas de proyecto y mostrar info en panel derecho

import { useEffect } from 'react';

export default function useProjectLayerSelection({
  mapInstanceRef,
  setSelectedFeature,
  isEnabled = true // Permite desactivar cuando hay otros modos activos (crear/eliminar antenas, medir)
}) {
  useEffect(() => {
    if (!mapInstanceRef?.current || !isEnabled) return;

    const map = mapInstanceRef.current;

    const handleClick = (evt) => {
      // Buscar feature en las capas de proyecto (z-index 100)
      let clickedFeature = null;
      let clickedLayer = null;

      map.forEachFeatureAtPixel(evt.pixel, (feature, layer) => {
        // Solo capturar features de capas de proyecto (z-index 100)
        const zIndex = layer?.getZIndex();
        if (zIndex === 100) {
          clickedFeature = feature;
          clickedLayer = layer;
          return true; // Detener búsqueda en la primera feature encontrada
        }
      });

      if (!clickedFeature || !clickedLayer) {
        return; // No se clickó en una capa de proyecto
      }

      // Obtener propiedades del feature
      const properties = clickedFeature.getProperties();
      
      // Filtrar la geometría (no queremos mostrarla en el panel)
      const { geometry, ...cleanProperties } = properties;

      // Obtener metadata de la capa
      const layerName = clickedLayer.get('name') || 'Capa desconocida';
      const layerId = clickedLayer.get('layerId');

      // Construir objeto de feature para el panel derecho
      const featureData = {
        layerId,
        layerName,
        properties: cleanProperties,
        featureId: clickedFeature.getId() || null
      };

      

      // Pasar al panel derecho
      setSelectedFeature(featureData);

      // Opcional: Zoom al feature
      const geometry_obj = clickedFeature.getGeometry();
      if (geometry_obj) {
        const extent = geometry_obj.getExtent();
        map.getView().fit(extent, {
          padding: [50, 50, 50, 50],
          duration: 500,
          maxZoom: 18
        });
      }
    };

    map.on('singleclick', handleClick);

    return () => {
      map.un('singleclick', handleClick);
    };
  }, [mapInstanceRef, setSelectedFeature, isEnabled]);
}
