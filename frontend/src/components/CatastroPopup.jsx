import React from 'react';

const CatastroPopup = ({ data, position, onClose }) => {
  if (!data) return null;

  return (
    <div
      style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        backgroundColor: '#ffffff',
        border: '2px solid var(--bs-primary)',
        borderRadius: '8px',
        padding: '0',
        zIndex: 10000,
        minWidth: '280px',
        maxWidth: '320px',
        boxShadow: '0 4px 12px rgba(0, 58, 112, 0.3)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--bs-primary)',
          color: 'white',
          padding: '0.75rem 1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '2px solid var(--bs-warning)'
        }}
      >
        <h6 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '600' }}>
          📍 Información Catastral
        </h6>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'white',
            fontSize: '1.5rem',
            cursor: 'pointer',
            padding: '0',
            lineHeight: '1',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.2)'}
          onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          title="Cerrar"
        >
          ×
        </button>
      </div>

      <div style={{ padding: '1rem' }}>
        <div style={{ marginBottom: '0.75rem' }}>
          <p style={{ 
            margin: '0 0 0.25rem 0', 
            fontSize: '0.75rem', 
            color: '#666',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            fontWeight: '600'
          }}>
            Referencia Catastral
          </p>
          <p style={{ 
            margin: 0, 
            fontSize: '0.9rem', 
            color: 'var(--bs-primary)',
            fontWeight: '500',
            wordBreak: 'break-all'
          }}>
            {data.referenciaCatastral}
          </p>
        </div>

        <a
          href={data.link}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            width: '100%',
            padding: '0.6rem 1rem',
            backgroundColor: 'var(--bs-warning)',
            color: 'var(--bs-primary)',
            textDecoration: 'none',
            borderRadius: '4px',
            fontSize: '0.85rem',
            fontWeight: '600',
            textAlign: 'center',
            transition: 'all 0.2s',
            border: 'none',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#e8b525';
            e.target.style.transform = 'translateY(-1px)';
            e.target.style.boxShadow = '0 2px 6px rgba(210, 159, 42, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'var(--bs-warning)';
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = 'none';
          }}
        >
          🔗 Ver ficha completa en Catastro
        </a>
      </div>
    </div>
  );
};

export default CatastroPopup;
