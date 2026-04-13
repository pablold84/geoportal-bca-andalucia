import React, { useState } from 'react';
import { Button, Form } from 'react-bootstrap';

const LABEL_MAP = {
  id_hoja:           'ID Hoja',
  estado_res:        'Estado restitución',
  estado_edicion:    'Estado edición',
  estado_produccion: 'Estado producción',
  fase_actual:       'Fase actual',
  empresa:           'Empresa',
  vuelo:             'Vuelo',
  fecha_vuelo:       'Fecha vuelo'
};

const FASE_LABELS = {
  produccion_completa:  'Producción completa',
  produccion_qc:        'Producción QC',
  edicion_completa:     'Edición completa',
  edicion_qc:           'Edición QC',
  editando:             'Editando',
  restitucion_completa: 'Restitución completa',
  restitucion_qc:       'Restitución QC',
  en_restitucion:       'En restitución',
  sin_estado:           'Sin estado'
};

const READ_ONLY_FIELDS = ['id_hoja', 'fase_actual', 'id_obj', 'id_ti_bca', 'id_con'];

const RightPanel = ({ featureInfo, panelOpen, setPanelOpen, leftPanelCollapsed, isSmallScreen }) => {
  const [editing, setEditing] = useState(false);
  const [editedValues, setEditedValues] = useState({});

  const panelWidth = panelOpen ? (isSmallScreen ? '300px' : '320px') : '40px';
  const shouldBeOverlay = isSmallScreen && panelOpen;

  const properties = featureInfo?.properties || featureInfo || null;
  const layerName = featureInfo?.layerName || null;

  const handleEdit = () => {
    const filtered = Object.fromEntries(
      Object.entries(properties || {}).filter(([k]) =>
        k !== 'geometry' && k !== 'type' && k !== 'featureId' && k !== 'layerName'
      )
    );
    setEditedValues(filtered);
    setEditing(true);
  };

  const handleCancel = () => {
    setEditedValues({});
    setEditing(false);
  };

  const handleChange = (key, value) => {
    setEditedValues(prev => ({ ...prev, [key]: value }));
  };

  const formatValue = (key, value) => {
    if (value === null || value === undefined) return '—';
    if (key === 'fase_actual') return FASE_LABELS[value] || value;
    return String(value);
  };

  const titulo = properties?.id_hoja
    ? `Hoja ${properties.id_hoja}`
    : 'Detalle del elemento';

  const displayProperties = editing ? editedValues : properties;

  return (
    <aside
      aria-label="Panel de detalle de elemento"
      style={{
        width: panelWidth,
        flexBasis: panelWidth,
        minWidth: panelOpen ? undefined : '40px',
        flexGrow: !isSmallScreen && leftPanelCollapsed && panelOpen ? 1 : 0,
        flexShrink: 0,
        transition: 'all 0.3s',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: shouldBeOverlay ? 'fixed' : 'relative',
        right: shouldBeOverlay ? 0 : undefined,
        top: shouldBeOverlay ? 0 : undefined,
        height: shouldBeOverlay ? '100vh' : undefined,
        zIndex: shouldBeOverlay ? 1003 : undefined,
        boxShadow: shouldBeOverlay ? '-4px 0 12px rgba(0,0,0,0.3)' : 'none',
        backgroundColor: shouldBeOverlay ? '#ffffff' : 'transparent'
      }}
    >
      <Button
        onClick={() => setPanelOpen(!panelOpen)}
        style={{
          alignSelf: 'flex-start',
          marginBottom: '10px',
          background: 'transparent',
          border: 'none',
          fontSize: '1.2rem',
          cursor: 'pointer',
          color: 'var(--bs-primary)'
        }}
      >
        {panelOpen ? '❯' : '❮'}
      </Button>

      {panelOpen && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '0 0.5rem 0.5rem 0.5rem' }}>
            {!properties ? (
              <div style={{
                color: 'var(--bs-primary)',
                backgroundColor: 'var(--bs-warning)',
                padding: '1rem',
                borderRadius: '4px',
                fontSize: 'clamp(12px, 1vw, 14px)'
              }}>
                <h2 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Información de elemento</h2>
                <p style={{ margin: 0 }}>No se ha seleccionado ningún elemento.</p>
              </div>
            ) : (
              <>
                <div style={{ borderRadius: '6px', overflow: 'hidden', border: '2px solid var(--bs-primary)', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '0.75rem' }}>

                  <div style={{ backgroundColor: 'var(--bs-primary)', padding: '0.6rem 0.75rem' }}>
                    <div style={{ color: 'var(--bs-on-primary)', fontWeight: '600', fontSize: '1rem' }}>
                      {titulo}
                      {editing && (
                        <span style={{ fontSize: '0.75rem', fontWeight: '400', marginLeft: '0.5rem', opacity: 0.8 }}>
                          (Modo edición)
                        </span>
                      )}
                    </div>
                    {layerName && (
                      <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', marginTop: '0.2rem', fontStyle: 'italic' }}>
                        {layerName}
                      </div>
                    )}
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <tbody>
                      {Object.entries(displayProperties)
                        .filter(([k]) => k !== 'geometry' && k !== 'type' && k !== 'featureId' && k !== 'layerName')
                        .map(([k, v], i) => {
                          const isReadOnly = READ_ONLY_FIELDS.includes(k);
                          return (
                            <tr
                              key={k}
                              style={{
                                backgroundColor: i % 2 === 0 ? '#ffffff' : 'rgba(42,55,139,0.04)',
                                borderBottom: '1px solid rgba(42,55,139,0.1)'
                              }}
                            >
                              <td style={{
                                padding: '0.45rem 0.75rem',
                                color: 'var(--bs-primary)',
                                fontWeight: '600',
                                width: '45%',
                                verticalAlign: 'middle',
                                borderRight: '1px solid rgba(42,55,139,0.1)'
                              }}>
                                {LABEL_MAP[k] || k}
                              </td>
                              <td style={{ padding: '0.35rem 0.5rem', verticalAlign: 'middle' }}>
                                {editing && !isReadOnly ? (
                                  <Form.Control
                                    size="sm"
                                    value={v ?? ''}
                                    onChange={(e) => handleChange(k, e.target.value)}
                                    style={{
                                      backgroundColor: '#fff3cd',
                                      border: '1px solid var(--bs-warning)',
                                      fontSize: '0.82rem',
                                      padding: '0.2rem 0.4rem'
                                    }}
                                  />
                                ) : (
                                  <span style={{ color: isReadOnly && editing ? '#999' : '#333', wordBreak: 'break-word' }}>
                                    {formatValue(k, v)}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  {!editing ? (
                    <Button
                      size="sm"
                      onClick={handleEdit}
                      style={{
                        flex: 1,
                        backgroundColor: 'var(--bs-primary)',
                        color: 'var(--bs-on-primary)',
                        border: '2px solid var(--bs-primary)',
                        fontWeight: '600',
                        transition: 'all 0.2s'
                      }}
                    >
                      Editar
                    </Button>
                  ) : (
                    <>
                      <Button
                        className="btn-corporate-guardar"
                        size="sm"
                        disabled
                        style={{ flex: 1 }}
                        title="Guardado en desarrollo"
                      >
                        Guardar
                      </Button>
                      <Button
                        className="btn-corporate-cancelar"
                        size="sm"
                        onClick={handleCancel}
                        style={{ flex: 1 }}
                      >
                        Cancelar
                      </Button>
                    </>
                  )}
                </div>

                <Button
                  className="btn-corporate-exportar"
                  size="sm"
                  disabled
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem' }}
                  title="Exportación en desarrollo"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Exportar JSON
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};

export default RightPanel;