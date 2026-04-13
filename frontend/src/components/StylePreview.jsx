import React from 'react';

/**
 * StylePreview - Componente para mostrar preview visual de un estilo
 * 
 * Muestra una pequeña previsualización del estilo (punto, línea o polígono)
 * según la configuración del estilo
 */
const StylePreview = ({ styleConfig, size = 24 }) => {
  if (!styleConfig || !styleConfig.type) {
    return (
      <div style={{ 
        width: size, 
        height: size, 
        backgroundColor: '#ccc',
        borderRadius: '2px'
      }} />
    );
  }

  const { type } = styleConfig;

  if (type === 'point') {
    const {
      symbol = 'circle',
      size: pointSize = 8,
      color = '#3388FF',
      borderColor = '#000000',
      borderWidth = 1,
      opacity = 1
    } = styleConfig;

    return (
      <svg width={size} height={size} viewBox="0 0 20 20">
        {symbol === 'circle' && (
          <circle
            cx="10"
            cy="10"
            r={Math.min(pointSize / 2, 8)}
            fill={color}
            stroke={borderColor}
            strokeWidth={borderWidth}
            opacity={opacity}
          />
        )}
        {symbol === 'square' && (
          <rect
            x={10 - pointSize / 2}
            y={10 - pointSize / 2}
            width={pointSize}
            height={pointSize}
            fill={color}
            stroke={borderColor}
            strokeWidth={borderWidth}
            opacity={opacity}
          />
        )}
        {symbol === 'triangle' && (
          <polygon
            points={`10,${10 - pointSize / 2} ${10 + pointSize / 2},${10 + pointSize / 2} ${10 - pointSize / 2},${10 + pointSize / 2}`}
            fill={color}
            stroke={borderColor}
            strokeWidth={borderWidth}
            opacity={opacity}
          />
        )}
      </svg>
    );
  }

  if (type === 'line') {
    const {
      color = '#3388FF',
      width = 2,
      style = 'solid',
      opacity = 1
    } = styleConfig;

    const strokeDasharray = style === 'dashed' ? '4,2' : style === 'dotted' ? '2,2' : 'none';

    return (
      <svg width={size} height={size} viewBox="0 0 20 20">
        <line
          x1="2"
          y1="10"
          x2="18"
          y2="10"
          stroke={color}
          strokeWidth={width}
          strokeDasharray={strokeDasharray}
          opacity={opacity}
        />
      </svg>
    );
  }

  if (type === 'polygon') {
    const {
      fillColor = '#88FF88',
      fillOpacity = 0.5,
      borderColor = '#000000',
      borderWidth = 2,
      borderStyle = 'solid'
    } = styleConfig;

    const strokeDasharray = borderStyle === 'dashed' ? '4,2' : borderStyle === 'dotted' ? '2,2' : 'none';

    return (
      <svg width={size} height={size} viewBox="0 0 20 20">
        <rect
          x="3"
          y="3"
          width="14"
          height="14"
          fill={fillColor}
          fillOpacity={fillOpacity}
          stroke={borderColor}
          strokeWidth={borderWidth}
          strokeDasharray={strokeDasharray}
        />
      </svg>
    );
  }

  return null;
};

export default StylePreview;
