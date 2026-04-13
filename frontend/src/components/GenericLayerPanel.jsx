import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { fetchWithAuth } from '../utils/fetchWithAuth';
import { useProject } from '../context/ProjectContext';
import LayerGroupItem from './LayerGroupItem';
import { layerService } from '../services/LayerService';
import { API_BASE } from '../config';

const GenericLayerPanel = ({ onLayersChange, visibleLayers: externalVisibleLayers, mapRef }) => {
  const { currentProject } = useProject();
  const [groups, setGroups] = useState([]);
  const [layers, setLayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [selectedLayers, setSelectedLayers] = useState(new Set());
  const [hiddenGroups, setHiddenGroups] = useState(new Set());
  const [layerOpacities, setLayerOpacities] = useState(new Map());
  const [layerFilters, setLayerFilters] = useState(new Map());

  const lastNotifiedRef = useRef(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (externalVisibleLayers && isInitialMount.current) {
      setSelectedLayers(new Set(externalVisibleLayers));
      isInitialMount.current = false;
    }
  }, [externalVisibleLayers]);

  useEffect(() => {
    if (!currentProject) {
      setGroups([]);
      setLayers([]);
      setSelectedLayers(new Set());
      setHiddenGroups(new Set());
      setLayerOpacities(new Map());
      setLayerFilters(new Map());
      isInitialMount.current = true;
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [groupsRes, layersRes] = await Promise.all([
          fetchWithAuth(`${API_BASE}/projects/${currentProject.project_code}/groups`, {
          }),
          fetchWithAuth(`${API_BASE}/projects/${currentProject.project_code}/layers`, {
          })
        ]);

        if (!groupsRes.ok || !layersRes.ok) {
          throw new Error('Error al cargar datos del proyecto');
        }

        const groupsData = await groupsRes.json();
        const layersData = await layersRes.json();

        setGroups(groupsData);
        setLayers(layersData);

        const initialOpacities = new Map();
        const initialFilters = new Map();
        layersData.forEach(layer => {
          initialOpacities.set(layer.layer_id, 1.0);
          initialFilters.set(layer.layer_id, []);
        });
        setLayerOpacities(initialOpacities);
        setLayerFilters(initialFilters);

      } catch {
        setError('Error al cargar datos del proyecto');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentProject]);

  const actuallyVisibleLayers = useMemo(() => {
    return new Set(
      Array.from(selectedLayers).filter(layerId => {
        const layer = layers.find(l => l.layer_id === layerId);
        return layer && !hiddenGroups.has(layer.group_id);
      })
    );
  }, [selectedLayers, hiddenGroups, layers]);

  const selectedLayersKey = useMemo(() =>
    Array.from(selectedLayers).sort().join(','),
    [selectedLayers]
  );

  const visibleLayersKey = useMemo(() =>
    Array.from(actuallyVisibleLayers).sort().join(','),
    [actuallyVisibleLayers]
  );

  useEffect(() => {
    if (!onLayersChange) return;
    const currentKey = visibleLayersKey + '|' + selectedLayersKey + '|' + layers.length + '|' + (currentProject?.project_code || '');

    if (lastNotifiedRef.current === currentKey) return;

    lastNotifiedRef.current = currentKey;
    onLayersChange({
      visibleLayers: actuallyVisibleLayers,
      selectedLayers: selectedLayers,
      allLayers: layers,
      currentProject
    });
  }, [visibleLayersKey, selectedLayersKey, layers.length, currentProject?.project_code]);

  const handleLayerToggle = useCallback((layerId) => {
    setSelectedLayers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(layerId)) {
        newSet.delete(layerId);
      } else {
        newSet.add(layerId);
      }
      return newSet;
    });
  }, []);

  const handleGroupToggle = useCallback((groupId, shouldBeVisible) => {
    setHiddenGroups(prev => {
      const newSet = new Set(prev);
      if (shouldBeVisible) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  }, []);

  const handleOpacityChange = useCallback((layerId, newOpacity) => {
    setLayerOpacities(prev => {
      const newMap = new Map(prev);
      newMap.set(layerId, newOpacity);
      return newMap;
    });
    layerService.setLayerOpacity(layerId, newOpacity);
  }, []);

  const handleApplyFilter = useCallback((layerId, filters) => {
    setLayerFilters(prev => {
      const newMap = new Map(prev);
      newMap.set(layerId, filters);
      return newMap;
    });
    layerService.applyFilters(layerId, filters);
  }, []);

  if (!currentProject) {
    return (
      <div style={{
        padding: '1rem',
        textAlign: 'center',
        color: 'var(--bs-warning)',
        opacity: 0.7,
        fontSize: '0.9rem'
      }}>
        Selecciona un proyecto para ver las capas disponibles
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{
        padding: '1rem',
        textAlign: 'center',
        color: 'var(--bs-warning)'
      }}>
        <div className="spinner-border spinner-border-sm me-2" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
        Cargando capas...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: '1rem',
        color: '#ff6b6b',
        fontSize: '0.85rem',
        backgroundColor: 'rgba(255, 107, 107, 0.1)',
        borderRadius: '4px',
        margin: '0.5rem'
      }}>
        Error: {error}
      </div>
    );
  }

  const totalGroups = groups.length;
  const totalLayers = layers.length;
  const activeLayers = actuallyVisibleLayers.size;
  const selectedCount = selectedLayers.size;
  const filteredLayersCount = Array.from(layerFilters.values()).filter(f => f.length > 0).length;

  return (
    <div style={{ padding: '0.5rem 0' }}>
      <div style={{
        padding: '0.5rem',
        marginBottom: '0.5rem',
        backgroundColor: 'rgba(210, 159, 42, 0.1)',
        borderRadius: '4px',
        fontSize: '0.8rem',
        color: 'var(--bs-warning)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.4rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{totalGroups} grupos</span>
          <span>{totalLayers} capas</span>
        </div>

        {(selectedCount > 0 || activeLayers > 0 || filteredLayersCount > 0) && (
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            justifyContent: 'flex-end',
            fontSize: '0.75rem',
            flexWrap: 'wrap'
          }}>
            {selectedCount > 0 && (
              <span style={{
                backgroundColor: 'rgba(210, 159, 42, 0.2)',
                padding: '0.2rem 0.5rem',
                borderRadius: '3px'
              }}>
                {selectedCount} selec.
              </span>
            )}
            {activeLayers > 0 && (
              <span style={{
                backgroundColor: 'rgba(210, 159, 42, 0.3)',
                padding: '0.2rem 0.5rem',
                borderRadius: '3px',
                fontWeight: 'bold'
              }}>
                {activeLayers} visibles
              </span>
            )}
            {filteredLayersCount > 0 && (
              <span style={{
                backgroundColor: 'rgba(100, 200, 255, 0.2)',
                padding: '0.2rem 0.5rem',
                borderRadius: '3px',
                color: '#64B5F6',
                fontWeight: 'bold'
              }}>
                {filteredLayersCount} filtrada{filteredLayersCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}
      </div>

      <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '0.25rem' }}>
        {groups
          .filter(g => !g.parent_group_id)
          .map(group => (
            <LayerGroupItem
              key={group.group_id}
              group={group}
              allGroups={groups}
              allLayers={layers}
              selectedLayers={selectedLayers}
              hiddenGroups={hiddenGroups}
              onLayerToggle={handleLayerToggle}
              onGroupToggle={handleGroupToggle}
              mapRef={mapRef}
              onOpacityChange={handleOpacityChange}
              layerOpacities={layerOpacities}
              onApplyFilter={handleApplyFilter}
              layerFilters={layerFilters}
              level={0}
            />
          ))}
      </div>
    </div>
  );
};

export default GenericLayerPanel;