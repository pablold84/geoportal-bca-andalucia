import React, { useState, useEffect, useCallback } from 'react';
import { fetchWithAuth } from '../utils/fetchWithAuth';
import { Form, Button, ListGroup, Spinner } from 'react-bootstrap';
import GeoJSON from 'ol/format/GeoJSON';
import WKT from 'ol/format/WKT';
import { KML } from 'ol/format';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { transform } from 'ol/proj';
import { API_BASE } from '../config';

const AntennaSearch = ({
  onSelectFeature,
  mapInstanceRef,
  vectorLayerRef,
  showExportButton = false
}) => {
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredOptions, setFilteredOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  };

  const buildLabel = (u) => {
    const parts = [];
    if (u.codigo_emplazamiento) parts.push(u.codigo_emplazamiento);
    if (u.provincia)            parts.push(u.provincia);
    if (u.ayuntamiento)         parts.push(u.ayuntamiento);
    if (u.direccion)            parts.push(u.direccion.length > 40 ? u.direccion.substring(0, 40) + '...' : u.direccion);
    return parts.join(' • ');
  };

  const searchAntenas = useCallback(async (searchTerm) => {
    if (!searchTerm.trim() || searchTerm.trim().length < 2) {
      setFilteredOptions([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetchWithAuth(
        `${API_BASE}/unidades?search=${encodeURIComponent(searchTerm)}&limit=50`,
      );

      if (!response.ok) throw new Error('Error en la búsqueda');

      const result = await response.json();
      if (!result.data || !Array.isArray(result.data)) {
        setFilteredOptions([]);
        return;
      }

      setFilteredOptions(result.data.map(u => ({
        value: u.ubicacion_id,
        estacion_id: u.estacion_id,
        label: buildLabel(u),
        feature: { ...u, ubicacion_id: u.ubicacion_id, estacion_id: u.estacion_id }
      })));
    } catch {
      setFilteredOptions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const debouncedSearch = useCallback(
    debounce((searchTerm) => searchAntenas(searchTerm), 300),
    [searchAntenas]
  );

  useEffect(() => {
    if (searchText.trim().length >= 2) {
      debouncedSearch(searchText);
      setShowDropdown(true);
    } else {
      setFilteredOptions([]);
      setShowDropdown(false);
    }
  }, [searchText, debouncedSearch]);

  const handleSelectOption = (option) => {
    setSearchText(option.label);
    setShowDropdown(false);
    setFilteredOptions([]);
    setSelectedFeature(option.feature);

    const featureData = {
      ...option.feature,
      ubicacion_id: option.value || option.feature.ubicacion_id,
      estacion_id:  option.estacion_id || option.feature.estacion_id
    };

    onSelectFeature(featureData);

    if (window.innerWidth < 1200) {
      setTimeout(() => { if (window.__setPanelOpen) window.__setPanelOpen(true); }, 350);
    }

    if (mapInstanceRef?.current && vectorLayerRef?.current) {
      const source = vectorLayerRef.current.getSource();
      source.getFeatures().forEach(f => f.set('selected', false));

      const clickedFeature = source.getFeatures().find(
        f => Number(f.get('ubicacion_id')) === Number(option.value)
      );
      if (clickedFeature) clickedFeature.set('selected', true);
      vectorLayerRef.current.changed();

      if (typeof mapInstanceRef.current.getView === 'function') {
        const view = mapInstanceRef.current.getView();
        let center = null;

        if (option.feature.x && option.feature.y) {
          center = [Number(option.feature.x), Number(option.feature.y)];
        } else if (option.feature.lon !== undefined && option.feature.lat !== undefined) {
          center = transform([Number(option.feature.lon), Number(option.feature.lat)], 'EPSG:4326', 'EPSG:25830');
        }

        if (center) view.animate({ center, zoom: 18, duration: 700 });
      }
    }
  };

  const handleClearSearch = () => {
    setSearchText('');
    setShowDropdown(false);
    setFilteredOptions([]);
    setSelectedFeature(null);
    onSelectFeature(null);
  };

  const getDateString = () => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  };

  const getCoordinates = () => {
    if (!selectedFeature) return null;
    if (selectedFeature.geompoint) {
      const coords = selectedFeature.geompoint.coordinates;
      if (Array.isArray(coords) && coords.length === 2) return coords;
    }
    const lon = Number(selectedFeature.lon);
    const lat = Number(selectedFeature.lat);
    if (!isFinite(lon) || !isFinite(lat)) return null;
    return [lon, lat];
  };

  const downloadFile = (content, filename, type) => {
    const blob = new Blob([content], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const downloadGeoJSON = () => {
    const coords = getCoordinates();
    if (!coords) return;
    const geojson = new GeoJSON().writeFeatures([new Feature({ geometry: new Point(coords), ...selectedFeature })], { featureProjection: 'EPSG:4326' });
    downloadFile(geojson, `antena_${getDateString()}_point.geojson`, 'application/json');
  };

  const downloadWKT = () => {
    const coords = getCoordinates();
    if (!coords) return;
    const wktStr = new WKT().writeFeature(new Feature({ geometry: new Point(coords), ...selectedFeature }));
    downloadFile(wktStr, `antena_${getDateString()}_point.wkt`, 'text/plain');
  };

  const downloadKML = () => {
    const coords = getCoordinates();
    if (!coords) return;
    const kmlStr = new KML().writeFeatures([new Feature({ geometry: new Point(coords), ...selectedFeature })], { featureProjection: 'EPSG:4326' });
    downloadFile(kmlStr, `antena_${getDateString()}_point.kml`, 'application/vnd.google-earth.kml+xml');
  };

  return (
    <div style={{ position: 'relative' }}>
      <Form.Group className="mb-3">
        <div style={{ position: 'relative' }}>
          <Form.Control
            type="text"
            size="sm"
            placeholder="Ej: 3300708, León, PARCELA 419..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onFocus={() => !selectedFeature && searchText.trim().length >= 2 && setShowDropdown(true)}
            disabled={!!selectedFeature}
            style={{ paddingRight: searchText ? '30px' : '8px', backgroundColor: selectedFeature ? '#f8f9fa' : 'white', cursor: selectedFeature ? 'not-allowed' : 'text' }}
          />

          {searchText && (
            <button onClick={handleClearSearch} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1rem', color: '#6c757d', padding: '0 4px' }}>
              ✕
            </button>
          )}

          {isLoading && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, padding: '12px', backgroundColor: 'white', border: '1px solid #dee2e6', borderRadius: '4px', marginTop: '2px', fontSize: '0.85rem', color: '#6c757d', zIndex: 1000, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Spinner animation="border" size="sm" /> Buscando...
            </div>
          )}

          {showDropdown && !isLoading && !selectedFeature && filteredOptions.length > 0 && (
            <ListGroup style={{ position: 'absolute', top: '100%', left: 0, right: 0, maxHeight: '300px', overflowY: 'auto', zIndex: 1000, marginTop: '2px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', fontSize: '0.85rem' }}>
              {filteredOptions.map((opt) => (
                <ListGroup.Item key={opt.value} action onClick={() => handleSelectOption(opt)} style={{ cursor: 'pointer', padding: '10px 12px' }}>
                  <div style={{ fontSize: '0.9rem', marginBottom: '4px' }}>{opt.label}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>ID: {opt.value}</div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}

          {showDropdown && !isLoading && !selectedFeature && searchText.trim().length >= 2 && filteredOptions.length === 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, padding: '12px', backgroundColor: 'white', border: '1px solid #dee2e6', borderRadius: '4px', marginTop: '2px', fontSize: '0.85rem', color: '#6c757d', zIndex: 1000 }}>
              No se encontraron antenas con ese criterio
            </div>
          )}

          {!selectedFeature && searchText.trim().length === 1 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, padding: '12px', backgroundColor: 'white', border: '1px solid #dee2e6', borderRadius: '4px', marginTop: '2px', fontSize: '0.85rem', color: '#6c757d', zIndex: 1000 }}>
              Escribe al menos 2 caracteres para buscar
            </div>
          )}
        </div>
      </Form.Group>

      {showExportButton && selectedFeature && (
        <>
          <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--bs-warning)', marginBottom: '0.5rem' }}>
            Exportar antena
          </div>
          <div className="d-flex flex-column gap-1">
            <Button size="sm" className="btn-corporate-guardar d-flex align-items-center justify-content-start" onClick={downloadGeoJSON}>Exportar GeoJSON</Button>
            <Button size="sm" className="btn-corporate-guardar d-flex align-items-center justify-content-start" onClick={downloadWKT}>Exportar WKT</Button>
            <Button size="sm" className="btn-corporate-guardar d-flex align-items-center justify-content-start" onClick={downloadKML}>Exportar KML</Button>
          </div>
        </>
      )}
    </div>
  );
};

export default AntennaSearch;