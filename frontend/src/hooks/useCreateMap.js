import { useEffect, useRef } from 'react';
import { fetchWithAuth } from '../utils/fetchWithAuth';
import { Map, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { TileWMS, OSM } from 'ol/source';
import { defaults as defaultControls } from 'ol/control';
import { get as getProjection } from 'ol/proj';
import GeoJSON from 'ol/format/GeoJSON';
import { Style, Icon } from 'ol/style';
import { API_BASE } from '../config';

const LAYER_Z_INDEX = {
  PNOA: 0,
  OSM: 1,
  CATASTRO: 2,
  ANTENNAS: 10,
  COVERAGE: 1000
};

const antennaStyle = (feature, selected = false) => {
  return new Style({
    image: new Icon({
      src: selected ? '/styles/icons/antenna_selected.svg' : '/styles/icons/antenna.svg',
      scale: 0.05,
      anchor: [0.5, 1],
    }),
  });
};

export default function useCreateMap({
  mapContainerRef,
  osmVisible = true,
  catastroVisible = true,
  pnoaVisible = true,
  vectorVisible = true,
  scale = 1000,
}) {
  const mapInstanceRef = useRef(null);
  const osmLayerRef = useRef(null);
  const catastroLayerRef = useRef(null);
  const pnoaLayerRef = useRef(null);
  const vectorLayerRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const pnoaLayer = new TileLayer({
      source: new TileWMS({
        url: 'https://www.ign.es/wms-inspire/pnoa-ma',
        params: {
          LAYERS: 'OI.OrthoimageCoverage',
          TILED: true,
          FORMAT: 'image/png'
        },
        crossOrigin: 'anonymous',
      }),
      visible: pnoaVisible,
      opacity: osmVisible ? 0.5 : 1,
      zIndex: LAYER_Z_INDEX.PNOA
    });
    pnoaLayerRef.current = pnoaLayer;

    const osmLayer = new TileLayer({
      source: new OSM(),
      visible: osmVisible,
      zIndex: LAYER_Z_INDEX.OSM
    });
    osmLayerRef.current = osmLayer;

    const catastroLayer = new TileLayer({
      source: new TileWMS({
        url: 'https://ovc.catastro.meh.es/Cartografia/WMS/ServidorWMS.aspx',
        params: {
          LAYERS: 'Catastro',
          TILED: true,
          FORMAT: 'image/png',
          VERSION: '1.1.1',
          SRS: 'EPSG:25830'
        },
        crossOrigin: 'anonymous',
      }),
      visible: catastroVisible,
      zIndex: LAYER_Z_INDEX.CATASTRO
    });
    catastroLayerRef.current = catastroLayer;

    const vectorSource = new VectorSource({
      format: new GeoJSON(),
      loader: async (extent, resolution, projection) => {
        try {
          const savedProjectCode = sessionStorage.getItem('currentProjectCode');
          if (savedProjectCode !== 'telefonica') return;

          const res = await fetchWithAuth(`${API_BASE}/unidades/geojson`, {
          });

          if (!res.ok) return;

          const data = await res.json();
          if (!data?.features || !Array.isArray(data.features)) return;

          const features = new GeoJSON().readFeatures(data, {
            dataProjection: 'EPSG:25830',
            featureProjection: projection,
          });

          features.forEach(f => f.set('selected', false));
          vectorSource.addFeatures(features);
        } catch {
          // error de red silencioso
        }
      },
    });

    const vectorLayer = new VectorLayer({
      source: vectorSource,
      visible: vectorVisible,
      style: (feature) => antennaStyle(feature, feature.get('selected') === true),
      zIndex: LAYER_Z_INDEX.ANTENNAS
    });
    vectorLayerRef.current = vectorLayer;

    const map = new Map({
      target: mapContainerRef.current,
      layers: [pnoaLayer, osmLayer, catastroLayer, vectorLayer],
      view: new View({
        projection: getProjection('EPSG:25830'),
        center: [440000, 4474000],
        zoom: 6,
        minZoom: 5,
        maxZoom: 20
      }),
      controls: defaultControls(),
    });

    mapInstanceRef.current = map;
    setTimeout(() => map.updateSize(), 100);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setTarget(null);
        mapInstanceRef.current = null;
      }
    };
  }, [mapContainerRef]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (osmLayerRef.current) osmLayerRef.current.setVisible(osmVisible);
    if (pnoaLayerRef.current) {
      pnoaLayerRef.current.setVisible(pnoaVisible);
      pnoaLayerRef.current.setOpacity(osmVisible ? 0.5 : 1);
    }
    if (catastroLayerRef.current) catastroLayerRef.current.setVisible(catastroVisible);
    if (vectorLayerRef.current) vectorLayerRef.current.setVisible(vectorVisible);
  }, [osmVisible, catastroVisible, pnoaVisible, vectorVisible]);

  return {
    mapInstanceRef,
    osmLayerRef,
    catastroLayerRef,
    pnoaLayerRef,
    vectorLayerRef,
  };
}