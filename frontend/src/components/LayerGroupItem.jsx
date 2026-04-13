import React, { useState, memo } from 'react';
import StyleSelector from './StyleSelector';
import FilterModal from './FilterModal';

// 🎨 Iconos de geometría
const PointIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="12" r="6"/>
  </svg>
);

const LineIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <polyline points="4 18 8 14 12 18 16 10 20 14"/>
  </svg>
);

const PolygonIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5"/>
  </svg>
);

const FolderIcon = ({ isOpen }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    {isOpen ? (
      <path d="M3 7v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-8l-2-2H5a2 2 0 0 0-2 2z"/>
    ) : (
      <>
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
      </>
    )}
  </svg>
);

const ChevronIcon = ({ isOpen }) => (
  <svg 
    width="14" 
    height="14" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2"
    style={{
      transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
      transition: 'transform 0.2s'
    }}
  >
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

const getGeometryIcon = (layer) => {
  const layerName = (layer.layer_name || '').toLowerCase();
  if (layerName.includes('(punto)') || layerName.includes('(puntos)')) {
    return <PointIcon />;
  }
  if (layerName.includes('(línea)') || layerName.includes('(linea)') || layerName.includes('(líneas)')) {
    return <LineIcon />;
  }
  if (layerName.includes('(polígono)') || layerName.includes('(poligono)') || layerName.includes('(polígonos)')) {
    return <PolygonIcon />;
  }

  const tableName = layer.postgis_table || layer.layer_code || '';
  
  if (tableName.endsWith('_C')) {
    return <PointIcon />;
  }
  if (tableName.endsWith('_L')) {
    return <LineIcon />;
  }
  if (tableName.endsWith('_S')) {
    return <PolygonIcon />;
  }
  
  const type = (layer.layer_type || '').toLowerCase();
  if (type.includes('point') || type.includes('multipoint')) {
    return <PointIcon />;
  }
  if (type.includes('line') || type.includes('multiline')) {
    return <LineIcon />;
  }
  if (type.includes('polygon') || type.includes('multipolygon')) {
    return <PolygonIcon />;
  }
  
  return <PolygonIcon />;
};

const LayerGroupItem = memo(({ 
  group, 
  allGroups, 
  allLayers, 
  selectedLayers,
  hiddenGroups,
  onLayerToggle, 
  onGroupToggle,
  mapRef,
  onOpacityChange,
  layerOpacities,
  onApplyFilter,
  layerFilters,
  level = 0
}) => {
  const [isExpanded, setIsExpanded] = useState(group.is_expanded || false);
  const [styleModalLayer, setStyleModalLayer] = useState(null);
  const [filterModalLayer, setFilterModalLayer] = useState(null);
  const [showOpacitySlider, setShowOpacitySlider] = useState(null);

  const childGroups = allGroups.filter(g => g.parent_group_id === group.group_id);
  const groupLayers = allLayers.filter(l => l.group_id === group.group_id);
  const hasChildren = childGroups.length > 0 || groupLayers.length > 0;

  const isGroupVisible = !hiddenGroups.has(group.group_id);

  const indentPx = level * 16;

  const groupHeaderStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.6rem 0.5rem',
    paddingLeft: `${indentPx + 8}px`,
    cursor: hasChildren ? 'pointer' : 'default',
    backgroundColor: 'rgba(210, 159, 42, 0.05)',
    borderRadius: '4px',
    marginBottom: '0.3rem',
    transition: 'background-color 0.2s',
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'var(--bs-warning)',
    minHeight: '32px'
  };

  const layerItemStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.4rem 0.5rem',
    paddingLeft: `${indentPx + 32}px`,
    cursor: 'pointer',
    fontSize: '0.8rem',
    color: 'var(--bs-warning)',
    transition: 'background-color 0.2s',
    borderRadius: '4px'
  };

  const handleGroupClick = (e) => {
    if (e.target.type !== 'checkbox' && hasChildren) {
      setIsExpanded(!isExpanded);
    }
  };

  const handleGroupCheckboxChange = (e) => {
    e.stopPropagation();
    const shouldBeVisible = e.target.checked;
    onGroupToggle(group.group_id, shouldBeVisible);
  };

  const handleLayerCheckboxChange = (e, layerId) => {
    e.stopPropagation();
    onLayerToggle(layerId);
  };

  const handleStyleApplied = (layerId) => {
    setStyleModalLayer(null);
  };

  const handleOpacityChange = (layerId, newOpacity) => {
    if (onOpacityChange) {
      onOpacityChange(layerId, newOpacity);
    }
  };

  const handleApplyFilter = (layerId, filters) => {
    if (onApplyFilter) {
      onApplyFilter(layerId, filters);
    }
  };

  const handleClearFilters = (e, layerId) => {
    e.stopPropagation();
    handleApplyFilter(layerId, []);
  };

  return (
    <div style={{ marginBottom: '0.25rem' }}>
      {/* CABECERA DEL GRUPO */}
      <div 
        style={groupHeaderStyle}
        onClick={handleGroupClick}
        onMouseEnter={(e) => {
          if (hasChildren) {
            e.currentTarget.style.backgroundColor = 'rgba(210, 159, 42, 0.12)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(210, 159, 42, 0.05)';
        }}
      >
        {groupLayers.length > 0 && (
          <input
            type="checkbox"
            checked={isGroupVisible}
            onChange={handleGroupCheckboxChange}
            onClick={(e) => e.stopPropagation()}
            style={{ cursor: 'pointer' }}
            title={isGroupVisible ? "Ocultar grupo (mantiene selección)" : "Mostrar grupo"}
          />
        )}

        {hasChildren && (
          <span style={{ display: 'flex', alignItems: 'center' }}>
            <ChevronIcon isOpen={isExpanded} />
          </span>
        )}
        
        <span style={{ display: 'flex', alignItems: 'center' }}>
          <FolderIcon isOpen={isExpanded} />
        </span>

        <span style={{ flex: 1 }}>{group.group_name}</span>

        {groupLayers.length > 0 && (
          <span style={{
            fontSize: '0.7rem',
            backgroundColor: 'rgba(210, 159, 42, 0.2)',
            padding: '0.1rem 0.4rem',
            borderRadius: '10px',
            fontWeight: '500'
          }}>
            {groupLayers.length}
          </span>
        )}
      </div>

      {/* CONTENIDO EXPANDIDO */}
      {isExpanded && hasChildren && (
        <div style={{ marginLeft: '0px' }}>
          {/* CAPAS DEL GRUPO */}
          {groupLayers.map(layer => {
            const isLayerSelected = selectedLayers.has(layer.layer_id);
            const isGroupHidden = !isGroupVisible;
            const currentOpacity = layerOpacities?.get(layer.layer_id) || 1;
            const currentFilters = layerFilters?.get(layer.layer_id) || [];
            
            const layerStyle = {
              ...layerItemStyle,
              opacity: isGroupHidden && isLayerSelected ? 0.6 : 1
            };
            
            return (
              <div key={layer.layer_id}>
                {/* FILA PRINCIPAL DE LA CAPA */}
                <div
                  style={layerStyle}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(210, 159, 42, 0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isLayerSelected}
                    onChange={(e) => handleLayerCheckboxChange(e, layer.layer_id)}
                    style={{ cursor: 'pointer' }}
                    title={
                      isGroupHidden && isLayerSelected
                        ? "Capa seleccionada (grupo oculto)"
                        : isLayerSelected
                        ? "Deseleccionar capa"
                        : "Seleccionar capa"
                    }
                  />

                  <span style={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    opacity: 0.8 
                  }}>
                    {getGeometryIcon(layer)}
                  </span>

                  <span style={{ flex: 1 }}>
                    {layer.layer_name}
                    {isGroupHidden && isLayerSelected && (
                      <span style={{ 
                        marginLeft: '0.5rem', 
                        fontSize: '0.7rem',
                        opacity: 0.7
                      }}>
                        (oculta)
                      </span>
                    )}
                    {currentFilters.length > 0 && (
                      <span style={{ 
                        marginLeft: '0.5rem', 
                        fontSize: '0.7rem',
                        backgroundColor: 'rgba(100, 200, 255, 0.2)',
                        padding: '0.1rem 0.4rem',
                        borderRadius: '3px',
                        color: '#64B5F6',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem'
                      }}>
                        {currentFilters.length} filtro{currentFilters.length > 1 ? 's' : ''}
                        <button
                          onClick={(e) => handleClearFilters(e, layer.layer_id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#64B5F6',
                            cursor: 'pointer',
                            padding: '0',
                            fontSize: '0.9rem',
                            lineHeight: '1',
                            opacity: 0.8,
                            transition: 'opacity 0.2s'
                          }}
                          onMouseEnter={(e) => e.target.style.opacity = '1'}
                          onMouseLeave={(e) => e.target.style.opacity = '0.8'}
                          title="Borrar filtros"
                        >
                          ✕
                        </button>
                      </span>
                    )}
                  </span>

                  {isLayerSelected && !isGroupHidden && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFilterModalLayer(layer);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: currentFilters.length > 0 ? '#64B5F6' : 'var(--bs-warning)',
                        cursor: 'pointer',
                        padding: '0.2rem 0.4rem',
                        fontSize: '0.85rem',
                        opacity: 0.7,
                        transition: 'opacity 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.opacity = '1'}
                      onMouseLeave={(e) => e.target.style.opacity = '0.7'}
                      title="Filtrar capa"
                    >
                      🔍
                    </button>
                  )}

                  {/* BOTÓN DE OPACIDAD */}
                  {isLayerSelected && !isGroupHidden && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowOpacitySlider(
                          showOpacitySlider === layer.layer_id ? null : layer.layer_id
                        );
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--bs-warning)',
                        cursor: 'pointer',
                        padding: '0.2rem 0.4rem',
                        fontSize: '0.85rem',
                        opacity: showOpacitySlider === layer.layer_id ? 1 : 0.7,
                        transition: 'opacity 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.opacity = '1'}
                      onMouseLeave={(e) => {
                        if (showOpacitySlider !== layer.layer_id) {
                          e.target.style.opacity = '0.7';
                        }
                      }}
                      title="Ajustar opacidad"
                    >
                      {Math.round(currentOpacity * 100)}%
                    </button>
                  )}

                  {/* BOTÓN DE ESTILO */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setStyleModalLayer(layer);
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--bs-warning)',
                      cursor: 'pointer',
                      padding: '0.2rem 0.4rem',
                      fontSize: '0.9rem',
                      opacity: 0.7,
                      transition: 'opacity 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.opacity = '1'}
                    onMouseLeave={(e) => e.target.style.opacity = '0.7'}
                    title="Cambiar estilo"
                  >
                    🎨
                  </button>
                </div>

                {/* SLIDER DE OPACIDAD */}
                {showOpacitySlider === layer.layer_id && isLayerSelected && !isGroupHidden && (
                  <div
                    style={{
                      paddingLeft: `${indentPx + 64}px`,
                      paddingRight: '0.5rem',
                      paddingTop: '0.5rem',
                      paddingBottom: '0.75rem',
                      backgroundColor: 'rgba(210, 159, 42, 0.08)',
                      borderRadius: '4px',
                      marginTop: '0.25rem',
                      marginBottom: '0.25rem'
                    }}
                  >
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.75rem' 
                    }}>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        color: 'var(--bs-warning)',
                        opacity: 0.8,
                        minWidth: '60px'
                      }}>
                        Opacidad:
                      </span>
                      
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={Math.round(currentOpacity * 100)}
                        onChange={(e) => {
                          const newOpacity = parseInt(e.target.value) / 100;
                          handleOpacityChange(layer.layer_id, newOpacity);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          flex: 1,
                          cursor: 'pointer',
                          accentColor: 'var(--bs-warning)'
                        }}
                      />
                      
                      <span style={{ 
                        fontSize: '0.75rem', 
                        color: 'var(--bs-warning)',
                        fontWeight: '600',
                        minWidth: '35px',
                        textAlign: 'right'
                      }}>
                        {Math.round(currentOpacity * 100)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* SUBGRUPOS RECURSIVOS */}
          {childGroups.map(childGroup => (
            <LayerGroupItem
              key={childGroup.group_id}
              group={childGroup}
              allGroups={allGroups}
              allLayers={allLayers}
              selectedLayers={selectedLayers}
              hiddenGroups={hiddenGroups}
              onLayerToggle={onLayerToggle}
              onGroupToggle={onGroupToggle}
              mapRef={mapRef}
              onOpacityChange={onOpacityChange}
              layerOpacities={layerOpacities}
              onApplyFilter={onApplyFilter}
              layerFilters={layerFilters}
              level={level + 1}
            />
          ))}
        </div>
      )}

      {/* MODAL DE SELECTOR DE ESTILOS */}
      {styleModalLayer && (
        <StyleSelector
          layer={styleModalLayer}
          mapRef={mapRef}
          onStyleApplied={handleStyleApplied}
          onClose={() => setStyleModalLayer(null)}
        />
      )}

      {filterModalLayer && (
        <FilterModal
          layer={filterModalLayer}
          mapRef={mapRef}
          onApplyFilter={handleApplyFilter}
          onClose={() => setFilterModalLayer(null)}
        />
      )}
    </div>
  );
});

LayerGroupItem.displayName = 'LayerGroupItem';

export default LayerGroupItem;
