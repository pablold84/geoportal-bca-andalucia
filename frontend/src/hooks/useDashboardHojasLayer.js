import { useEffect, useRef } from 'react';
import { fetchWithAuth } from '../utils/fetchWithAuth';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import { Style, Fill, Stroke } from 'ol/style';
import { API_BASE } from '../config';

const useDashboardHojasLayer = ({ mapInstanceRef, showDashboardLayer }) => {
  const layerRef = useRef(null);

  useEffect(() => {
    if (!mapInstanceRef.current || !showDashboardLayer) {
      if (layerRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(layerRef.current);
        layerRef.current = null;
      }
      return;
    }

    const map = mapInstanceRef.current;

    if (!layerRef.current) {
      const vectorSource = new VectorSource();

      const vectorLayer = new VectorLayer({
        source: vectorSource,
        style: (feature) => {
          const faseActual = feature.get('fase_actual');

          const colorMap = {
            'produccion_completa': '#2d6a4f',
            'produccion_qc':       '#f4a261',
            'edicion_completa':    '#52b788',
            'edicion_qc':          '#e9c46a',
            'editando':            '#457b9d',
            'restitucion_completa':'#e76f51',
            'restitucion_qc':      '#f77f00',
            'en_restitucion':      '#f4a261',
            'sin_estado':          '#9ca3af'
          };

          const fillColor = colorMap[faseActual] || '#6c757d';

          return new Style({
            fill: new Fill({ color: fillColor + '80' }),
            stroke: new Stroke({ color: fillColor, width: 3 })
          });
        },
        zIndex: 1000,
        visible: true
      });

      layerRef.current = vectorLayer;
      map.addLayer(vectorLayer);

      const fetchHojasGeoJSON = async () => {
        try {
          const res = await fetchWithAuth(`${API_BASE}/dashboard/bca/hojas/geojson`, {
          });

          if (!res.ok) return;

          const geojsonData = await res.json();

          const features = new GeoJSON().readFeatures(geojsonData, {
            dataProjection: 'EPSG:4326',
            featureProjection: 'EPSG:25830'
          });

          vectorSource.addFeatures(features);

          const extent = vectorSource.getExtent();
          map.getView().fit(extent, {
            padding: [50, 50, 50, 50],
            duration: 1000
          });
        } catch {
          // error de red silencioso
        }
      };

      fetchHojasGeoJSON();
    }

    return () => {
      if (layerRef.current && map) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [mapInstanceRef, showDashboardLayer]);

  return { layerRef };
};

export default useDashboardHojasLayer;