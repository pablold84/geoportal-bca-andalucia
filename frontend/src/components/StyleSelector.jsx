import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '../utils/fetchWithAuth';
import { Modal, Button, ListGroup, Spinner, Alert } from 'react-bootstrap';
import StylePreview from './StylePreview';
import { API_BASE } from '../config';

const StyleSelector = ({ layer, mapRef, onStyleApplied, onClose }) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [applying, setApplying] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);

  useEffect(() => {
    loadTemplates();
  }, [layer]);

  const getGeometryTypeFromLayer = (layer) => {
    const layerName = (layer.layer_name || '').toLowerCase();
    const tableName = layer.postgis_table || layer.layer_code || '';

    if (layerName.includes('(punto)') || layerName.includes('(puntos)')) return 'point';
    if (layerName.includes('(línea)') || layerName.includes('(linea)') || layerName.includes('(líneas)')) return 'line';
    if (layerName.includes('(polígono)') || layerName.includes('(poligono)') || layerName.includes('(polígonos)')) return 'polygon';
    if (tableName.endsWith('_C')) return 'point';
    if (tableName.endsWith('_L')) return 'line';
    if (tableName.endsWith('_S')) return 'polygon';

    return 'polygon';
  };

  const loadTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const geometryType = getGeometryTypeFromLayer(layer);
      const response = await fetchWithAuth(
        `${API_BASE}/styles/templates?geometry_type=${geometryType}`,
      );
      if (!response.ok) {
        throw new Error('Error al cargar plantillas');
      }
      const data = await response.json();
      setTemplates(data);
    } catch {
      setError('Error al cargar plantillas');
    } finally {
      setLoading(false);
    }
  };

  const applyTemplate = async (templateId) => {
    setApplying(true);
    setError(null);
    try {
      const response = await fetchWithAuth(
        `${API_BASE}/styles/layer/${layer.layer_id}/apply-template`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ template_id: templateId })
        }
      );
      if (!response.ok) {
        throw new Error('Error al aplicar plantilla');
      }
      const result = await response.json();

      if (!result.style_config) {
        throw new Error('El backend no devolvió style_config');
      }
      if (!mapRef?.current) {
        throw new Error('mapRef no está disponible');
      }
      if (typeof mapRef.current.updateLayerStyle !== 'function') {
        throw new Error('updateLayerStyle no está disponible');
      }

      const success = await mapRef.current.updateLayerStyle(layer.layer_id, result.style_config);
      if (success !== true) {
        throw new Error('Error actualizando el estilo en el mapa');
      }

      await new Promise(resolve => requestAnimationFrame(resolve));

      if (onClose) onClose();
    } catch {
      setError('Error al aplicar el estilo. Inténtalo de nuevo.');
    } finally {
      setApplying(false);
    }
  };

  return (
    <Modal show={true} onHide={onClose} size="md">
      <Modal.Header closeButton style={{
        backgroundColor: 'var(--bs-primary)',
        color: 'var(--bs-warning)',
        borderBottom: '1px solid rgba(210, 159, 42, 0.3)'
      }}>
        <Modal.Title style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          Estilo de "{layer.layer_name}"
        </Modal.Title>
      </Modal.Header>

      <Modal.Body style={{
        backgroundColor: 'var(--bs-primary)',
        color: 'var(--bs-warning)',
        maxHeight: '60vh',
        overflowY: 'auto'
      }}>
        {error && (
          <Alert variant="danger" style={{ fontSize: '0.85rem' }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <Spinner animation="border" variant="warning" size="sm" />
            <div style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
              Cargando plantillas...
            </div>
          </div>
        ) : templates.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.7, fontSize: '0.85rem' }}>
            No hay plantillas disponibles para este tipo de capa
          </div>
        ) : (
          <>
            <div style={{ fontSize: '0.85rem', marginBottom: '0.75rem', opacity: 0.8 }}>
              Selecciona una plantilla para aplicar:
            </div>
            <ListGroup>
              {templates.map((template) => (
                <ListGroup.Item
                  key={template.template_id}
                  action
                  active={selectedTemplateId === template.template_id}
                  onClick={() => setSelectedTemplateId(template.template_id)}
                  style={{
                    backgroundColor: selectedTemplateId === template.template_id
                      ? 'rgba(210, 159, 42, 0.2)'
                      : 'rgba(210, 159, 42, 0.05)',
                    border: selectedTemplateId === template.template_id
                      ? '1px solid rgba(210, 159, 42, 0.5)'
                      : '1px solid rgba(210, 159, 42, 0.2)',
                    color: 'var(--bs-warning)',
                    cursor: 'pointer',
                    marginBottom: '0.5rem',
                    borderRadius: '4px',
                    padding: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedTemplateId !== template.template_id) {
                      e.currentTarget.style.backgroundColor = 'rgba(210, 159, 42, 0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedTemplateId !== template.template_id) {
                      e.currentTarget.style.backgroundColor = 'rgba(210, 159, 42, 0.05)';
                    }
                  }}
                >
                  <div style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '4px',
                    padding: '0.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <StylePreview styleConfig={template.template_config} size={28} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>
                      {template.template_name}
                    </div>
                    {template.template_category && (
                      <div style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '0.2rem' }}>
                        {template.template_category}
                      </div>
                    )}
                  </div>
                  {selectedTemplateId === template.template_id && (
                    <div style={{ fontSize: '1.2rem' }}>✓</div>
                  )}
                </ListGroup.Item>
              ))}
            </ListGroup>
          </>
        )}
      </Modal.Body>

      <Modal.Footer style={{
        backgroundColor: 'var(--bs-primary)',
        borderTop: '1px solid rgba(210, 159, 42, 0.3)'
      }}>
        <Button
          variant="secondary"
          onClick={onClose}
          style={{
            backgroundColor: 'rgba(210, 159, 42, 0.1)',
            border: '1px solid rgba(210, 159, 42, 0.3)',
            color: 'var(--bs-warning)'
          }}
        >
          Cancelar
        </Button>
        <Button
          variant="warning"
          onClick={() => selectedTemplateId && applyTemplate(selectedTemplateId)}
          disabled={!selectedTemplateId || applying}
          style={{
            backgroundColor: selectedTemplateId ? 'var(--bs-warning)' : 'rgba(210, 159, 42, 0.3)',
            border: 'none',
            color: 'var(--bs-primary)',
            fontWeight: '600'
          }}
        >
          {applying ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              Aplicando...
            </>
          ) : (
            'Aplicar estilo'
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default StyleSelector;