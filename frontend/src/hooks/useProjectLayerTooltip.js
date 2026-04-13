// /home/pablold/visor-gis/frontend/src/hooks/useProjectLayerTooltip.js
// Hook para mostrar tooltip al pasar mouse sobre features de capas de proyecto

import { useEffect, useRef } from 'react';
import Overlay from 'ol/Overlay';

export default function useProjectLayerTooltip({ 
  mapInstanceRef, 
  isEnabled = true,
  delayMs = 1000
}) {
  const overlayRef = useRef(null);
  const tooltipElementRef = useRef(null);
  const timeoutRef = useRef(null);
  const currentFeatureIdRef = useRef(null);

  useEffect(() => {
    if (!mapInstanceRef?.current || !isEnabled) return;

    const map = mapInstanceRef.current;

    const tooltipElement = document.createElement('div');
    tooltipElement.className = 'ol-tooltip';
    tooltipElement.style.cssText = `
      position: absolute;
      background: linear-gradient(135deg, rgba(42, 55, 139, 0.92) 0%, rgba(42, 55, 139, 0.88) 100%);
      color: #D29F2A;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 0.875rem;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      pointer-events: none;
      white-space: nowrap;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(210, 159, 42, 0.4);
      border: 2px solid rgba(210, 159, 42, 0.5);
      z-index: 9999;
      max-width: 350px;
      white-space: normal;
      opacity: 0;
      transition: opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    `;
    tooltipElementRef.current = tooltipElement;

    const overlay = new Overlay({
      element: tooltipElement,
      offset: [0, -20],
      positioning: 'bottom-center',
      stopEvent: false
    });
    map.addOverlay(overlay);
    overlayRef.current = overlay;

    const showTooltip = () => {
      tooltipElement.style.opacity = '1';
    };

    const hideTooltip = () => {
      tooltipElement.style.opacity = '0';
      setTimeout(() => {
        overlay.setPosition(undefined);
      }, 250);
    };

    const handlePointerMove = (evt) => {
      if (evt.dragging) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        hideTooltip();
        currentFeatureIdRef.current = null;
        return;
      }

      let foundFeature = false;
      let featureId = null;

      map.forEachFeatureAtPixel(evt.pixel, (feature, layer) => {
        const zIndex = layer?.getZIndex();
        if (zIndex === 100) {
          foundFeature = true;
          featureId = feature.getId() || feature.ol_uid;

          if (currentFeatureIdRef.current !== featureId) {
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
            }
            
            hideTooltip();
            currentFeatureIdRef.current = featureId;

            timeoutRef.current = setTimeout(() => {
              const properties = feature.getProperties();
              const { geometry, ...cleanProps } = properties;

              const layerName = layer.get('name') || 'Capa desconocida';

              const entries = Object.entries(cleanProps).slice(0, 3);
              
              let content = `
                <div style="
                  font-weight: 700;
                  font-size: 0.9rem;
                  margin-bottom: 8px;
                  padding-bottom: 8px;
                  border-bottom: 2px solid rgba(210, 159, 42, 0.5);
                  color: #FFFFFF;
                  letter-spacing: 0.3px;
                  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
                ">
                  📍 ${layerName}
                </div>
              `;
              
              if (entries.length > 0) {
                entries.forEach(([key, value]) => {
                  const displayValue = value !== null && value !== undefined 
                    ? String(value).substring(0, 50)
                    : '(vacío)';
                  content += `
                    <div style="
                      margin: 6px 0;
                      font-size: 0.825rem;
                      line-height: 1.5;
                      display: flex;
                      gap: 8px;
                    ">
                      <span style="
                        opacity: 0.85;
                        font-weight: 500;
                        min-width: 80px;
                        color: #D29F2A;
                      ">${key}:</span> 
                      <strong style="
                        color: #FFFFFF;
                        font-weight: 600;
                        flex: 1;
                      ">${displayValue}</strong>
                    </div>
                  `;
                });
              }

              tooltipElement.innerHTML = content;
              overlay.setPosition(evt.coordinate);
              showTooltip();
            }, delayMs);
          }

          return true;
        }
      });

      if (!foundFeature) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        hideTooltip();
        currentFeatureIdRef.current = null;
      }
    };

    map.on('pointermove', handlePointerMove);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      map.un('pointermove', handlePointerMove);
      map.removeOverlay(overlay);
      if (tooltipElement.parentNode) {
        tooltipElement.parentNode.removeChild(tooltipElement);
      }
    };
  }, [mapInstanceRef, isEnabled, delayMs]);

  return {
    overlayRef,
    tooltipElementRef
  };
}