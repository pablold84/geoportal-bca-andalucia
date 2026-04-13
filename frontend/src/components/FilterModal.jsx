import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '../utils/fetchWithAuth';
import { API_BASE } from '../config';

const FilterModal = ({ layer, onClose, onApplyFilter, mapRef }) => {
  const [fields, setFields] = useState([]);
  const [loadingFields, setLoadingFields] = useState(true);
  const [filters, setFilters] = useState([]);
  const [currentFilter, setCurrentFilter] = useState({ field: '', operator: 'equal', value: '' });

  const operators = [
    { value: 'equal',         label: 'Igual a',           needsValue: true,  supportsMultiple: true  },
    { value: 'not_equal',     label: 'Diferente de',      needsValue: true,  supportsMultiple: true  },
    { value: 'contains',      label: 'Contiene',          needsValue: true,  supportsMultiple: false },
    { value: 'not_contains',  label: 'No contiene',       needsValue: true,  supportsMultiple: false },
    { value: 'starts_with',   label: 'Comienza con',      needsValue: true,  supportsMultiple: false },
    { value: 'ends_with',     label: 'Termina con',       needsValue: true,  supportsMultiple: false },
    { value: 'greater_than',  label: 'Mayor que',         needsValue: true,  supportsMultiple: false },
    { value: 'less_than',     label: 'Menor que',         needsValue: true,  supportsMultiple: false },
    { value: 'greater_equal', label: 'Mayor o igual que', needsValue: true,  supportsMultiple: false },
    { value: 'less_equal',    label: 'Menor o igual que', needsValue: true,  supportsMultiple: false },
    { value: 'is_empty',      label: 'Está vacío',        needsValue: false, supportsMultiple: false },
    { value: 'is_not_empty',  label: 'No está vacío',     needsValue: false, supportsMultiple: false }
  ];

  useEffect(() => {
    const fetchFields = async () => {
      try {
        const response = await fetchWithAuth(`${API_BASE}/layers/${layer.layer_id}/fields`, {
        });
        if (response.ok) {
          const data = await response.json();
          setFields(data);
        }
      } catch {
        // error silencioso
      } finally {
        setLoadingFields(false);
      }
    };
    fetchFields();
  }, [layer.layer_id]);

  const handleAddFilter = () => {
    const selectedOperator = operators.find(op => op.value === currentFilter.operator);
    if (!currentFilter.field) { alert('Selecciona un campo'); return; }
    if (selectedOperator?.needsValue && !currentFilter.value.trim()) { alert('Ingresa un valor para el filtro'); return; }

    const values = currentFilter.value.split(',').map(v => v.trim()).filter(v => v);

    if (values.length > 1 && selectedOperator?.supportsMultiple) {
      const newFilters = values.map((val, idx) => ({
        id: Date.now() + idx,
        field: currentFilter.field,
        operator: currentFilter.operator,
        value: val,
        label: `${currentFilter.field} ${selectedOperator.label} ${val}`
      }));
      setFilters([...filters, ...newFilters]);
    } else {
      setFilters([...filters, {
        id: Date.now(),
        field: currentFilter.field,
        operator: currentFilter.operator,
        value: currentFilter.value,
        label: `${currentFilter.field} ${selectedOperator.label} ${selectedOperator.needsValue ? currentFilter.value : ''}`
      }]);
    }

    setCurrentFilter({ field: currentFilter.field, operator: 'equal', value: '' });
  };

  const handleRemoveFilter = (filterId) => setFilters(filters.filter(f => f.id !== filterId));
  const handleClearFilters = () => { setFilters([]); setCurrentFilter({ field: '', operator: 'equal', value: '' }); };
  const handleApplyFilters = () => {
    if (onApplyFilter) {
      onApplyFilter(layer.layer_id, filters.map(f => ({ field: f.field, operator: f.operator, value: f.value })));
    }
    onClose();
  };

  const selectedOperator = operators.find(op => op.value === currentFilter.operator);

  return (
    <div
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '1rem' }}
      onClick={onClose}
    >
      <div
        style={{ backgroundColor: '#1e1e2e', borderRadius: '8px', border: '1px solid var(--bs-warning)', maxWidth: '600px', width: '100%', maxHeight: '90vh', overflow: 'auto', color: 'var(--bs-warning)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(210,159,42,0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, backgroundColor: '#1e1e2e', zIndex: 1 }}>
          <h5 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>Filtrar capa: {layer.layer_name}</h5>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--bs-warning)', fontSize: '1.5rem', cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: '1.25rem' }}>
          {loadingFields ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div className="spinner-border spinner-border-sm text-warning" role="status"><span className="visually-hidden">Cargando...</span></div>
              <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>Cargando campos...</p>
            </div>
          ) : fields.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', fontSize: '0.9rem', opacity: 0.7 }}>No se encontraron campos para esta capa</div>
          ) : (
            <>
              <div style={{ backgroundColor: 'rgba(210,159,42,0.05)', padding: '1rem', borderRadius: '6px', marginBottom: '1.5rem', border: '1px solid rgba(210,159,42,0.2)' }}>
                <h6 style={{ fontSize: '0.9rem', marginBottom: '1rem', fontWeight: '600' }}>Agregar nuevo filtro</h6>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.4rem' }}>Campo:</label>
                  <select value={currentFilter.field} onChange={(e) => setCurrentFilter({ ...currentFilter, field: e.target.value })} style={{ width: '100%', padding: '0.5rem', backgroundColor: '#2a2a3a', border: '1px solid rgba(210,159,42,0.3)', borderRadius: '4px', color: 'var(--bs-warning)', fontSize: '0.85rem' }}>
                    <option value="">-- Selecciona un campo --</option>
                    {fields.map((field) => (<option key={field.column_name} value={field.column_name}>{field.column_name} ({field.data_type})</option>))}
                  </select>
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.4rem' }}>Operador:</label>
                  <select value={currentFilter.operator} onChange={(e) => setCurrentFilter({ ...currentFilter, operator: e.target.value })} style={{ width: '100%', padding: '0.5rem', backgroundColor: '#2a2a3a', border: '1px solid rgba(210,159,42,0.3)', borderRadius: '4px', color: 'var(--bs-warning)', fontSize: '0.85rem' }}>
                    {operators.map((op) => (<option key={op.value} value={op.value}>{op.label}</option>))}
                  </select>
                </div>
                {selectedOperator?.needsValue && (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.4rem' }}>
                      Valor:
                      {selectedOperator?.supportsMultiple && <span style={{ fontSize: '0.75rem', opacity: 0.7, marginLeft: '0.5rem', fontStyle: 'italic' }}>(separa múltiples valores con comas)</span>}
                    </label>
                    <input type="text" value={currentFilter.value} onChange={(e) => setCurrentFilter({ ...currentFilter, value: e.target.value })} placeholder={selectedOperator?.supportsMultiple ? "Ej: 12342, 342423, 56789" : "Ingresa el valor"} style={{ width: '100%', padding: '0.5rem', backgroundColor: '#2a2a3a', border: '1px solid rgba(210,159,42,0.3)', borderRadius: '4px', color: 'var(--bs-warning)', fontSize: '0.85rem' }} />
                    {selectedOperator?.supportsMultiple && currentFilter.value.includes(',') && (
                      <div style={{ marginTop: '0.5rem', padding: '0.5rem', backgroundColor: 'rgba(100,200,255,0.1)', borderRadius: '4px', fontSize: '0.75rem', color: '#64B5F6' }}>
                        Se crearán {currentFilter.value.split(',').filter(v => v.trim()).length} filtros
                      </div>
                    )}
                  </div>
                )}
                <button onClick={handleAddFilter} style={{ width: '100%', padding: '0.6rem', backgroundColor: 'rgba(210,159,42,0.2)', border: '1px solid var(--bs-warning)', borderRadius: '4px', color: 'var(--bs-warning)', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer' }}>
                  Agregar filtro
                </button>
              </div>

              {filters.length > 0 ? (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h6 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', fontWeight: '600' }}>Filtros activos ({filters.length})</h6>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {filters.map((filter) => (
                      <div key={filter.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', backgroundColor: 'rgba(210,159,42,0.1)', border: '1px solid rgba(210,159,42,0.3)', borderRadius: '4px', fontSize: '0.8rem' }}>
                        <span style={{ flex: 1 }}>{filter.label}</span>
                        <button onClick={() => handleRemoveFilter(filter.id)} style={{ background: 'transparent', border: 'none', color: '#ff6b6b', fontSize: '1.2rem', cursor: 'pointer', padding: '0 0.5rem', lineHeight: 1 }}>×</button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ padding: '1.5rem', textAlign: 'center', fontSize: '0.85rem', opacity: 0.6, fontStyle: 'italic' }}>No hay filtros activos. Agrega filtros para comenzar.</div>
              )}
            </>
          )}
        </div>

        <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid rgba(210,159,42,0.3)', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', position: 'sticky', bottom: 0, backgroundColor: '#1e1e2e' }}>
          <button onClick={onClose} style={{ padding: '0.5rem 1rem', backgroundColor: 'transparent', border: '1px solid rgba(210,159,42,0.5)', borderRadius: '4px', color: 'var(--bs-warning)', fontSize: '0.85rem', cursor: 'pointer' }}>Cancelar</button>
          <button onClick={handleClearFilters} disabled={filters.length === 0} style={{ padding: '0.5rem 1rem', backgroundColor: 'transparent', border: '1px solid #ff6b6b', borderRadius: '4px', color: '#ff6b6b', fontSize: '0.85rem', cursor: filters.length === 0 ? 'not-allowed' : 'pointer', opacity: filters.length === 0 ? 0.5 : 1 }}>Limpiar filtros</button>
          <button onClick={handleApplyFilters} style={{ padding: '0.5rem 1.5rem', backgroundColor: 'var(--bs-warning)', border: 'none', borderRadius: '4px', color: '#1e1e2e', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer' }}>Aplicar filtros</button>
        </div>
      </div>
    </div>
  );
};

export default FilterModal;