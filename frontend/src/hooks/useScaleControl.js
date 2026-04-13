import { useEffect, useRef } from 'react';

export default function useScaleControl(mapInstanceRef, mapContainerRef, initialScale = 1000) {
  const scaleInputRef = useRef(null);
  const coordsDivRef = useRef(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (!mapInstanceRef?.current || !mapContainerRef?.current) return;
    
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    const map = mapInstanceRef.current;

    const coordsDiv = document.createElement('div');
    coordsDiv.style.position = 'absolute';
    coordsDiv.style.bottom = '10px';
    coordsDiv.style.left = '10px';
    coordsDiv.style.background = 'rgba(0,0,0,0.5)';
    coordsDiv.style.padding = '3px 6px';
    coordsDiv.style.fontSize = '0.8rem';
    coordsDiv.style.zIndex = '1000';
    coordsDiv.style.whiteSpace = 'nowrap';
    coordsDiv.style.borderRadius = '4px';
    coordsDiv.style.pointerEvents = 'auto';
    mapContainerRef.current.appendChild(coordsDiv);
    coordsDivRef.current = coordsDiv;

    const scaleInput = document.createElement('input');
    scaleInput.type = 'number';
    scaleInput.value = initialScale;
    scaleInput.style.width = '70px';
    scaleInput.style.marginLeft = '6px';
    scaleInput.style.padding = '1px 3px';
    scaleInput.style.fontSize = '0.8rem';
    scaleInputRef.current = scaleInput;

    scaleInput.addEventListener('change', () => {
      const newScale = Number(scaleInput.value);
      if (isNaN(newScale) || newScale <= 0) return;
      map.getView().setResolution(0.00028 * newScale);
    });

    coordsDiv.appendChild(scaleInputRef.current);

    const handlePointerMove = (evt) => {
      if (!coordsDivRef.current || !scaleInputRef.current) return;
      
      const coord = map.getEventCoordinate(evt.originalEvent);
      if (!coord) return;
      
      const [x, y] = coord;
      const currentScale = Math.round(map.getView().getResolution() / 0.00028);

      const inputElement = scaleInputRef.current;
      const inputValue = inputElement.value;

      coordsDivRef.current.innerHTML = `
        <span style="color: var(--bs-warning);font-weight: bold;">X: </span><span style="color: var(--bs-light)">${x.toFixed(2)}</span>, 
        <span style="color: var(--bs-warning);font-weight: bold;">Y: </span><span style="color: var(--bs-light)">${y.toFixed(2)}</span>  
        <span style="color: var(--bs-warning);font-weight: bold;"> → Escala 1:</span>
      `;
      
      coordsDivRef.current.appendChild(inputElement);
      inputElement.value = currentScale;
    };

    map.on('pointermove', handlePointerMove);

    const handleResolutionChange = () => {
      if (!scaleInputRef.current) return;
      const currentScale = Math.round(map.getView().getResolution() / 0.00028);
      scaleInputRef.current.value = currentScale;
    };

    map.getView().on('change:resolution', handleResolutionChange);

    return () => {
      map.un('pointermove', handlePointerMove);
      map.getView().un('change:resolution', handleResolutionChange);
      
      if (coordsDivRef.current?.parentNode) {
        coordsDivRef.current.parentNode.removeChild(coordsDivRef.current);
      }
      
      coordsDivRef.current = null;
      scaleInputRef.current = null;
      isInitializedRef.current = false;
    };
  }, [mapInstanceRef, mapContainerRef, initialScale]);
}
