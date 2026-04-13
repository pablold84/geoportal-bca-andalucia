import { useEffect } from 'react';

export default function useLayerVisibility({
  mapInstanceRef,
  osmLayerRef,
  pnoaLayerRef,
  catastroLayerRef,
  vectorLayerRef,
  osmVisible,
  pnoaVisible,
  catastroVisible,
  vectorVisible
}) {
  useEffect(() => {
    if (!mapInstanceRef?.current) return;

    if (osmLayerRef?.current) osmLayerRef.current.setVisible(osmVisible);
    if (pnoaLayerRef?.current) pnoaLayerRef.current.setVisible(pnoaVisible);
    if (catastroLayerRef?.current) catastroLayerRef.current.setVisible(catastroVisible);
    if (vectorLayerRef?.current) vectorLayerRef.current.setVisible(vectorVisible);

    if (osmLayerRef?.current) osmLayerRef.current.setOpacity(pnoaVisible ? 0.5 : 1);
  }, [osmVisible, pnoaVisible, catastroVisible, vectorVisible]);
}
