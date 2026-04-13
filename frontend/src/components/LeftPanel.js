import React, { useEffect, useState } from 'react';
import { Accordion, Form, Button } from 'react-bootstrap';
import AntennaSearch from './AntennaSearch';
import { ExportMeasureButtons } from './MeasureTools';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';
import AntennaCoverage from './AntennaCoverage';
import AntennaManagement from './AntennaManagement';
import ProjectSelector from './ProjectSelector';
import GenericLayerPanel from './GenericLayerPanel';

// 🎨 Iconos SVG minimalistas estilo Claude
const MapIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z"/>
    <line x1="8" y1="2" x2="8" y2="18"/>
    <line x1="16" y1="6" x2="16" y2="22"/>
  </svg>
);

const LayersIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 2 7 12 12 22 7 12 2"/>
    <polyline points="2 17 12 22 22 17"/>
    <polyline points="2 12 12 17 22 12"/>
  </svg>
);

const ToolsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
  </svg>
);

const DashboardIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/>
    <rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/>
  </svg>
);

const ManageIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="1"/>
    <circle cx="12" cy="5" r="1"/>
    <circle cx="12" cy="19" r="1"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
    <line x1="12" y1="5" x2="12" y2="19"/>
  </svg>
);

const MenuIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="3" y1="6" x2="21" y2="6"/>
    <line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);

const CloseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const LeftPanel = ({
  map,
  osmVisible,
  setOsmVisible,
  catastroVisible,
  setCatastroVisible,
  pnoaVisible,
  setPnoaVisible,
  wmsVisible,
  setWmsVisible,
  leftPanelCollapsed,
  setLeftPanelCollapsed,
  unidades,
  onSelectFeature,
  mapRef,
  vectorLayerRef,
  measureDistanceEnabled,
  setMeasureDistanceEnabled,
  measureAreaEnabled,
  setMeasureAreaEnabled,
  clearMeasurements,
  exportGeoJSON,
  exportWKT,
  exportKML,
  hasMeasurements,
  activeSection,
  setActiveSection,
  onDashboardClick,
  onCoverageCalculated,
  newAntennaMode,
  setNewAntennaMode,
  deleteAntennaMode,
  setDeleteAntennaMode,
  onAntennaCreated,
  onLayersChange,
  visibleLayers
}) => {
  const { canUseTools } = useAuth();
  const { projectConfig, currentProject } = useProject();

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isTablet, setIsTablet] = useState(
    window.innerWidth >= 768 && window.innerWidth < 1200
  );

  // Estados para controlar visibilidad de exportación
  const [hasCoverageCalculated, setHasCoverageCalculated] = useState(false);
  const [hasAntennaSelected, setHasAntennaSelected] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1200);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!map) return;
  }, [osmVisible, catastroVisible, pnoaVisible, wmsVisible, map]);

  const handleIconClick = (sectionKey) => {
    setActiveSection(sectionKey);
    setLeftPanelCollapsed(false);
  };

  const getPanelWidth = () => {
    if (leftPanelCollapsed) {
      return '60px';
    }
    
    if (isMobile) return '52vw';
    if (isTablet) return '280px';
    return '380px';
  };

  const shouldBeOverlay = (isMobile || isTablet) && !leftPanelCollapsed;

  // 🎨 Estilo para botones de iconos
  const iconButtonStyle = (isActive) => ({
    background: isActive ? 'rgba(210, 159, 42, 0.15)' : 'transparent',
    border: 'none',
    color: 'var(--bs-warning)',
    padding: '0.75rem',
    cursor: 'pointer',
    borderRadius: '8px',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    opacity: isActive ? 1 : 0.7,
  });

  // Wrapper para manejar el callback de cobertura calculada
  const handleCoverageCalculated = (info) => {
    setHasCoverageCalculated(!!info);
    if (onCoverageCalculated) {
      onCoverageCalculated(info);
    }
  };

  // Wrapper para manejar selección de antena
  const handleAntennaSelected = (feature) => {
    setHasAntennaSelected(!!feature);
    if (onSelectFeature) {
      onSelectFeature(feature);
    }
  };

  // Determinar si mostrar botones de exportación de mediciones
  const showMeasureExport = hasMeasurements && (measureDistanceEnabled || measureAreaEnabled);

  // 🆕 Valores por defecto si no hay projectConfig
  const features = projectConfig?.features || {
    antennas: false,
    coverage: false,
    antennaSearch: false,
    measurements: true,
    dashboard: false
  };

  return (
    <nav
      aria-label="Panel de navegación"
      style={{
        width: getPanelWidth(),
        transition: 'width 0.3s ease, transform 0.3s ease',
        backgroundColor: 'var(--bs-primary)',
        color: 'var(--bs-warning)',
        padding: leftPanelCollapsed ? '0.5rem' : '1rem',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        flexShrink: 0,
        position: shouldBeOverlay ? 'fixed' : 'relative',
        zIndex: shouldBeOverlay ? 1002 : 'auto',
        height: shouldBeOverlay ? '100vh' : 'auto',
        left: 0,
        top: 0,
        boxShadow: shouldBeOverlay ? '4px 0 12px rgba(0,0,0,0.3)' : 'none'
      }}
    >
      {/* Botón hamburguesa / cerrar */}
      <Button
        onClick={() => {
          setLeftPanelCollapsed(!leftPanelCollapsed);
          if (!leftPanelCollapsed) setActiveSection(null);
        }}
        style={{
          marginBottom: '1rem',
          background: 'transparent',
          border: 'none',
          color: 'var(--bs-warning)',
          padding: '0.5rem',
          cursor: 'pointer',
          alignSelf: leftPanelCollapsed ? 'center' : 'flex-start',
          transition: 'opacity 0.2s',
          opacity: 0.7
        }}
        onMouseEnter={(e) => e.target.style.opacity = '1'}
        onMouseLeave={(e) => e.target.style.opacity = '0.7'}
        title={leftPanelCollapsed ? "Expandir menú" : "Contraer menú"}
      >
        {leftPanelCollapsed ? <MenuIcon /> : <CloseIcon />}
      </Button>

      {/* SELECTOR DE PROYECTOS - Solo en modo expandido */}
      {/*!leftPanelCollapsed && <ProjectSelector />*/}

      {/* MODO COLAPSADO: Iconos verticales */}
      {leftPanelCollapsed && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.5rem',
            marginTop: '1rem'
          }}
        >
          {/* Mapas Base */}
          <button
            onClick={() => handleIconClick('0')}
            style={iconButtonStyle(activeSection === '0')}
            onMouseEnter={(e) => e.target.style.opacity = '1'}
            onMouseLeave={(e) => e.target.style.opacity = activeSection === '0' ? '1' : '0.7'}
            title="Mapas base"
          >
            <MapIcon />
          </button>

          {/* Capas Operativas */}
          <button
            onClick={() => handleIconClick('1')}
            style={iconButtonStyle(activeSection === '1')}
            onMouseEnter={(e) => e.target.style.opacity = '1'}
            onMouseLeave={(e) => e.target.style.opacity = activeSection === '1' ? '1' : '0.7'}
            title="Capas operativas"
          >
            <LayersIcon />
          </button>

          {/* Herramientas - Solo si tiene measurements */}
          {features.measurements && (
            <button
              onClick={() => canUseTools() && handleIconClick('2')}
              style={{
                ...iconButtonStyle(activeSection === '2'),
                opacity: canUseTools() ? (activeSection === '2' ? 1 : 0.7) : 0.3,
                cursor: canUseTools() ? 'pointer' : 'not-allowed'
              }}
              onMouseEnter={(e) => {
                if (canUseTools()) e.target.style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                e.target.style.opacity = canUseTools() ? (activeSection === '2' ? '1' : '0.7') : '0.3';
              }}
              title={canUseTools() ? "Herramientas" : "Herramientas (solo admin)"}
            >
              <ToolsIcon />
            </button>
          )}

          {/* Gestión de Antenas - Solo para proyectos con antennas */}
          {features.antennas && (
            <button
              onClick={() => canUseTools() && handleIconClick('3')}
              style={{
                ...iconButtonStyle(activeSection === '3'),
                opacity: canUseTools() ? (activeSection === '3' ? 1 : 0.7) : 0.3,
                cursor: canUseTools() ? 'pointer' : 'not-allowed'
              }}
              onMouseEnter={(e) => {
                if (canUseTools()) e.target.style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                e.target.style.opacity = canUseTools() ? (activeSection === '3' ? '1' : '0.7') : '0.3';
              }}
              title={canUseTools() ? "Gestión de antenas" : "Gestión de antenas (solo admin)"}
            >
              <ManageIcon />
            </button>
          )}

          {/* Dashboard - Solo si está habilitado */}
          {features.dashboard && (
            <button
              onClick={() => onDashboardClick && onDashboardClick()}
              style={iconButtonStyle(false)}
              onMouseEnter={(e) => e.target.style.opacity = '1'}
              onMouseLeave={(e) => e.target.style.opacity = '0.7'}
              title="Dashboard de Indicadores"
            >
              <DashboardIcon />
            </button>
          )}
        </div>
      )}

      {/* MODO EXPANDIDO: Acordeón */}
      {!leftPanelCollapsed && (
        <>
          <Accordion 
            flush 
            alwaysOpen={false}
            activeKey={activeSection}
            onSelect={(key) => setActiveSection(key)}
          >
            {/* Mapas base */}
            <Accordion.Item eventKey="0">
              <Accordion.Header>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MapIcon />
                  <span>Mapas base</span>
                </div>
              </Accordion.Header>
              <Accordion.Body>
                <Form.Check
                  type="switch"
                  label="Ortofoto PNOA"
                  checked={pnoaVisible}
                  onChange={e => setPnoaVisible(e.target.checked)}
                />
                <Form.Check
                  type="switch"
                  label="OpenStreetMap"
                  checked={osmVisible}
                  onChange={e => setOsmVisible(e.target.checked)}
                />
                <Form.Check
                  type="switch"
                  label="Catastro"
                  checked={catastroVisible}
                  onChange={e => setCatastroVisible(e.target.checked)}
                />
              </Accordion.Body>
            </Accordion.Item>

            {/* Capas operativas */}
            <Accordion.Item eventKey="1">
              <Accordion.Header>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <LayersIcon />
                  <span>Capas operativas</span>
                </div>
              </Accordion.Header>
              <Accordion.Body>
                <GenericLayerPanel 
                  onLayersChange={onLayersChange}
                  visibleLayers={visibleLayers}
                  mapRef={mapRef}
                />
              </Accordion.Body>
            </Accordion.Item>

            {/* Herramientas - Solo si tiene measurements */}
            {features.measurements && (
              <Accordion.Item eventKey="2">
                <Accordion.Header>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ToolsIcon />
                    <span>Herramientas</span>
                    {!canUseTools() && (
                      <span style={{ 
                        marginLeft: 'auto', 
                        fontSize: '0.75rem', 
                        opacity: 0.7 
                      }}>
                        🔒
                      </span>
                    )}
                  </div>
                </Accordion.Header>
                <Accordion.Body>
                  {!canUseTools() && (
                    <div style={{
                      padding: '0.5rem',
                      marginBottom: '1rem',
                      backgroundColor: 'rgba(255,193,7,0.2)',
                      borderRadius: '4px',
                      fontSize: '0.85rem',
                      color: 'var(--bs-warning)',
                      textAlign: 'center'
                    }}>
                      Solo para administradores
                    </div>
                  )}

                  {/* 📏 SECCIÓN: MEDIR DISTANCIAS Y ÁREAS */}
                  <div style={{ 
                    marginBottom: '1.5rem',
                    paddingBottom: '1rem',
                    borderBottom: features.coverage || features.antennaSearch ? '1px solid rgba(210, 159, 42, 0.2)' : 'none'
                  }}>
                    <div style={{ 
                      fontSize: '0.9rem', 
                      fontWeight: '600',
                      color: 'var(--bs-warning)',
                      marginBottom: '0.75rem'
                    }}>
                      📏 Mediciones
                    </div>

                    <Form.Check
                      type="switch"
                      label="Medir distancias"
                      checked={measureDistanceEnabled}
                      onChange={(e) => {
                        setMeasureDistanceEnabled(e.target.checked);
                        setMeasureAreaEnabled(false);
                      }}
                      className="mb-2"
                      disabled={!canUseTools()}
                    />

                    <Form.Check
                      type="switch"
                      label="Medir áreas"
                      checked={measureAreaEnabled}
                      onChange={(e) => {
                        setMeasureAreaEnabled(e.target.checked);
                        setMeasureDistanceEnabled(false);
                      }}
                      className="mb-3"
                      disabled={!canUseTools()}
                    />

                    {showMeasureExport && (
                      <ExportMeasureButtons
                        onExportGeoJSON={exportGeoJSON}
                        onExportWKT={exportWKT}
                        onExportKML={exportKML}
                        onClearMeasurements={clearMeasurements}
                        disabled={!hasMeasurements || !canUseTools()}
                      />
                    )}
                  </div>

                  {/* 📡 SECCIÓN: COBERTURA DE ANTENAS - Solo si tiene coverage */}
                  {features.coverage && (
                    <div style={{ 
                      marginBottom: '1.5rem',
                      paddingBottom: '1rem',
                      borderBottom: features.antennaSearch ? '1px solid rgba(210, 159, 42, 0.2)' : 'none'
                    }}>
                      <AntennaCoverage
                        unidades={unidades}
                        onSelectFeature={handleAntennaSelected}
                        onCoverageCalculated={handleCoverageCalculated}
                        showExportButtons={hasCoverageCalculated}
                      />
                    </div>
                  )}

                  {/* 🔍 SECCIÓN: BUSCAR ANTENA - Solo si tiene antennaSearch */}
                  {features.antennaSearch && (
                    <div>
                      <div style={{ 
                        fontSize: '0.9rem', 
                        fontWeight: '600',
                        color: 'var(--bs-warning)',
                        marginBottom: '0.75rem'
                      }}>
                        🔍 Buscar antena
                      </div>
                      <AntennaSearch
                        onSelectFeature={handleAntennaSelected}
                        mapInstanceRef={mapRef}
                        vectorLayerRef={vectorLayerRef}
                        showExportButton={hasAntennaSelected}
                      />
                    </div>
                  )}
                </Accordion.Body>
              </Accordion.Item>
            )}

            {/* Gestión de Antenas - Solo para proyectos con antennas */}
            {features.antennas && (
              <Accordion.Item eventKey="3">
                <Accordion.Header>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ManageIcon />
                    <span>Gestión de antenas</span>
                    {!canUseTools() && (
                      <span style={{ 
                        marginLeft: 'auto', 
                        fontSize: '0.75rem', 
                        opacity: 0.7 
                      }}>
                        🔒
                      </span>
                    )}
                  </div>
                </Accordion.Header>
                <Accordion.Body>
                  {!canUseTools() && (
                    <div style={{
                      padding: '0.5rem',
                      marginBottom: '1rem',
                      backgroundColor: 'rgba(255,193,7,0.2)',
                      borderRadius: '4px',
                      fontSize: '0.85rem',
                      color: 'var(--bs-warning)',
                      textAlign: 'center'
                    }}>
                      Solo para administradores
                    </div>
                  )}

                  <AntennaManagement
                    createMode={newAntennaMode}
                    deleteMode={deleteAntennaMode}
                    onToggleCreate={setNewAntennaMode}
                    onToggleDelete={setDeleteAntennaMode}
                    onAntennaCreated={onAntennaCreated}
                    onAntennaDeleted={onAntennaCreated}
                    mapInstanceRef={mapRef}
                    vectorLayerRef={vectorLayerRef}
                  />
                </Accordion.Body>
              </Accordion.Item>
            )}
          </Accordion>

          {/* Botón Dashboard - Solo si está habilitado */}
          {features.dashboard && (
            <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(210,159,42,0.3)', paddingTop: '1rem' }}>
              <Button
                onClick={() => onDashboardClick && onDashboardClick()}
                style={{
                  width: '100%',
                  backgroundColor: 'rgba(210, 159, 42, 0.12)',
                  color: 'var(--bs-warning)',
                  border: '1px solid rgba(210, 159, 42, 0.25)',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = 'rgba(210, 159, 42, 0.2)';
                  e.target.style.borderColor = 'rgba(210, 159, 42, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'rgba(210, 159, 42, 0.12)';
                  e.target.style.borderColor = 'rgba(210, 159, 42, 0.25)';
                }}
              >
                <DashboardIcon />
                <span>Dashboard</span>
              </Button>
            </div>
          )}
        </>
      )}
    </nav>
  );
};

export default LeftPanel;