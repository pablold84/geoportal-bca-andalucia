import { useEffect, useRef } from 'react';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import { Circle as CircleGeom, Polygon } from 'ol/geom';
import { Style, Fill, Stroke } from 'ol/style';
import { fromCircle } from 'ol/geom/Polygon';
import { transform } from 'ol/proj';

const useAntennaCoverage = ({ mapInstanceRef, coverageInfo }) => {
  const coverageLayerRef = useRef(null);

  useEffect(() => {
    if (!mapInstanceRef?.current) return;

    const map = mapInstanceRef.current;

    if (!coverageLayerRef.current) {
      const source = new VectorSource();
      const layer = new VectorLayer({
        source: source,
        style: new Style({
          fill: new Fill({ color: 'rgba(255, 193, 7, 0.25)' }),
          stroke: new Stroke({ color: '#FFC107', width: 4, lineDash: [10, 5] })
        }),
        zIndex: 1000,
        visible: true
      });

      map.addLayer(layer);
      coverageLayerRef.current = layer;

      const allLayers = map.getLayers().getArray();
      const coverageIndex = allLayers.indexOf(layer);
      if (coverageIndex !== -1 && coverageIndex < allLayers.length - 1) {
        map.removeLayer(layer);
        map.addLayer(layer);
      }
    }

    const source = coverageLayerRef.current.getSource();
    source.clear();

    if (!coverageInfo) return;

    try {
      const { lat, lon, radius, azimuth, openingAngle } = coverageInfo.coverage;

      if (!lat || !lon || !radius) return;

      const center = transform([parseFloat(lon), parseFloat(lat)], 'EPSG:4326', 'EPSG:25830');
      const radiusMeters = parseFloat(radius);

      let geometry;

      if (parseFloat(openingAngle) >= 360) {
        const circle = new CircleGeom(center, radiusMeters);
        geometry = fromCircle(circle, 64);
      } else {
        geometry = createSectorPolygon(
          center,
          radiusMeters,
          parseFloat(azimuth),
          parseFloat(openingAngle)
        );
      }

      if (!geometry || !geometry.getCoordinates()) return;

      const feature = new Feature({
        geometry: geometry,
        type: 'antenna_coverage',
        name: 'Cobertura de Antena'
      });

      feature.setStyle(new Style({
        fill: new Fill({ color: 'rgba(255, 193, 7, 0.3)' }),
        stroke: new Stroke({ color: '#FFC107', width: 4, lineDash: [10, 5] })
      }));

      source.addFeature(feature);

      map.removeLayer(coverageLayerRef.current);
      map.addLayer(coverageLayerRef.current);

      source.changed();
      coverageLayerRef.current.changed();
      coverageLayerRef.current.setVisible(true);
      map.render();

      setTimeout(() => {
        const extent = source.getExtent();
        if (extent && extent.every(val => isFinite(val))) {
          map.getView().fit(extent, {
            padding: [100, 100, 100, 100],
            duration: 700,
            maxZoom: 15
          });
        }
      }, 200);

    } catch {
    }

  }, [mapInstanceRef, coverageInfo]);

  useEffect(() => {
    return () => {
      if (coverageLayerRef.current && mapInstanceRef?.current) {
        mapInstanceRef.current.removeLayer(coverageLayerRef.current);
      }
    };
  }, [mapInstanceRef]);

  return { coverageLayerRef };
};

function createSectorPolygon(center, radius, azimuth, opening) {
  const points = [center];

  const azimuthRad = (90 - azimuth) * (Math.PI / 180);
  const openingRad = opening * (Math.PI / 180);

  const startAngle = azimuthRad - openingRad / 2;
  const endAngle   = azimuthRad + openingRad / 2;

  const segments  = 64;
  const angleStep = (endAngle - startAngle) / segments;

  for (let i = 0; i <= segments; i++) {
    const angle = startAngle + i * angleStep;
    points.push([
      center[0] + radius * Math.cos(angle),
      center[1] + radius * Math.sin(angle)
    ]);
  }

  points.push(center);
  return new Polygon([points]);
}

export default useAntennaCoverage;