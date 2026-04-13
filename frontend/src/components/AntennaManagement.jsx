import React, { useState, useEffect, useCallback } from 'react';
import { fetchWithAuth } from '../utils/fetchWithAuth';
import { Button, Spinner, Alert, Form, ListGroup, Modal } from 'react-bootstrap';
import { transform } from 'ol/proj';
import { API_BASE } from '../config';

const PlusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const MinusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const AntennaManagement = ({
  createMode,
  deleteMode,
  onToggleCreate,
  onToggleDelete,
  onAntennaCreated,
  onAntennaDeleted,
  mapInstanceRef,
  vectorLayerRef
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [searchText, setSearchText] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredOptions, setFilteredOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAntenna, setSelectedAntenna] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

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
    if (searchText.trim().length >= 2 && deleteMode) {
      debouncedSearch(searchText);
      setShowDropdown(true);
    } else {
      setFilteredOptions([]);
      setShowDropdown(false);
    }
  }, [searchText, deleteMode, debouncedSearch]);

  const handleSelectOption = (option) => {
    setSearchText(option.label);
    setShowDropdown(false);
    setFilteredOptions([]);
    setSelectedAntenna(option);

    if (onAntennaCreated) onAntennaCreated(option.feature);

    if (mapInstanceRef?.current && vectorLayerRef?.current) {
      const source = vectorLayerRef.current.getSource();
      source.getFeatures().forEach(f => f.set('selected', false));

      const clickedFeature = source.getFeatures().find(
        f => Number(f.get('ubicacion_id')) === Number(option.feature.ubicacion_id)
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

    setShowConfirmModal(true);
  };

  const handleClearSearch = () => {
    setSearchText('');
    setShowDropdown(false);
    setFilteredOptions([]);
    setSelectedAntenna(null);
    setError(null);
    setSuccess(null);
  };

  const handleConfirmDelete = async () => {
    if (!selectedAntenna) return;

    setIsDeleting(true);
    setError(null);
    setSuccess(null);

    try {
      const estacionId = selectedAntenna.estacion_id || selectedAntenna.feature?.estacion_id;
      if (!estacionId) throw new Error('No se encontró el ID de la estación');

      const response = await fetchWithAuth(`${API_BASE}/estaciones/${estacionId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Error al eliminar la antena');
      }

      const result = await response.json();
      setSuccess(result.message || 'Antena eliminada correctamente');

      if (vectorLayerRef?.current) {
        const source = vectorLayerRef.current.getSource();
        source.clear();
        source.refresh();
      }

      handleClearSearch();
      if (onAntennaDeleted) onAntennaDeleted();
      setShowConfirmModal(false);

    } catch (err) {
      setError(err.message || 'Error al eliminar la antena');
      setShowConfirmModal(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleCreate = () => {
    setError(null); setSuccess(null); handleClearSearch();
    onToggleCreate(!createMode);
  };

  const handleToggleDelete = () => {
    setError(null); setSuccess(null); handleClearSearch();
    onToggleDelete(!deleteMode);
  };

  const handleCancel = () => {
    setError(null); setSuccess(null); handleClearSearch();
    onToggleCreate(false);
    onToggleDelete(false);
  };

  return (
    <div>
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)} className="mb-2">
          <small>{error}</small>
        </Alert>
      )}

      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess(null)} className="mb-2">
          <small>{success}</small>
        </Alert>
      )}

      {createMode && (
        <div style={{ padding: '0.75rem', marginBottom: '0.75rem', backgroundColor: 'rgba(40,167,69,0.15)', borderRadius: '4px', fontSize: '0.85rem', color: '#28a745', border: '1px solid rgba(40,167,69,0.3)' }}>
          <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Modo creación activo</div>
          <div style={{ fontSize: '0.8rem', lineHeight: '1.4' }}>Haz click en el mapa donde deseas crear la nueva antena.</div>
        </div>
      )}

      {deleteMode && (
        <>
          <div style={{ padding: '0.75rem', marginBottom: '0.75rem', backgroundColor: 'rgba(220,53,69,0.15)', borderRadius: '4px', fontSize: '0.85rem', color: '#dc3545', border: '1px solid rgba(220,53,69,0.3)' }}>
            <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Modo eliminación activo</div>
            <div style={{ fontSize: '0.8rem', lineHeight: '1.4' }}>Busca y selecciona la antena que deseas eliminar.</div>
          </div>

          <Form.Group className="mb-3">
            <div style={{ position: 'relative' }}>
              <Form.Control
                type="text"
                size="sm"
                placeholder="Buscar antena a eliminar..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onFocus={() => !selectedAntenna && searchText.trim().length >= 2 && setShowDropdown(true)}
                disabled={!!selectedAntenna}
                style={{ paddingRight: searchText ? '30px' : '8px', backgroundColor: selectedAntenna ? '#f8f9fa' : 'white', cursor: selectedAntenna ? 'not-allowed' : 'text' }}
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

              {showDropdown && !isLoading && !selectedAntenna && filteredOptions.length > 0 && (
                <ListGroup style={{ position: 'absolute', top: '100%', left: 0, right: 0, maxHeight: '300px', overflowY: 'auto', zIndex: 1000, marginTop: '2px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', fontSize: '0.85rem' }}>
                  {filteredOptions.map((opt) => (
                    <ListGroup.Item key={opt.value} action onClick={() => handleSelectOption(opt)} style={{ cursor: 'pointer', padding: '10px 12px' }}>
                      <div style={{ fontSize: '0.9rem', marginBottom: '4px' }}>{opt.label}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>ID: {opt.value} | Estación: {opt.estacion_id}</div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}

              {showDropdown && !isLoading && !selectedAntenna && searchText.trim().length >= 2 && filteredOptions.length === 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, padding: '12px', backgroundColor: 'white', border: '1px solid #dee2e6', borderRadius: '4px', marginTop: '2px', fontSize: '0.85rem', color: '#6c757d', zIndex: 1000 }}>
                  No se encontraron antenas
                </div>
              )}
            </div>
          </Form.Group>
        </>
      )}

      <div className="d-flex flex-column gap-2">
        {!createMode && !deleteMode ? (
          <>
            <Button size="sm" className="btn-corporate-guardar" onClick={handleToggleCreate} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <PlusIcon /><span>Crear Antena</span>
            </Button>
            <Button size="sm" variant="danger" onClick={handleToggleDelete} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <MinusIcon /><span>Eliminar Antena</span>
            </Button>
          </>
        ) : (
          <Button size="sm" variant="outline-warning" onClick={handleCancel} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <span>✕</span><span>Cancelar</span>
          </Button>
        )}
      </div>

      <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)} centered>
        <Modal.Header closeButton style={{ backgroundColor: 'var(--bs-primary)', color: 'var(--bs-warning)' }}>
          <Modal.Title style={{ fontSize: '1.1rem' }}>Confirmar Eliminación</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p style={{ marginBottom: '1rem' }}>
            Esta acción eliminará la antena y <strong>todos sus datos relacionados</strong>.
          </p>
          {selectedAntenna && (
            <div style={{ padding: '0.75rem', backgroundColor: '#f8f9fa', borderRadius: '4px', fontSize: '0.9rem' }}>
              <div><strong>Antena:</strong> {selectedAntenna.label}</div>
              <div><strong>ID Ubicación:</strong> {selectedAntenna.value}</div>
              <div><strong>ID Estación:</strong> {selectedAntenna.estacion_id}</div>
            </div>
          )}
          <Alert variant="danger" style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
            <strong>Esta acción no se puede deshacer.</strong>
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowConfirmModal(false)} size="sm">Cancelar</Button>
          <Button variant="danger" onClick={handleConfirmDelete} disabled={isDeleting} size="sm" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {isDeleting ? <><Spinner animation="border" size="sm" /><span>Eliminando...</span></> : <span>Eliminar Definitivamente</span>}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default AntennaManagement;