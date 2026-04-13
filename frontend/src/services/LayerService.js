import VectorLayer from 'ol/layer/Vector';
import { fetchWithAuth } from '../utils/fetchWithAuth';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import { Style, Stroke, Fill, Circle } from 'ol/style';
import { transformExtent } from 'ol/proj';
import { bbox as bboxStrategy } from 'ol/loadingstrategy';
import { API_BASE } from '../config';

class LayerService {
  constructor() {
    this.layers = new Map();
  }

  createLoader(layerId) {
    return async (extent, resolution, projection) => {
      try {
        const layerData = this.layers.get(layerId);
        if (!layerData) return;

        const hasFilters = layerData.metadata.filters && layerData.metadata.filters.length > 0;

        let url = `${API_BASE}/layers/${layerId}/features?limit=10000`;

        if (!hasFilters) {
          const extentWGS84 = transformExtent(extent, 'EPSG:25830', 'EPSG:4326');
          const [minX, minY, maxX, maxY] = extentWGS84;
          url += `&bbox=${minX},${minY},${maxX},${maxY}`;
        }

        if (hasFilters) {
          url += `&filters=${encodeURIComponent(JSON.stringify(layerData.metadata.filters))}`;
        }

        const response = await fetchWithAuth(url, {
        });

        if (!response.ok) {
          throw new Error(`Error HTTP ${response.status}`);
        }

        const geojson = await response.json();

        const features = new GeoJSON().readFeatures(geojson, {
          dataProjection: 'EPSG:4326',
          featureProjection: 'EPSG:25830'
        });

        layerData.source.addFeatures(features);
      } catch {
        const layerData = this.layers.get(layerId);
        if (layerData) {
          layerData.source.removeLoadedExtent(extent);
        }
      }
    };
  }

  async addLayerToMap(map, layerId, layerName, geometryType = null, styleConfig = null, opacity = 1) {
    if (this.layers.has(layerId)) return;

    if (!styleConfig) {
      styleConfig = await this.fetchLayerStyle(layerId);
    }

    const style = this.createStyleFromConfig(geometryType, styleConfig);

    const vectorSource = new VectorSource({
      format: new GeoJSON(),
      strategy: bboxStrategy
    });

    const vectorLayer = new VectorLayer({
      source: vectorSource,
      style: style,
      opacity: opacity,
      zIndex: 100,
      properties: {
        isProjectLayer: true,
        layerId: layerId,
        name: layerName
      }
    });

    this.layers.set(layerId, {
      layer: vectorLayer,
      source: vectorSource,
      metadata: {
        layerId,
        layerName,
        geometryType,
        styleConfig,
        opacity,
        filters: []
      }
    });

    vectorSource.setLoader(this.createLoader(layerId));
    map.addLayer(vectorLayer);
  }

  async fetchLayerStyle(layerId) {
    try {
      const response = await fetchWithAuth(
        `${API_BASE}/styles/layer/${layerId}/active`,
      );
      if (!response.ok) return null;
      const data = await response.json();
      return data.style_config;
    } catch {
      return null;
    }
  }

  async updateLayerStyle(layerId, newStyleConfig) {
    const layerData = this.layers.get(layerId);
    if (!layerData) return false;

    try {
      layerData.metadata.styleConfig = newStyleConfig;
      const newStyle = this.createStyleFromConfig(layerData.metadata.geometryType, newStyleConfig);
      const currentFeatures = layerData.source.getFeatures();
      layerData.source.clear();
      layerData.layer.setStyle(newStyle);
      layerData.source.addFeatures(currentFeatures);
      layerData.layer.changed();
      layerData.source.changed();
      return true;
    } catch {
      return false;
    }
  }

  setLayerOpacity(layerId, opacity) {
    const layerData = this.layers.get(layerId);
    if (!layerData) return false;

    try {
      const clampedOpacity = Math.max(0, Math.min(1, opacity));
      layerData.layer.setOpacity(clampedOpacity);
      layerData.metadata.opacity = clampedOpacity;
      return true;
    } catch {
      return false;
    }
  }

  getLayerOpacity(layerId) {
    return this.layers.get(layerId)?.metadata.opacity || 1;
  }

  applyFilters(layerId, filters) {
    const layerData = this.layers.get(layerId);
    if (!layerData) return false;

    try {
      layerData.metadata.filters = filters;
      layerData.source.clear();

      layerData.source.setLoader(this.createLoader(layerId));

      if (filters.length > 0) {
        layerData.source.loadingStrategy_ = (extent) => [extent];
      } else {
        layerData.source.loadingStrategy_ = bboxStrategy;
      }

      const loadedExtents = layerData.source.loadedExtentsRtree_;
      if (loadedExtents) loadedExtents.clear();

      layerData.source.refresh();
      layerData.layer.changed();
      return true;
    } catch {
      return false;
    }
  }

  clearFilters(layerId) {
    const layerData = this.layers.get(layerId);
    if (!layerData) return false;

    try {
      layerData.metadata.filters = [];
      layerData.source.clear();
      layerData.source.setLoader(this.createLoader(layerId));
      layerData.source.loadingStrategy_ = bboxStrategy;

      const loadedExtents = layerData.source.loadedExtentsRtree_;
      if (loadedExtents) loadedExtents.clear();

      layerData.source.refresh();
      layerData.layer.changed();
      return true;
    } catch {
      return false;
    }
  }

  getFilters(layerId) {
    return this.layers.get(layerId)?.metadata.filters || [];
  }

  createStyleFromConfig(geometryType, styleConfig) {
    if (!styleConfig) return this.createDefaultStyle(geometryType);

    if (geometryType === 'Point' && styleConfig.type === 'point') {
      return new Style({
        image: new Circle({
          radius: styleConfig.radius || 6,
          fill: new Fill({ color: this.hexToRgba(styleConfig.color, styleConfig.opacity || 1) }),
          stroke: new Stroke({ color: styleConfig.borderColor || '#FFFFFF', width: styleConfig.borderWidth || 2 })
        })
      });
    }

    if (geometryType === 'LineString' && styleConfig.type === 'line') {
      return new Style({
        stroke: new Stroke({
          color: this.hexToRgba(styleConfig.color, styleConfig.opacity || 1),
          width: styleConfig.width || 3,
          lineDash: styleConfig.style === 'dashed' ? [10, 5] : styleConfig.style === 'dotted' ? [2, 4] : undefined
        })
      });
    }

    if (geometryType === 'Polygon' && styleConfig.type === 'polygon') {
      return new Style({
        stroke: new Stroke({
          color: styleConfig.borderColor || '#D29F2A',
          width: styleConfig.borderWidth || 2,
          lineDash: styleConfig.borderStyle === 'dashed' ? [10, 5] : styleConfig.borderStyle === 'dotted' ? [2, 4] : undefined
        }),
        fill: new Fill({
          color: this.hexToRgba(styleConfig.fillColor, styleConfig.fillOpacity || 0.3)
        })
      });
    }

    return this.createDefaultStyle(geometryType);
  }

  hexToRgba(hex, opacity) {
    if (!hex) return `rgba(210, 159, 42, ${opacity})`;
    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }

  createDefaultStyle(geometryType) {
    const strokeColor = '#D29F2A';
    const fillColor = 'rgba(210, 159, 42, 0.2)';

    if (geometryType === 'Point') {
      return new Style({
        image: new Circle({
          radius: 6,
          fill: new Fill({ color: strokeColor }),
          stroke: new Stroke({ color: '#FFFFFF', width: 2 })
        })
      });
    }

    if (geometryType === 'LineString') {
      return new Style({
        stroke: new Stroke({ color: strokeColor, width: 3 })
      });
    }

    return new Style({
      stroke: new Stroke({ color: strokeColor, width: 2 }),
      fill: new Fill({ color: fillColor })
    });
  }

  removeLayerFromMap(map, layerId) {
    const layerData = this.layers.get(layerId);
    if (layerData) {
      map.removeLayer(layerData.layer);
      layerData.source.clear();
      this.layers.delete(layerId);
    }
  }

  clearAllLayers(map) {
    this.layers.forEach((layerData) => {
      map.removeLayer(layerData.layer);
      layerData.source.clear();
    });
    this.layers.clear();
  }

  refreshLayer(layerId) {
    const layerData = this.layers.get(layerId);
    if (layerData) {
      layerData.source.clear();
      const loadedExtents = layerData.source.loadedExtentsRtree_;
      if (loadedExtents) loadedExtents.clear();
      layerData.source.refresh();
    }
  }

  zoomToLayer(map, layerId) {
    const layerData = this.layers.get(layerId);
    if (layerData?.source) {
      const extent = layerData.source.getExtent();
      if (extent && extent.every(coord => isFinite(coord))) {
        map.getView().fit(extent, {
          padding: [50, 50, 50, 50],
          duration: 500,
          maxZoom: 18
        });
      }
    }
  }

  getActiveLayersCount() {
    return this.layers.size;
  }

  isLayerActive(layerId) {
    return this.layers.has(layerId);
  }
}

export const layerService = new LayerService();