import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '../utils/fetchWithAuth';
import { Container, Row, Col, Card, Tabs, Tab, Table, Spinner, Alert } from 'react-bootstrap';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { API_BASE } from '../config';

const DashboardAdmin = ({ onBack, hideHeader = false }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('resumen');

  const [resumen, setResumen] = useState(null);
  const [horasUsuario, setHorasUsuario] = useState([]);
  const [distribucion, setDistribucion] = useState([]);
  const [productividadDiaria, setProductividadDiaria] = useState([]);
  const [productividadSemanal, setProductividadSemanal] = useState([]);
  const [comparativa, setComparativa] = useState([]);
  const [evolucion, setEvolucion] = useState([]);

  const COLORS = ['#457b9d', '#2d6a4f', '#e76f51', '#f4a261', '#e9c46a', '#9ca3af'];

  useEffect(() => { fetchAllData(); }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);

      const [resumenRes, horasRes, distRes, prodDiariaRes, prodSemanalRes, compRes, evolRes] = await Promise.all([
        fetchWithAuth(`${API_BASE}/dashboard/admin/resumen`),
        fetchWithAuth(`${API_BASE}/dashboard/admin/horas-usuario`),
        fetchWithAuth(`${API_BASE}/dashboard/admin/distribucion-actividades`),
        fetchWithAuth(`${API_BASE}/dashboard/admin/productividad-diaria`),
        fetchWithAuth(`${API_BASE}/dashboard/admin/productividad-semanal`),
        fetchWithAuth(`${API_BASE}/dashboard/admin/comparativa-usuarios`),
        fetchWithAuth(`${API_BASE}/dashboard/admin/evolucion-actividades`)
      ]);

      if (!resumenRes.ok) throw new Error('Error cargando datos');

      setResumen(await resumenRes.json());
      setHorasUsuario(await horasRes.json());
      setDistribucion(await distRes.json());
      setProductividadDiaria(await prodDiariaRes.json());
      setProductividadSemanal(await prodSemanalRes.json());
      setComparativa(await compRes.json());
      setEvolucion(await evolRes.json());
    } catch {
      setError('Error al cargar los datos del dashboard');
    } finally {
      setLoading(false);
    }
  };

  const ResumenTab = () => (
    <Row className="g-3">
      {[
        { value: resumen?.total_usuarios    || 0,       label: 'Usuarios Activos',  color: '#457b9d' },
        { value: resumen?.total_actividades || 0,       label: 'Actividades',        color: '#2d6a4f' },
        { value: `${resumen?.total_horas   || 0}h`,    label: 'Horas Totales',      color: '#e76f51' },
        { value: resumen?.dias_trabajados   || 0,       label: 'Días Trabajados',    color: '#f4a261' },
      ].map((kpi, i) => (
        <Col md={3} key={i}>
          <Card className="h-100">
            <Card.Body className="text-center">
              <h3 style={{ fontSize: '2rem', margin: '0.5rem 0', color: kpi.color }}>{kpi.value}</h3>
              <p className="text-muted mb-0">{kpi.label}</p>
            </Card.Body>
          </Card>
        </Col>
      ))}
    </Row>
  );

  const HorasUsuarioTab = () => (
    <Row className="g-3">
      <Col md={12}>
        <Card>
          <Card.Header><h5 className="mb-0">Horas Trabajadas por Usuario (Últimos 30 días)</h5></Card.Header>
          <Card.Body>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={horasUsuario}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="username" /><YAxis />
                <Tooltip /><Legend />
                <Bar dataKey="total_horas" fill="#457b9d" name="Horas" />
              </BarChart>
            </ResponsiveContainer>
          </Card.Body>
        </Card>
      </Col>
      <Col md={12}>
        <Card>
          <Card.Header><h5 className="mb-0">Detalle por Usuario</h5></Card.Header>
          <Card.Body>
            <Table striped hover responsive>
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th className="text-end">Actividades</th>
                  <th className="text-end">Total Horas</th>
                  <th className="text-end">Promedio/Día</th>
                  <th className="text-end">Días Trabajados</th>
                </tr>
              </thead>
              <tbody>
                {horasUsuario.map((user, idx) => (
                  <tr key={idx}>
                    <td><strong>{user.username}</strong></td>
                    <td className="text-end">{user.total_actividades}</td>
                    <td className="text-end">{user.total_horas}h</td>
                    <td className="text-end">{user.promedio_horas_dia}h</td>
                    <td className="text-end">{user.dias_trabajados}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );

  const DistribucionTab = () => (
    <Row className="g-3">
      <Col md={6}>
        <Card>
          <Card.Header><h5 className="mb-0">Distribución por Tipo</h5></Card.Header>
          <Card.Body>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={distribucion} dataKey="porcentaje" nameKey="nombre_actividad" cx="50%" cy="50%" label={(entry) => `${entry.codigo_actividad}: ${entry.porcentaje}%`}>
                  {distribucion.map((entry, index) => (<Cell key={index} fill={COLORS[index % COLORS.length]} />))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card.Body>
        </Card>
      </Col>
      <Col md={6}>
        <Card>
          <Card.Header><h5 className="mb-0">Horas por Actividad</h5></Card.Header>
          <Card.Body>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={distribucion} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="codigo_actividad" type="category" width={50} />
                <Tooltip />
                <Bar dataKey="total_horas" fill="#2d6a4f" />
              </BarChart>
            </ResponsiveContainer>
          </Card.Body>
        </Card>
      </Col>
      <Col md={12}>
        <Card>
          <Card.Header><h5 className="mb-0">Detalle de Actividades</h5></Card.Header>
          <Card.Body>
            <Table striped hover responsive size="sm">
              <thead>
                <tr>
                  <th>Código</th><th>Actividad</th>
                  <th className="text-end">Total</th><th className="text-end">%</th>
                  <th className="text-end">Horas</th><th className="text-end">Promedio/Act</th>
                  <th className="text-end">Usuarios</th>
                </tr>
              </thead>
              <tbody>
                {distribucion.map((act, idx) => (
                  <tr key={idx}>
                    <td><strong>{act.codigo_actividad}</strong></td>
                    <td>{act.nombre_actividad}</td>
                    <td className="text-end">{act.total_actividades}</td>
                    <td className="text-end">{act.porcentaje}%</td>
                    <td className="text-end">{act.total_horas}h</td>
                    <td className="text-end">{act.promedio_horas_por_actividad}h</td>
                    <td className="text-end">{act.usuarios_involucrados}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );

  const ProductividadDiariaTab = () => (
    <Card>
      <Card.Header><h5 className="mb-0">Productividad Diaria (Últimos 30 días)</h5></Card.Header>
      <Card.Body>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={productividadDiaria.slice().reverse()}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="fecha" />
            <YAxis yAxisId="left" /><YAxis yAxisId="right" orientation="right" />
            <Tooltip /><Legend />
            <Line yAxisId="left"  type="monotone" dataKey="total_horas"       stroke="#457b9d" name="Horas"       strokeWidth={2} />
            <Line yAxisId="right" type="monotone" dataKey="total_actividades" stroke="#e76f51" name="Actividades" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </Card.Body>
    </Card>
  );

  const ProductividadSemanalTab = () => (
    <Card>
      <Card.Header><h5 className="mb-0">Productividad Semanal (Últimas 8 semanas)</h5></Card.Header>
      <Card.Body>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={productividadSemanal.slice().reverse()}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="semana" /><YAxis />
            <Tooltip /><Legend />
            <Bar dataKey="total_horas"       fill="#2d6a4f" name="Horas" />
            <Bar dataKey="total_actividades" fill="#e9c46a" name="Actividades" />
          </BarChart>
        </ResponsiveContainer>
      </Card.Body>
    </Card>
  );

  const EvolucionTab = () => {
    const dataByDate = {};
    evolucion.forEach(item => {
      if (!dataByDate[item.fecha]) dataByDate[item.fecha] = { fecha: item.fecha };
      dataByDate[item.fecha][item.codigo_actividad] = parseFloat(item.total_horas);
    });
    const evolucionData = Object.values(dataByDate).reverse();
    const actividadesUnicas = [...new Set(evolucion.map(e => e.codigo_actividad))];

    return (
      <Card>
        <Card.Header><h5 className="mb-0">Evolución de Actividades (Últimos 30 días)</h5></Card.Header>
        <Card.Body>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={evolucionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="fecha" /><YAxis />
              <Tooltip /><Legend />
              {actividadesUnicas.map((codigo, idx) => (
                <Area key={codigo} type="monotone" dataKey={codigo} stackId="1" stroke={COLORS[idx % COLORS.length]} fill={COLORS[idx % COLORS.length]} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </Card.Body>
      </Card>
    );
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
      <Container className="mt-5">
        <Alert variant="danger"><Alert.Heading>Error</Alert.Heading><p>{error}</p></Alert>
      </Container>
    );
  }

  return (
    <div style={{ flex: '1 1 100%', width: '100%', maxWidth: '100%', backgroundColor: '#f5f5f5', minHeight: '100vh', height: '100%', overflowY: 'auto', paddingTop: '0', position: 'relative' }}>
      {!hideHeader && (
        <div style={{ position: 'sticky', top: 0, backgroundColor: 'white', padding: '1rem 2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid var(--bs-primary)' }}>
          <h2 style={{ margin: 0, color: 'var(--bs-primary)', fontWeight: '600', fontSize: '1.5rem' }}>Dashboard Admin - Productividad</h2>
          <button onClick={onBack} style={{ backgroundColor: 'var(--bs-primary)', color: 'var(--bs-warning)', border: 'none', padding: '0.5rem 1.5rem', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>
            Volver al Mapa
          </button>
        </div>
      )}

      <Container fluid style={{ padding: '2rem', paddingBottom: '8rem' }}>
        <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-3">
          <Tab eventKey="resumen"      title="Resumen">           <div className="mt-3"><ResumenTab /></div></Tab>
          <Tab eventKey="horas"        title="Horas por Usuario"> <div className="mt-3"><HorasUsuarioTab /></div></Tab>
          <Tab eventKey="distribucion" title="Distribución">      <div className="mt-3"><DistribucionTab /></div></Tab>
          <Tab eventKey="diaria"       title="Productividad Diaria">  <div className="mt-3"><ProductividadDiariaTab /></div></Tab>
          <Tab eventKey="semanal"      title="Productividad Semanal"> <div className="mt-3"><ProductividadSemanalTab /></div></Tab>
          <Tab eventKey="evolucion"    title="Evolución Temporal">    <div className="mt-3"><EvolucionTab /></div></Tab>
        </Tabs>
      </Container>
    </div>
  );
};

export default DashboardAdmin;