import { useEffect } from 'react';
import { transform } from 'ol/proj';
import { Icon, Style } from 'ol/style';

export default function useAntennaSelection({
  mapInstanceRef,
  vectorLayerRef,
  unidades,
  vectorVisible,
  setSelectedFeature
}) {
  useEffect(() => {
    if (!mapInstanceRef?.current || !vectorLayerRef?.current) return;

    const map = mapInstanceRef.current;
    const layer = vectorLayerRef.current;

    const getFeatureStyle = (feature) => {
      const selected = feature.get('selected');
      return new Style({
        image: new Icon({
          src: selected
            ? '/styles/icons/antenna_selected.svg'
            : '/styles/icons/antenna.svg',
          scale: 0.05,
          anchor: [0.5, 1],
        }),
      });
    };

    layer.setStyle(getFeatureStyle);

    const handleClick = (evt) => {
      if (!vectorVisible) return;

      let clickedFeature = null;
      map.forEachFeatureAtPixel(evt.pixel, (feature) => {
        clickedFeature = feature;
        return true;
      });

      if (!clickedFeature) return;

      const featureProps = clickedFeature.getProperties();
      const fullFeature = unidades.find(
        (u) => Number(u.ubicacion_id) === Number(featureProps.ubicacion_id)
      );

      if (fullFeature) {
        setSelectedFeature(fullFeature);

        layer.getSource().getFeatures().forEach((f) => f.set('selected', false));

        clickedFeature.set('selected', true);

        layer.changed();

        const view = map.getView();
        let center = null;

        if (fullFeature.x && fullFeature.y) {
          center = [Number(fullFeature.x), Number(fullFeature.y)];
        } else if (fullFeature.lon !== undefined && fullFeature.lat !== undefined) {
          center = transform(
            [Number(fullFeature.lon), Number(fullFeature.lat)],
            'EPSG:4326',
            'EPSG:25830'
          );
        }

        if (center) {
          view.animate({ center, zoom: 20, duration: 700 });
        }
      } else {
        setSelectedFeature(featureProps);
      }
    };

    map.on('singleclick', handleClick);

    return () => {
      map.un('singleclick', handleClick);
    };
  }, [mapInstanceRef, vectorLayerRef, unidades, vectorVisible, setSelectedFeature]);
}
