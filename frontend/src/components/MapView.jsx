import React, { useImperativeHandle, useRef, forwardRef, useEffect } from 'react';
import { fetchWithAuth } from '../utils/fetchWithAuth';
import 'ol/ol.css';
import { transform } from 'ol/proj';
import proj4 from 'proj4';
import { register } from 'ol/proj/proj4';

import useCreateMap from '../hooks/useCreateMap';
import useScaleControl from '../hooks/useScaleControl';
import useLayerVisibility from '../hooks/useLayerVisibility';
import useAntennaSelection from '../hooks/useAntennaSelection';
import useCatastroInfo from '../hooks/useCatastroInfo';
import useProjectLayers from '../hooks/useProjectLayers';

import MeasureTools from './MeasureTools';
import CatastroPopup from './CatastroPopup';
import useAntennaCoverage from '../hooks/useAntennaCoverage';
import useProjectLayerSelection from '../hooks/useProjectLayerSelection';
import useDashboardHojasLayer from '../hooks/useDashboardHojasLayer';
import useProjectLayerTooltip from '../hooks/useProjectLayerTooltip';
import { API_BASE } from '../config';

proj4.defs('EPSG:25830', '+proj=utm +zone=30 +ellps=GRS80 +units=m +no_defs');
register(proj4);

const MapView = forwardRef(({
  unidades,
  vectorLayerRef,
  setSelectedFeature,
  osmVisible,
  catastroVisible,
  pnoaVisible,
  wmsVisible,
  scale = 1000,
  measureDistanceEnabled,
  measureAreaEnabled,
  clearMeasurements,
  onClearDone,
  exportGeoJSON,
  exportWKT,
  exportKML,
  onExportDone,
  onHasMeasurementsChange,
  leftPanelCollapsed,
  setLeftPanelCollapsed,
  isMeasuringActive,
  coverageInfo,
  panelOpen,
  setPanelOpen,
  newAntennaMode,
  onAntennaCreated,
  setNewAntennaMode,
  deleteAntennaMode,
  projectLayersState,
  showHojasLayer
}, ref) => {

  const mapRef = useRef(null);

  const { mapInstanceRef, osmLayerRef, catastroLayerRef, pnoaLayerRef, vectorLayerRef: internalVectorLayerRef } =
    useCreateMap({
      mapContainerRef: mapRef,
      osmVisible,
      catastroVisible,
      pnoaVisible,
      vectorVisible: wmsVisible,
      scale
    });

  useEffect(() => {
    if (vectorLayerRef && internalVectorLayerRef.current) {
      vectorLayerRef.current = internalVectorLayerRef.current;
    }
    return () => {
      if (vectorLayerRef) vectorLayerRef.current = null;
    };
  }, [vectorLayerRef, internalVectorLayerRef]);

  useScaleControl(mapInstanceRef, mapRef, scale);

  useLayerVisibility({
    mapInstanceRef,
    osmLayerRef,
    pnoaLayerRef,
    catastroLayerRef,
    vectorLayerRef: internalVectorLayerRef,
    osmVisible,
    pnoaVisible,
    catastroVisible,
    vectorVisible: wmsVisible
  });

  useAntennaSelection({
    mapInstanceRef,
    vectorLayerRef: internalVectorLayerRef,
    unidades,
    vectorVisible: wmsVisible,
    setSelectedFeature
  });

  useProjectLayerSelection({
    mapInstanceRef,
    setSelectedFeature,
    isEnabled: !newAntennaMode && !deleteAntennaMode && !isMeasuringActive
  });

  useProjectLayerTooltip({
    mapInstanceRef,
    isEnabled: !newAntennaMode && !deleteAntennaMode && !isMeasuringActive
  });

  useAntennaCoverage({ mapInstanceRef, coverageInfo });

  const { updateLayerStyle } = useProjectLayers({
    mapInstanceRef,
    visibleLayers: projectLayersState?.visibleLayers || new Set(),
    allLayers: projectLayersState?.allLayers || []
  });

  useDashboardHojasLayer({
    mapInstanceRef,
    showDashboardLayer: showHojasLayer
  });

  const { catastroData, popupPosition, closeCatastroPopup } = useCatastroInfo({
    mapInstanceRef,
    catastroLayerRef,
    catastroVisible,
    isMeasuringActive
  });

  const handleCreateAntenna = async (coordinate) => {
    if (!newAntennaMode) return;

    try {
      const [lon, lat] = transform(coordinate, 'EPSG:25830', 'EPSG:4326');

      const response = await fetchWithAuth(`${API_BASE}/estaciones/crear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lon, lat })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al crear la antena');
      }

      const result = await response.json();

      alert(`Antena creada correctamente\nCódigo: ${result.data.codigo_emplazamiento}\nID Estación: ${result.data.estacion_id}`);

      if (internalVectorLayerRef.current) {
        const source = internalVectorLayerRef.current.getSource();
        source.clear();
        source.refresh();
      }

      if (onAntennaCreated) onAntennaCreated();
      if (setNewAntennaMode) setNewAntennaMode(false);

    } catch (error) {
      alert(`Error al crear la antena: ${error.message}`);
    }
  };

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const map = mapInstanceRef.current;

    const handleMapClick = (evt) => {
      if (newAntennaMode) {
        evt.preventDefault();
        evt.stopPropagation();
        handleCreateAntenna(evt.coordinate);
        return;
      }

      if (deleteAntennaMode) {
        let clickedFeature = null;
        mapInstanceRef.current.forEachFeatureAtPixel(evt.pixel, (feature) => {
          clickedFeature = feature;
          return true;
        });

        if (clickedFeature && window.__selectAntennaForDelete) {
          const featureProps = clickedFeature.getProperties();

          if (vectorLayerRef?.current) {
            const source = vectorLayerRef.current.getSource();
            source.getFeatures().forEach(f => f.set('selected', false));
            clickedFeature.set('selected', true);
            vectorLayerRef.current.changed();
          }

          window.__selectAntennaForDelete(featureProps);
        }
        return;
      }

      let clickedOnFeature = false;
      mapInstanceRef.current.forEachFeatureAtPixel(evt.pixel, () => {
        clickedOnFeature = true;
        return true;
      });

      const isMobileOrTablet = window.innerWidth < 1200;
      if (isMobileOrTablet) {
        if (!leftPanelCollapsed) setLeftPanelCollapsed(true);
        if (panelOpen && !clickedOnFeature) setPanelOpen(false);
      }
    };

    map.on('singleclick', handleMapClick);
    return () => { map.un('singleclick', handleMapClick); };
  }, [mapInstanceRef, newAntennaMode, deleteAntennaMode, leftPanelCollapsed, setLeftPanelCollapsed, panelOpen, setPanelOpen, onAntennaCreated, setNewAntennaMode]);

  useEffect(() => {
    if (!mapRef.current) return;
    if (newAntennaMode)      mapRef.current.style.cursor = 'crosshair';
    else if (deleteAntennaMode) mapRef.current.style.cursor = 'not-allowed';
    else                     mapRef.current.style.cursor = '';
  }, [newAntennaMode, deleteAntennaMode]);

  const previousMeasureState = useRef({ distance: false, area: false });

  useEffect(() => {
    const measureJustActivated =
      (!previousMeasureState.current.distance && measureDistanceEnabled) ||
      (!previousMeasureState.current.area && measureAreaEnabled);

    if ((measureJustActivated || deleteAntennaMode) && newAntennaMode) {
      if (setNewAntennaMode) setNewAntennaMode(false);
    }

    previousMeasureState.current = { distance: measureDistanceEnabled, area: measureAreaEnabled };
  }, [measureDistanceEnabled, measureAreaEnabled, newAntennaMode, deleteAntennaMode, setNewAntennaMode]);

  const markFeatureSelected = (feature) => {
    if (!internalVectorLayerRef?.current || !feature) return;
    const source = internalVectorLayerRef.current.getSource();
    source.getFeatures().forEach(f => f.set('selected', false));
    const clickedFeature = source.getFeatures().find(
      f => Number(f.get('ubicacion_id')) === Number(feature.ubicacion_id)
    );
    if (clickedFeature) clickedFeature.set('selected', true);
    internalVectorLayerRef.current.changed();
  };

  useImperativeHandle(ref, () => ({
    zoomToFeature(feature) {
      if (!mapInstanceRef.current || !feature) return;
      const view = mapInstanceRef.current.getView();
      let center = null;

      if (feature.x && feature.y) {
        center = [Number(feature.x), Number(feature.y)];
      } else if (feature.lon !== undefined && feature.lat !== undefined) {
        center = transform([Number(feature.lon), Number(feature.lat)], 'EPSG:4326', 'EPSG:25830');
      }

      if (!center) return;
      view.animate({ center, zoom: 20, duration: 700 });
      markFeatureSelected(feature);
    },

    setScale(newScale) {
      if (!mapInstanceRef.current || newScale <= 0) return;
      mapInstanceRef.current.getView().setResolution(0.00028 * newScale);
    },

    getView() {
      return mapInstanceRef.current?.getView();
    },

    updateLayerStyle: async (layerId, newStyleConfig) => {
      if (updateLayerStyle) return await updateLayerStyle(layerId, newStyleConfig);
      return false;
    }
  }));

  return (
    <>
      <div ref={mapRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
        {catastroData && (
          <CatastroPopup data={catastroData} position={popupPosition} onClose={closeCatastroPopup} />
        )}

        {newAntennaMode && (
          <div style={{
            position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)',
            backgroundColor: 'rgba(210, 159, 42, 0.95)', color: 'var(--bs-primary)',
            padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: '600', fontSize: '0.9rem',
            zIndex: 1000, boxShadow: '0 2px 8px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: '0.5rem'
          }}>
            Click en el mapa para crear nueva antena
          </div>
        )}
      </div>

      {mapInstanceRef.current && (
        <MeasureTools
          map={mapInstanceRef.current}
          measureDistanceEnabled={measureDistanceEnabled}
          measureAreaEnabled={measureAreaEnabled}
          clearMeasurements={clearMeasurements}
          onClearDone={onClearDone}
          exportGeoJSON={exportGeoJSON}
          exportWKT={exportWKT}
          exportKML={exportKML}
          onExportDone={onExportDone}
          onHasMeasurementsChange={onHasMeasurementsChange}
        />
      )}
    </>
  );
});

export default MapView;