import { useEffect, useState } from 'react';
import { getCatastroFeatureInfo } from '../utils/catastroService';

export default function useCatastroInfo({ 
  mapInstanceRef, 
  catastroLayerRef, 
  catastroVisible,
  isMeasuringActive = false
}) {
  const [catastroData, setCatastroData] = useState(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const map = mapInstanceRef.current;
    const catastroLayer = catastroLayerRef.current;

    if (!map || !catastroLayer) return;

    const closePopup = () => {
      setCatastroData(null);
    };

    if (!catastroVisible || isMeasuringActive) {
      closePopup();
    }

    const handleMapClick = async (event) => {
      if (!catastroVisible || isMeasuringActive) {
        closePopup();
        return;
      }

      const coordinate = event.coordinate;
      const pixel = event.pixel;

      const data = await getCatastroFeatureInfo(coordinate, map, catastroLayer);

      if (data) {
        setPopupPosition({
          x: pixel[0] + 15,
          y: pixel[1] - 10
        });
        setCatastroData(data);
      } else {
        closePopup();
      }
    };

    map.on('click', handleMapClick);

    return () => {
      map.un('click', handleMapClick);
    };
  }, [mapInstanceRef, catastroLayerRef, catastroVisible, isMeasuringActive]);

  const closeCatastroPopup = () => {
    setCatastroData(null);
  };

  return {
    catastroData,
    popupPosition,
    closeCatastroPopup
  };
}
