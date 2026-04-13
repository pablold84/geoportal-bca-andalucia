import React, { useEffect, useState } from 'react';
import { fetchWithAuth } from '../utils/fetchWithAuth';
import { Container, Card, Row, Col, Spinner, Alert, ProgressBar, Tabs, Tab } from 'react-bootstrap';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { API_BASE } from '../config';

const DashboardBCA = ({ onBack, showHojasLayer, setShowHojasLayer, hideHeader = false }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('resumen');

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/dashboard/bca/resumen`);
      if (!res.ok) throw new Error('Error al cargar estadísticas');
      setStats(await res.json());
    } catch {
      setError('Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f5f5f5' }}>
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Container fluid style={{ padding: '2rem', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
        <Alert variant="danger">{error}</Alert>
        <button onClick={onBack} style={{ backgroundColor: 'var(--bs-primary)', color: 'var(--bs-on-primary)', border: 'none', padding: '0.5rem 1.5rem', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', marginTop: '1rem' }}>
          Volver al Mapa
        </button>
      </Container>
    );
  }

  const COLORS = { completado: '#28a745', en_qc: '#ffc107', en_proceso: '#17a2b8', pendiente: '#6c757d' };

  const barDataFases = [
    { fase: 'Restitución', completado: stats.res_completadas,  en_qc: stats.res_en_qc,  en_proceso: stats.res_en_proceso },
    { fase: 'Edición',     completado: stats.edi_completadas,  en_qc: stats.edi_en_qc,  en_proceso: stats.edi_en_proceso,  pendiente: stats.edi_pendiente },
    { fase: 'Producción',  completado: stats.prod_completadas, en_qc: stats.prod_en_qc, pendiente: stats.prod_pendiente }
  ];

  const pieDataRestitucion = [
    { name: 'Completado', value: stats.res_completadas,  color: COLORS.completado },
    { name: 'En QC',      value: stats.res_en_qc,        color: COLORS.en_qc      },
    { name: 'En proceso', value: stats.res_en_proceso,   color: COLORS.en_proceso }
  ];

  const pieDataEdicion = [
    { name: 'Completado', value: stats.edi_completadas,  color: COLORS.completado },
    { name: 'En QC',      value: stats.edi_en_qc,        color: COLORS.en_qc      },
    { name: 'En proceso', value: stats.edi_en_proceso,   color: COLORS.en_proceso },
    { name: 'Pendiente',  value: stats.edi_pendiente,    color: COLORS.pendiente  }
  ];

  const pieDataProduccion = [
    { name: 'Completado', value: stats.prod_completadas, color: COLORS.completado },
    { name: 'En QC',      value: stats.prod_en_qc,       color: COLORS.en_qc      },
    { name: 'Pendiente',  value: stats.prod_pendiente,   color: COLORS.pendiente  }
  ];

  return (
    <div style={{ flex: '1 1 100%', width: '100%', maxWidth: '100%', backgroundColor: '#f5f5f5', minHeight: '100vh', height: '100%', overflowY: 'auto', paddingTop: '0', position: 'relative' }}>

      {!hideHeader && (
        <div style={{ position: 'sticky', top: 0, backgroundColor: 'white', padding: '1rem 2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid var(--bs-primary)' }}>
          <h2 style={{ margin: 0, color: 'var(--bs-primary)', fontWeight: '600', fontSize: '1.5rem' }}>Dashboard BCA - Indicadores de Progreso</h2>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button
              onClick={() => setShowHojasLayer(!showHojasLayer)}
              style={{
                backgroundColor: showHojasLayer ? '#28a745' : 'rgba(210, 159, 42, 0.12)',
                color: showHojasLayer ? 'white' : 'var(--bs-warning)',
                border: `1px solid ${showHojasLayer ? '#28a745' : 'rgba(210, 159, 42, 0.25)'}`,
                padding: '0.5rem 1rem', borderRadius: '6px', fontWeight: '600', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s', fontSize: '0.9rem'
              }}
            >
              {showHojasLayer ? 'Hojas visibles' : 'Mostrar hojas'}
            </button>
            <button onClick={onBack} style={{ backgroundColor: 'var(--bs-primary)', color: 'var(--bs-on-primary)', border: 'none', padding: '0.5rem 1.5rem', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>
              Volver al Mapa
            </button>
          </div>
        </div>
      )}

      <Container fluid style={{ padding: '2rem', paddingBottom: '8rem' }}>
        <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-4">

          <Tab eventKey="resumen" title="Resumen">
            <Row className="mb-4 mt-3">
              <Col md={12}>
                <Card style={cardStyle}>
                  <Card.Body>
                    <Card.Title style={{ color: 'var(--bs-primary)', fontSize: '0.9rem' }}>Total Hojas Cartográficas</Card.Title>
                    <h2 style={{ color: 'var(--bs-warning)', fontWeight: 'bold', marginBottom: 0 }}>{stats.total_hojas}</h2>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            <Row className="mb-4">
              <Col md={12}>
                <Card style={cardStyle}>
                  <Card.Body>
                    <Card.Title style={{ color: 'var(--bs-primary)', marginBottom: '1rem' }}>Fase: Restitución</Card.Title>
                    <ProgressBar now={parseFloat(stats.res_pct_completado)} label={`${stats.res_pct_completado}%`} style={{ height: '30px', marginBottom: '1rem' }} />
                    <div style={rowStats}>
                      <StatBox label="En proceso"  value={stats.res_en_proceso}  bg="#f8f9fa"  color="var(--bs-primary)" />
                      <StatBox label="En QC"       value={stats.res_en_qc}       bg="#fff3cd"  color="#856404" />
                      <StatBox label="Completadas" value={stats.res_completadas} bg="#d4edda"  color="#155724" />
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            <Row className="mb-4">
              <Col md={12}>
                <Card style={cardStyle}>
                  <Card.Body>
                    <Card.Title style={{ color: 'var(--bs-primary)', marginBottom: '1rem' }}>Fase: Edición</Card.Title>
                    <ProgressBar now={parseFloat(stats.edi_pct_completado)} label={`${stats.edi_pct_completado}%`} variant="warning" style={{ height: '30px', marginBottom: '1rem' }} />
                    <div style={rowStats}>
                      <StatBox label="Pendiente"   value={stats.edi_pendiente}   bg="#f8f9fa"  color="#6c757d" />
                      <StatBox label="Editando"    value={stats.edi_en_proceso}  bg="#cfe2ff"  color="#084298" />
                      <StatBox label="En QC"       value={stats.edi_en_qc}       bg="#fff3cd"  color="#856404" />
                      <StatBox label="Completadas" value={stats.edi_completadas} bg="#d4edda"  color="#155724" />
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            <Row className="mb-4">
              <Col md={12}>
                <Card style={cardStyle}>
                  <Card.Body>
                    <Card.Title style={{ color: 'var(--bs-primary)', marginBottom: '1rem' }}>Fase: Producción</Card.Title>
                    <ProgressBar now={parseFloat(stats.prod_pct_completado)} label={`${stats.prod_pct_completado}%`} variant="success" style={{ height: '30px', marginBottom: '1rem' }} />
                    <div style={rowStats}>
                      <StatBox label="Pendiente"   value={stats.prod_pendiente}   bg="#f8f9fa" color="#6c757d" />
                      <StatBox label="En QC"       value={stats.prod_en_qc}       bg="#fff3cd" color="#856404" />
                      <StatBox label="Completadas" value={stats.prod_completadas} bg="#d4edda" color="#155724" />
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Tab>

          <Tab eventKey="graficos" title="Gráficos">
            <Row className="mb-4 mt-3">
              <Col md={12}>
                <Card style={cardStyle}>
                  <Card.Body>
                    <Card.Title style={{ color: 'var(--bs-primary)', marginBottom: '1.5rem' }}>Estado por Fase (Barras Apiladas)</Card.Title>
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={barDataFases}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="fase" /><YAxis />
                        <Tooltip /><Legend />
                        <Bar dataKey="completado" stackId="a" fill={COLORS.completado} name="Completado" />
                        <Bar dataKey="en_qc"      stackId="a" fill={COLORS.en_qc}      name="En QC" />
                        <Bar dataKey="en_proceso" stackId="a" fill={COLORS.en_proceso}  name="En proceso" />
                        <Bar dataKey="pendiente"  stackId="a" fill={COLORS.pendiente}   name="Pendiente" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            <Row className="mb-4">
              {[
                { title: 'Restitución', data: pieDataRestitucion },
                { title: 'Edición',     data: pieDataEdicion     },
                { title: 'Producción',  data: pieDataProduccion  },
              ].map((fase, i) => (
                <Col md={4} key={i}>
                  <Card style={cardStyle}>
                    <Card.Body>
                      <Card.Title style={{ color: 'var(--bs-primary)', marginBottom: '1.5rem', textAlign: 'center' }}>{fase.title}</Card.Title>
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie data={fase.data} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} outerRadius={80} dataKey="value">
                            {fase.data.map((entry, idx) => (<Cell key={idx} fill={entry.color} />))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          </Tab>
        </Tabs>
      </Container>
    </div>
  );
};

const cardStyle = { border: '2px solid var(--bs-primary)', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' };
const rowStats  = { display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' };
const StatBox = ({ label, value, bg, color }) => (
  <div style={{ flex: 1, minWidth: '110px', textAlign: 'center', padding: '0.75rem', backgroundColor: bg, borderRadius: '6px' }}>
    <div style={{ fontSize: '0.85rem', color: '#666' }}>{label}</div>
    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color }}>{value}</div>
  </div>
);

export default DashboardBCA;