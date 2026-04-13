import React, { useState, useEffect, useCallback } from 'react';
import { fetchWithAuth } from '../utils/fetchWithAuth';
import { Form, Button, Accordion, Card, ListGroup, Spinner } from 'react-bootstrap';
import GeoJSON from 'ol/format/GeoJSON';
import WKT from 'ol/format/WKT';
import { KML } from 'ol/format';
import Feature from 'ol/Feature';
import { Circle as CircleGeom, Polygon } from 'ol/geom';
import { fromCircle } from 'ol/geom/Polygon';
import { transform } from 'ol/proj';
import { API_BASE } from '../config';

const AntennaCoverage = ({
  onSelectFeature,
  onCoverageCalculated,
  showExportButtons = false
}) => {
  const [selectedAntenna, setSelectedAntenna] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredOptions, setFilteredOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const [parameters, setParameters] = useState({
    height: 50, azimuth: 0, tilt: 0, roll: 0,
    openingAngle: 65, maxRange: 2000, antennaType: 'AVQUE'
  });
  const [coverageInfo, setCoverageInfo] = useState(null);

  useEffect(() => {
    return () => {
      if (onCoverageCalculated) onCoverageCalculated(null);
      if (onSelectFeature)      onSelectFeature(null);
    };
  }, []);

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
        label: buildLabel(u),
        feature: u
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
    setSelectedAntenna(option.feature);
    if (option.feature.altura) setParameters(prev => ({ ...prev, height: option.feature.altura }));
    if (onSelectFeature) onSelectFeature(option.feature);
  };

  const handleClearSearch = () => {
    setSearchText(''); setShowDropdown(false); setFilteredOptions([]);
    setSelectedAntenna(null); setCoverageInfo(null);
    if (onSelectFeature)      onSelectFeature(null);
    if (onCoverageCalculated) onCoverageCalculated(null);
  };

  const handleNumberInput = (field, value) => {
    if (value === '') { setParameters(prev => ({ ...prev, [field]: '' })); return; }
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) setParameters(prev => ({ ...prev, [field]: numValue }));
  };

  const validateParameters = () => {
    return ['height', 'azimuth', 'maxRange'].every(f => parameters[f] !== '' && parameters[f] !== null);
  };

  const calculateCoverage = () => {
    if (!selectedAntenna)      { alert('Selecciona una antena primero'); return; }
    if (!validateParameters()) { alert('Por favor completa todos los campos requeridos'); return; }

    const params = {
      ...parameters,
      height: parameters.height || 0, tilt: parameters.tilt || 0,
      roll: parameters.roll || 0,     azimuth: parameters.azimuth || 0,
      openingAngle: parameters.openingAngle || 0, maxRange: parameters.maxRange || 0
    };

    const radius    = params.maxRange;
    const areaKm2   = (Math.PI * Math.pow(radius, 2) / 1000000).toFixed(2);
    const heightFactor = Math.sqrt(params.height / 50);
    const tiltFactor   = 1 + (Math.abs(params.tilt) * 0.01);
    const adjustedRange = (radius * heightFactor * tiltFactor).toFixed(0);

    const info = {
      antenna: selectedAntenna, parameters: params,
      calculatedRange: adjustedRange, area: areaKm2,
      coverage: { lat: selectedAntenna.lat, lon: selectedAntenna.lon, radius: adjustedRange, azimuth: params.azimuth, openingAngle: params.openingAngle }
    };

    setCoverageInfo(info);
    if (onCoverageCalculated) onCoverageCalculated(info);
  };

  const clearCoverage = () => {
    setCoverageInfo(null);
    if (onCoverageCalculated) onCoverageCalculated(null);
  };

  const getDateString = () => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  };

  const createSectorPolygonGeographic = (centerLon, centerLat, radiusMeters, azimuth, opening) => {
    const points = [[centerLon, centerLat]];
    const radiusDegrees = radiusMeters / 111320;
    const azimuthRad  = azimuth  * (Math.PI / 180);
    const openingRad  = opening  * (Math.PI / 180);
    const startAngle  = azimuthRad - openingRad / 2;
    const endAngle    = azimuthRad + openingRad / 2;
    const angleStep   = (endAngle - startAngle) / 64;
    for (let i = 0; i <= 64; i++) {
      const angle = startAngle + i * angleStep;
      points.push([centerLon + radiusDegrees * Math.sin(angle), centerLat + radiusDegrees * Math.cos(angle)]);
    }
    points.push([centerLon, centerLat]);
    return new Polygon([points]);
  };

  const createSectorPolygonProjected = (center, radius, azimuth, opening) => {
    const points = [center];
    const azimuthRad = (90 - azimuth) * (Math.PI / 180);
    const openingRad = opening * (Math.PI / 180);
    const startAngle = azimuthRad - openingRad / 2;
    const endAngle   = azimuthRad + openingRad / 2;
    const angleStep  = (endAngle - startAngle) / 64;
    for (let i = 0; i <= 64; i++) {
      const angle = startAngle + i * angleStep;
      points.push([center[0] + radius * Math.cos(angle), center[1] + radius * Math.sin(angle)]);
    }
    points.push(center);
    return new Polygon([points]);
  };

  const getCoverageGeometry = (forExport = false) => {
    if (!coverageInfo) return null;
    const { lat, lon, radius, azimuth, openingAngle } = coverageInfo.coverage;
    const radiusMeters = parseFloat(radius);

    if (forExport) {
      if (parseFloat(openingAngle) >= 360) {
        return fromCircle(new CircleGeom([parseFloat(lon), parseFloat(lat)], radiusMeters / 111320), 64);
      }
      return createSectorPolygonGeographic(parseFloat(lon), parseFloat(lat), radiusMeters, parseFloat(azimuth), parseFloat(openingAngle));
    } else {
      const center = transform([parseFloat(lon), parseFloat(lat)], 'EPSG:4326', 'EPSG:25830');
      if (parseFloat(openingAngle) >= 360) {
        return fromCircle(new CircleGeom(center, radiusMeters), 64);
      }
      return createSectorPolygonProjected(center, radiusMeters, parseFloat(azimuth), parseFloat(openingAngle));
    }
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
    const geometry = getCoverageGeometry(true);
    if (!geometry) return;
    const geojson = new GeoJSON().writeFeatures([new Feature({ geometry, type: 'antenna_coverage', antenna_id: selectedAntenna.ubicacion_id, azimuth: parameters.azimuth, opening_angle: parameters.openingAngle, range: coverageInfo.calculatedRange, area_km2: coverageInfo.area })], { featureProjection: 'EPSG:4326', dataProjection: 'EPSG:4326' });
    downloadFile(geojson, `cobertura_${getDateString()}_polygon.geojson`, 'application/json');
  };

  const downloadWKT = () => {
    const geometry = getCoverageGeometry(true);
    if (!geometry) return;
    const wktStr = new WKT().writeFeature(new Feature({ geometry }), { featureProjection: 'EPSG:4326', dataProjection: 'EPSG:4326' });
    downloadFile(wktStr, `cobertura_${getDateString()}_polygon.wkt`, 'text/plain');
  };

  const downloadKML = () => {
    const geometry = getCoverageGeometry(true);
    if (!geometry) return;
    const kmlStr = new KML().writeFeatures([new Feature({ geometry, name: `Cobertura Antena ${selectedAntenna.codigo_emplazamiento || selectedAntenna.ubicacion_id}`, description: `Rango: ${coverageInfo.calculatedRange}m | Área: ${coverageInfo.area}km² | Azimuth: ${parameters.azimuth}°` })], { featureProjection: 'EPSG:4326', dataProjection: 'EPSG:4326' });
    downloadFile(kmlStr, `cobertura_${getDateString()}_polygon.kml`, 'application/vnd.google-earth.kml+xml');
  };

  return (
    <div style={{ marginTop: '0' }}>
      <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--bs-warning)', marginBottom: '0.75rem' }}>
        Cobertura antenas
      </div>

      <Form.Group className="mb-3">
        <div style={{ position: 'relative' }}>
          <Form.Control type="text" size="sm" placeholder="Ej: 3300708, León, PARCELA 419..." value={searchText} onChange={(e) => setSearchText(e.target.value)} onFocus={() => !selectedAntenna && searchText.trim().length >= 2 && setShowDropdown(true)} disabled={!!selectedAntenna} style={{ paddingRight: searchText ? '30px' : '8px', backgroundColor: selectedAntenna ? '#f8f9fa' : 'white', cursor: selectedAntenna ? 'not-allowed' : 'text' }} />

          {searchText && (
            <button onClick={handleClearSearch} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1rem', color: '#6c757d', padding: '0 4px' }}>✕</button>
          )}

          {isLoading && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, padding: '12px', backgroundColor: 'white', border: '1px solid #dee2e6', borderRadius: '4px', marginTop: '2px', fontSize: '0.85rem', color: '#6c757d', zIndex: 1000, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Spinner animation="border" size="sm" /> Buscando...
            </div>
          )}

          {showDropdown && !isLoading && !selectedAntenna && filteredOptions.length > 0 && (
            <ListGroup style={{ position: 'absolute', top: '100%', left: 0, right: 0, maxHeight: '300px', overflowY: 'auto', zIndex: 1000, marginTop: '2px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', fontSize: '0.85rem' }}>
              {filteredOptions.map((opt) => (
                <ListGroup.Item key={opt.value} action onClick={() => handleSelectOption(opt)} style={{ cursor: 'pointer', padding: '10px 12px' }}>
                  <div style={{ fontSize: '0.9rem', marginBottom: '4px' }}>{opt.label}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>ID: {opt.value}</div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}

          {showDropdown && !isLoading && !selectedAntenna && searchText.trim().length >= 2 && filteredOptions.length === 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, padding: '12px', backgroundColor: 'white', border: '1px solid #dee2e6', borderRadius: '4px', marginTop: '2px', fontSize: '0.85rem', color: '#6c757d', zIndex: 1000 }}>
              No se encontraron antenas con ese criterio
            </div>
          )}

          {!selectedAntenna && searchText.trim().length === 1 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, padding: '12px', backgroundColor: 'white', border: '1px solid #dee2e6', borderRadius: '4px', marginTop: '2px', fontSize: '0.85rem', color: '#6c757d', zIndex: 1000 }}>
              Escribe al menos 2 caracteres para buscar
            </div>
          )}
        </div>
      </Form.Group>

      {selectedAntenna && (
        <>
          <Form.Group className="mb-2">
            <Form.Label style={{ fontSize: '0.85rem' }}>Altura (m)</Form.Label>
            <Form.Control type="number" size="sm" value={parameters.height} onChange={(e) => handleNumberInput('height', e.target.value)} onFocus={(e) => e.target.select()} placeholder="Altura en metros" />
          </Form.Group>

          <Form.Group className="mb-2">
            <Form.Label style={{ fontSize: '0.85rem' }}>Rango Máximo (m)</Form.Label>
            <Form.Control type="number" size="sm" value={parameters.maxRange} onChange={(e) => handleNumberInput('maxRange', e.target.value)} onFocus={(e) => e.target.select()} placeholder="Rango en metros" />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label style={{ fontSize: '0.85rem' }}>Azimuth (°)</Form.Label>
            <Form.Control type="number" size="sm" value={parameters.azimuth} onChange={(e) => handleNumberInput('azimuth', e.target.value)} onFocus={(e) => e.target.select()} min="0" max="360" placeholder="0-360 grados" />
          </Form.Group>

          <Accordion className="mb-3">
            <Accordion.Item eventKey="0">
              <Accordion.Header><span style={{ fontSize: '0.85rem' }}>Parámetros Avanzados</span></Accordion.Header>
              <Accordion.Body>
                <Form.Group className="mb-2">
                  <Form.Label style={{ fontSize: '0.8rem' }}>Tilt (°)</Form.Label>
                  <Form.Control type="number" size="sm" value={parameters.tilt} onChange={(e) => handleNumberInput('tilt', e.target.value)} onFocus={(e) => e.target.select()} step="0.1" placeholder="Inclinación" />
                </Form.Group>
                <Form.Group className="mb-2">
                  <Form.Label style={{ fontSize: '0.8rem' }}>Roll (°)</Form.Label>
                  <Form.Control type="number" size="sm" value={parameters.roll} onChange={(e) => handleNumberInput('roll', e.target.value)} onFocus={(e) => e.target.select()} step="0.1" placeholder="Rotación" />
                </Form.Group>
                <Form.Group className="mb-2">
                  <Form.Label style={{ fontSize: '0.8rem' }}>Apertura Horizontal (°)</Form.Label>
                  <Form.Control type="number" size="sm" value={parameters.openingAngle} onChange={(e) => handleNumberInput('openingAngle', e.target.value)} onFocus={(e) => e.target.select()} min="0" max="360" placeholder="Ángulo de apertura" />
                </Form.Group>
                <Form.Group>
                  <Form.Label style={{ fontSize: '0.8rem' }}>Tipo de Antena</Form.Label>
                  <Form.Control type="text" size="sm" value={parameters.antennaType} onChange={(e) => setParameters(prev => ({ ...prev, antennaType: e.target.value }))} onFocus={(e) => e.target.select()} />
                </Form.Group>
              </Accordion.Body>
            </Accordion.Item>
          </Accordion>

          <div className="d-flex gap-2 mb-3">
            <Button size="sm" className="btn-corporate-guardar flex-fill" onClick={calculateCoverage}>Calcular</Button>
            {coverageInfo && <Button size="sm" variant="outline-secondary" onClick={clearCoverage}>Limpiar</Button>}
          </div>

          {coverageInfo && (
            <Card style={{ backgroundColor: 'rgba(210,159,42,0.1)', border: '1px solid var(--bs-warning)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
              <Card.Body>
                <div><strong>Rango:</strong> {coverageInfo.calculatedRange} m</div>
                <div><strong>Área:</strong> {coverageInfo.area} km²</div>
                <div><strong>Azimuth:</strong> {parameters.azimuth}°</div>
                <div><strong>Apertura:</strong> {parameters.openingAngle}°</div>
              </Card.Body>
            </Card>
          )}

          {showExportButtons && coverageInfo && (
            <>
              <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--bs-warning)', marginBottom: '0.5rem', marginTop: '0.5rem' }}>
                Exportar cobertura
              </div>
              <div className="d-flex flex-column gap-1">
                <Button size="sm" className="btn-corporate-guardar d-flex align-items-center justify-content-start" onClick={downloadGeoJSON}>Exportar GeoJSON</Button>
                <Button size="sm" className="btn-corporate-guardar d-flex align-items-center justify-content-start" onClick={downloadWKT}>Exportar WKT</Button>
                <Button size="sm" className="btn-corporate-guardar d-flex align-items-center justify-content-start" onClick={downloadKML}>Exportar KML</Button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default AntennaCoverage;