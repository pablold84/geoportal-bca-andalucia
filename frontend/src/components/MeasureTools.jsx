import { useEffect, useRef, useState } from 'react';
import { Draw } from 'ol/interaction';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Style, Stroke, Fill, Circle as CircleStyle } from 'ol/style';
import Overlay from 'ol/Overlay';
import { getLength, getArea } from 'ol/sphere';
import GeoJSON from 'ol/format/GeoJSON';
import WKT from 'ol/format/WKT';
import { KML } from 'ol/format';
import { Button } from 'react-bootstrap';

const MeasureTools = ({
  map,
  measureDistanceEnabled,
  measureAreaEnabled,
  clearMeasurements,
  onClearDone,
  exportGeoJSON,
  exportWKT,
  exportKML,
  onExportDone,
  onHasMeasurementsChange
}) => {
  const sourceRef = useRef(null);
  const layerRef = useRef(null);
  const drawRef = useRef(null);
  const overlayRef = useRef(null);
  const [hasMeasurements, setHasMeasurements] = useState(false);

  useEffect(() => {
    if (!map) return;

    const source = new VectorSource();
    const layer = new VectorLayer({
      source,
      style: new Style({
        stroke: new Stroke({ color: '#D29F2A', width: 3 }),
        fill: new Fill({ color: 'rgba(210,159,42,0.3)' }),
        image: new CircleStyle({
          radius: 5,
          fill: new Fill({ color: '#D29F2A' })
        }),
      }),
    });

    map.addLayer(layer);
    sourceRef.current = source;
    layerRef.current = layer;

    source.on('addfeature', () => setHasMeasurements(true));
    source.on('removefeature', () => setHasMeasurements(source.getFeatures().length > 0));
    source.on('clear', () => setHasMeasurements(false));

    return () => map.removeLayer(layer);
  }, [map]);

  useEffect(() => {
    if (typeof onHasMeasurementsChange === 'function') {
      onHasMeasurementsChange(hasMeasurements);
    }
  }, [hasMeasurements, onHasMeasurementsChange]);

  useEffect(() => {
    if (!clearMeasurements || !map) return;

    sourceRef.current?.clear();
    if (drawRef.current) {
      map.removeInteraction(drawRef.current);
      drawRef.current = null;
    }
    if (overlayRef.current) {
      map.removeOverlay(overlayRef.current);
      overlayRef.current = null;
    }
    map.getTargetElement().style.cursor = '';
    onClearDone();
  }, [clearMeasurements, map, onClearDone]);

  useEffect(() => {
    if (!exportGeoJSON || !sourceRef.current || !hasMeasurements) return;

    const features = sourceRef.current.getFeatures();
    if (!features.length) return onExportDone();

    const format = new GeoJSON();
    const geojson = format.writeFeatures(features, {
      featureProjection: map.getView().getProjection(),
      dataProjection: 'EPSG:4326'
    });

    const filename = generateFilename(measureAreaEnabled, 'geojson');
    downloadFile(geojson, filename, 'application/json');
    onExportDone();
  }, [exportGeoJSON, map, measureAreaEnabled, hasMeasurements, onExportDone]);

  useEffect(() => {
    if (!exportWKT || !sourceRef.current || !hasMeasurements) return;

    const features = sourceRef.current.getFeatures();
    if (!features.length) return onExportDone();

    const format = new WKT();
    const wkts = features.map(f => format.writeFeature(f, {
      featureProjection: map.getView().getProjection(),
      dataProjection: 'EPSG:25830'
    })).join('\n');

    const filename = generateFilename(measureAreaEnabled, 'wkt');
    downloadFile(wkts, filename, 'text/plain');
    onExportDone();
  }, [exportWKT, map, measureAreaEnabled, hasMeasurements, onExportDone]);

  useEffect(() => {
    if (!exportKML || !sourceRef.current || !hasMeasurements) return;

    const features = sourceRef.current.getFeatures();
    if (!features.length) return onExportDone();

    const format = new KML();
    const kmlStr = format.writeFeatures(features, {
      featureProjection: map.getView().getProjection(),
      dataProjection: 'EPSG:4326'
    });

    const filename = generateFilename(measureAreaEnabled, 'kml');
    downloadFile(kmlStr, filename, 'application/vnd.google-earth.kml+xml');
    onExportDone();
  }, [exportKML, map, measureAreaEnabled, hasMeasurements, onExportDone]);

  useEffect(() => {
    if (!map || (!measureDistanceEnabled && !measureAreaEnabled)) return;

    if (drawRef.current) map.removeInteraction(drawRef.current);

    const tooltip = document.createElement('div');
    tooltip.className = 'popup-corporativo';
    const overlay = new Overlay({
      element: tooltip,
      offset: [0, -12],
      positioning: 'bottom-center'
    });
    map.addOverlay(overlay);
    overlayRef.current = overlay;

    const type = measureAreaEnabled ? 'Polygon' : 'LineString';
    const draw = new Draw({
      source: sourceRef.current,
      type
    });

    map.addInteraction(draw);
    drawRef.current = draw;

    draw.on('drawstart', (evt) => {
      const geom = evt.feature.getGeometry();
      geom.on('change', () => {
        let text = '';
        if (type === 'LineString') {
          const length = getLength(geom, { projection: map.getView().getProjection() });
          text = length > 1000 
            ? `${(length / 1000).toFixed(2)} km` 
            : `${length.toFixed(1)} m`;
        } else {
          const area = getArea(geom, { projection: map.getView().getProjection() });
          text = area > 1e6 
            ? `${(area / 1e6).toFixed(2)} km²` 
            : `${area.toFixed(1)} m²`;
        }
        tooltip.innerHTML = `📐 ${text}`;
        overlay.setPosition(geom.getLastCoordinate());
      });
    });

    return () => {
      map.removeInteraction(draw);
      map.removeOverlay(overlay);
    };
  }, [map, measureDistanceEnabled, measureAreaEnabled]);

  return null;
};

export const ExportMeasureButtons = ({ 
  onExportGeoJSON, 
  onExportWKT,
  onExportKML,
  onClearMeasurements, 
  disabled 
}) => (
  <div className="mb-3">
    <div style={{ 
      fontSize: '0.85rem', 
      fontWeight: '600',
      color: 'var(--bs-warning)',
      marginBottom: '0.5rem'
    }}>
      📥 Exportar mediciones
    </div>
    
    <div className="d-flex flex-column gap-1">
      <Button
        className="btn-corporate-guardar d-flex align-items-center justify-content-start"
        size="sm"
        onClick={onExportGeoJSON}
        disabled={disabled}
        title={disabled ? "Solo disponible para administradores" : ""}
      >
        📥 Exportar GeoJSON
      </Button>
      
      <Button
        className="btn-corporate-guardar d-flex align-items-center justify-content-start"
        size="sm"
        onClick={onExportWKT}
        disabled={disabled}
        title={disabled ? "Solo disponible para administradores" : ""}
      >
        📥 Exportar WKT
      </Button>

      <Button
        className="btn-corporate-guardar d-flex align-items-center justify-content-start"
        size="sm"
        onClick={onExportKML}
        disabled={disabled}
        title={disabled ? "Solo disponible para administradores" : ""}
      >
        📥 Exportar KML
      </Button>

      <Button
        variant="outline-secondary"
        size="sm"
        onClick={onClearMeasurements}
        disabled={disabled}
        title={disabled ? "Solo disponible para administradores" : "Limpiar todas las mediciones"}
        style={{ 
          width: 'fit-content',
          marginTop: '0.5rem'
        }}
      >
        🗑️ Limpiar
      </Button>
    </div>
  </div>
);

function generateFilename(isArea, ext) {
  const now = new Date();
  const pad = n => n.toString().padStart(2, '0');
  const dateStr = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const type = isArea ? 'polygon' : 'line';
  return `mediciones_${dateStr}_${type}.${ext}`;
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default MeasureTools;
