import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import DashboardActuaciones from './DashboardActuaciones';
import DashboardAdmin from './DashboardAdmin';
import DashboardBCA from './DashboardBCA';

const Dashboard = ({ onBack, showHojasLayer, setShowHojasLayer }) => {
  const { user } = useAuth();
  const [dashboardActivo, setDashboardActivo] = useState('actuaciones');

  if (!user || !['admin', 'bca'].includes(user.role)) {
    return (
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        height: '100vh', backgroundColor: '#f5f5f5',
        flexDirection: 'column', gap: '2rem'
      }}>
        <div style={{ fontSize: '4rem' }}>🔒</div>
        <div style={{ textAlign: 'center', color: 'var(--bs-primary)' }}>
          <h2>Acceso Restringido</h2>
          <p>Tu rol no tiene acceso al dashboard.</p>
          <p>Rol actual: <strong>{user?.role}</strong></p>
        </div>
        <button onClick={onBack} style={styles.btnVolver}>
          ← Volver al Mapa
        </button>
      </div>
    );
  }

  const esAdmin = user.role === 'admin';

  const opciones = esAdmin
    ? [
        { key: 'actuaciones',   label: 'Actuaciones'    },
        { key: 'productividad', label: 'Productividad'  },
        { key: 'progreso',      label: 'Progreso Hojas' },
      ]
    : [
        { key: 'actuaciones',   label: 'Actuaciones'    },
        { key: 'progreso',      label: 'Progreso Hojas' },
      ];

  const renderContenido = () => {
    switch (dashboardActivo) {
      case 'actuaciones':
        return (
          <DashboardActuaciones
            onBack={onBack}
            userRole={user.role}
            hideHeader
          />
        );
      case 'productividad':
        return (
          <DashboardAdmin
            onBack={onBack}
            hideHeader
          />
        );
      case 'progreso':
        return (
          <DashboardBCA
            onBack={onBack}
            showHojasLayer={showHojasLayer}
            setShowHojasLayer={setShowHojasLayer}
            hideHeader
          />
        );
      default:
        return null;
    }
  };

  return (
    <div style={styles.wrapper}>
      <header style={styles.header}>
        <h2 style={styles.headerTitle}>Dashboard BCA</h2>

        <div style={styles.selectorWrapper}>
          {opciones.map(op => (
            <button
              key={op.key}
              onClick={() => setDashboardActivo(op.key)}
              style={{
                ...styles.selectorBtn,
                ...(dashboardActivo === op.key ? styles.selectorBtnActivo : {})
              }}
            >
              {op.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {dashboardActivo === 'progreso' && (
            <button
              onClick={() => setShowHojasLayer(!showHojasLayer)}
              style={{
                backgroundColor: showHojasLayer ? '#28a745' : 'rgba(210, 159, 42, 0.12)',
                color: showHojasLayer ? 'white' : 'var(--bs-warning)',
                border: `1px solid ${showHojasLayer ? '#28a745' : 'rgba(210, 159, 42, 0.25)'}`,
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              {showHojasLayer ? 'Hojas visibles' : 'Mostrar hojas'}
            </button>
          )}

          <button onClick={onBack} style={styles.btnVolver}>
            ← Volver al Mapa
          </button>
        </div>
      </header>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {renderContenido()}
      </div>
    </div>
  );
};

const styles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100vh',
    backgroundColor: '#f5f5f5',
    overflow: 'hidden'
  },
  header: {
    backgroundColor: 'white',
    padding: '0.75rem 2rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    zIndex: 200,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '2px solid var(--bs-primary)',
    flexShrink: 0
  },
  headerTitle: {
    margin: 0,
    color: 'var(--bs-primary)',
    fontWeight: '600',
    fontSize: '1.3rem'
  },
  selectorWrapper: {
    display: 'flex',
    gap: '0.5rem',
    backgroundColor: 'rgba(0,58,112,0.06)',
    padding: '0.3rem',
    borderRadius: '8px'
  },
  selectorBtn: {
    background: 'transparent',
    border: 'none',
    padding: '0.6rem 1.2rem',
    borderRadius: '6px',
    fontWeight: '500',
    fontSize: '0.9rem',
    cursor: 'pointer',
    color: 'var(--bs-primary)',
    opacity: 0.6,
    transition: 'all 0.2s'
  },
  selectorBtnActivo: {
    backgroundColor: 'var(--bs-primary)',
    color: 'var(--bs-on-primary)',
    opacity: 1,
    boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
  },
  btnVolver: {
    backgroundColor: 'var(--bs-primary)',
    color: 'var(--bs-on-primary)',
    border: 'none',
    padding: '0.5rem 1.5rem',
    borderRadius: '6px',
    fontWeight: '600',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    cursor: 'pointer'
  }
};

export default Dashboard;