import React, { useState, useEffect, useRef, useCallback } from 'react';
import { fetchWithAuth } from './utils/fetchWithAuth';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import MapView from './components/MapView';
import LeftPanel from './components/LeftPanel';
import RightPanel from './components/RightPanel';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProjectProvider } from './context/ProjectContext';

import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/custom-bootstrap.css';

import logoHeader from './styles/seresco_logo.svg';
import logoFooter from './styles/logo.png';
import { API_BASE } from './config';


function AppContent() {
  const { user, login, logout, loading } = useAuth();
  const mapRef = useRef(null);
  const vectorLayerRef = useRef(null);

  const [selectedFeature, setSelectedFeature] = useState(null);
  const [osmVisible, setOsmVisible] = useState(false);
  const [catastroVisible, setCatastroVisible] = useState(false);
  const [pnoaVisible, setPnoaVisible] = useState(true);
  const [wmsVisible, setWmsVisible] = useState(true);

  const [panelOpen, setPanelOpen] = useState(true);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);

  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  const [unidades, setUnidades] = useState([]);
  const [puntosGeoJSON, setPuntosGeoJSON] = useState(null);

  const [scale, setScale] = useState(1000);

  const [measureDistanceEnabled, setMeasureDistanceEnabled] = useState(false);
  const [measureAreaEnabled, setMeasureAreaEnabled] = useState(false);
  const [clearMeasurements, setClearMeasurements] = useState(false);

  const isMeasuringActive = measureDistanceEnabled || measureAreaEnabled;

  const [activeSection, setActiveSection] = useState('0');
  const [showDashboard, setShowDashboard] = useState(false);
  const [showHojasLayer, setShowHojasLayer] = useState(false);

  const [exportGeoJSON, setExportGeoJSON] = useState(false);
  const [exportWKT, setExportWKT] = useState(false);
  const [exportKML, setExportKML] = useState(false);
  const [hasMeasurements, setHasMeasurements] = useState(false);
  const [coverageInfo, setCoverageInfo] = useState(null);

  const [newAntennaMode, setNewAntennaMode] = useState(false);
  const [deleteAntennaMode, setDeleteAntennaMode] = useState(false);

  const [projectLayersState, setProjectLayersState] = useState({
    visibleLayers: new Set(),
    allLayers: [],
    currentProject: null
  });

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const savedProjectCode = sessionStorage.getItem('currentProjectCode');
        if (savedProjectCode !== 'telefonica') {
          setPuntosGeoJSON({ type: "FeatureCollection", features: [] });
          setUnidades([]);
          return;
        }

        const res = await fetchWithAuth(`${API_BASE}/unidades/geojson`, {});
        if (!res.ok) return;

        const geojsonData = await res.json();
        setPuntosGeoJSON(geojsonData);

        if (geojsonData?.features) {
          const unidadesArray = geojsonData.features.map((feat) => ({
            id_unidad_espacial: feat.properties?.id_unidad_espacial || null,
            tipo_antena: feat.properties?.tipo_antena || "",
            nombre: feat.properties?.nombre || "",
            coordinates: feat.geometry?.coordinates || null,
          }));
          setUnidades(unidadesArray);
        }
      } catch {
        // error de red silencioso
      }
    };

    if (user) {
      fetchData();
    }
  }, [user]);

  const handleSelectFeature = (feat) => {
    setSelectedFeature(feat);
    setPanelOpen(true);
  };

  const handleAntennaCreated = () => {
    const fetchData = async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE}/unidades/geojson`, {});
        if (!res.ok) return;
        const geojsonData = await res.json();
        setPuntosGeoJSON(geojsonData);
        if (geojsonData?.features) {
          const unidadesArray = geojsonData.features.map((feat) => ({
            id_unidad_espacial: feat.properties?.id_unidad_espacial || null,
            tipo_antena: feat.properties?.tipo_antena || "",
            nombre: feat.properties?.nombre || "",
            coordinates: feat.geometry?.coordinates || null,
          }));
          setUnidades(unidadesArray);
        }
      } catch {
        // error de red silencioso
      }
    };
    fetchData();
  };

  const handleLayersChange = useCallback((layersData) => {
    setProjectLayersState(layersData);
  }, []);

  if (loading) {
    return <div>Cargando...</div>;
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login onLogin={login} />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    );
  }

  const roleLabels = {
    admin: 'Administrador',
    edicion: 'Editor',
    lectura: 'Visor'
  };

  const isSmallScreen = windowWidth < 1200;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <header
        style={{
          backgroundColor: "#ffffff",
          padding: "0.5rem 1rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          zIndex: 1001,
        }}
      >
        <img src={logoHeader} alt="Geoportal BCA — Seresco Geoinformación" style={{ height: 40 }} />
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          {!isSmallScreen && (
            <span style={{ color: "var(--bs-primary)" }}>
              {user.username} ({roleLabels[user.role] || user.role})
            </span>
          )}
          <button
            onClick={logout}
            style={{
              backgroundColor: "var(--bs-danger)",
              color: "white",
              border: "none",
              padding: "0.5rem 0.8rem",
              borderRadius: 4
            }}
          >
            {isSmallScreen ? 'Salir' : 'Cerrar sesión'}
          </button>
        </div>
      </header>

      <main style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
        <h1 className="visually-hidden">Geoportal Base Cartográfica Autonómica</h1>

        {showDashboard && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 2000,
            backgroundColor: '#f5f5f5'
          }}>
            <Dashboard
              onBack={() => setShowDashboard(false)}
              showHojasLayer={showHojasLayer}
              setShowHojasLayer={setShowHojasLayer}
            />
          </div>
        )}

        {!leftPanelCollapsed && isSmallScreen && (
          <div
            onClick={() => setLeftPanelCollapsed(true)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              zIndex: 1001
            }}
          />
        )}

        <LeftPanel
          osmVisible={osmVisible}
          setOsmVisible={setOsmVisible}
          catastroVisible={catastroVisible}
          setCatastroVisible={setCatastroVisible}
          pnoaVisible={pnoaVisible}
          setPnoaVisible={setPnoaVisible}
          wmsVisible={wmsVisible}
          setWmsVisible={setWmsVisible}
          leftPanelCollapsed={leftPanelCollapsed}
          setLeftPanelCollapsed={setLeftPanelCollapsed}
          unidades={unidades}
          onSelectFeature={handleSelectFeature}
          mapRef={mapRef}
          vectorLayerRef={vectorLayerRef}
          measureDistanceEnabled={measureDistanceEnabled}
          setMeasureDistanceEnabled={setMeasureDistanceEnabled}
          measureAreaEnabled={measureAreaEnabled}
          setMeasureAreaEnabled={setMeasureAreaEnabled}
          clearMeasurements={() => setClearMeasurements(true)}
          exportGeoJSON={() => setExportGeoJSON(true)}
          exportWKT={() => setExportWKT(true)}
          exportKML={() => setExportKML(true)}
          hasMeasurements={hasMeasurements}
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          onDashboardClick={() => setShowDashboard(true)}
          onCoverageCalculated={setCoverageInfo}
          newAntennaMode={newAntennaMode}
          setNewAntennaMode={setNewAntennaMode}
          deleteAntennaMode={deleteAntennaMode}
          setDeleteAntennaMode={setDeleteAntennaMode}
          onAntennaCreated={handleAntennaCreated}
          onLayersChange={handleLayersChange}
          visibleLayers={projectLayersState.visibleLayers}
        />

        <div style={{ flex: 1, minWidth: 0 }}>
          {puntosGeoJSON && (
            <MapView
              ref={mapRef}
              vectorLayerRef={vectorLayerRef}
              unidades={unidades}
              setSelectedFeature={handleSelectFeature}
              osmVisible={osmVisible}
              catastroVisible={catastroVisible}
              pnoaVisible={pnoaVisible}
              wmsVisible={wmsVisible}
              scale={scale}
              measureDistanceEnabled={measureDistanceEnabled}
              measureAreaEnabled={measureAreaEnabled}
              clearMeasurements={clearMeasurements}
              onClearDone={() => setClearMeasurements(false)}
              exportGeoJSON={exportGeoJSON}
              exportWKT={exportWKT}
              exportKML={exportKML}
              onExportDone={() => {
                setExportGeoJSON(false);
                setExportWKT(false);
                setExportKML(false);
              }}
              onHasMeasurementsChange={setHasMeasurements}
              leftPanelCollapsed={leftPanelCollapsed}
              setLeftPanelCollapsed={setLeftPanelCollapsed}
              isMeasuringActive={isMeasuringActive}
              coverageInfo={coverageInfo}
              panelOpen={panelOpen}
              setPanelOpen={setPanelOpen}
              newAntennaMode={newAntennaMode}
              onAntennaCreated={handleAntennaCreated}
              setNewAntennaMode={setNewAntennaMode}
              deleteAntennaMode={deleteAntennaMode}
              projectLayersState={projectLayersState}
              showHojasLayer={showHojasLayer}
            />
          )}
        </div>

        <RightPanel
          featureInfo={selectedFeature}
          panelOpen={panelOpen}
          setPanelOpen={setPanelOpen}
          leftPanelCollapsed={leftPanelCollapsed}
          isSmallScreen={isSmallScreen}
        />
      </main>

      <footer style={{
        backgroundColor: "#fff",
        padding: "0.25rem 1rem",
        display: "flex",
        justifyContent: "space-between",
        boxShadow: "0 -2px 4px rgba(0,0,0,0.1)",
        fontSize: "0.8rem"
      }}>
        <img src={logoFooter} alt="Seresco Geoinformación" style={{ height: 30 }} />
        <span style={{ color: "var(--bs-primary)" }}>
          Geoportal BCA — v1.0
        </span>
      </footer>
    </div>
  );
}

function App() {
  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <AuthProvider>
        <ProjectProvider>
          <AppContent />
        </ProjectProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;