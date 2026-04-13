import React, { useEffect, useState, useCallback } from 'react';
import { fetchWithAuth } from '../utils/fetchWithAuth';
import { Container, Card, Row, Col, Spinner, Alert, Form, Button, Tabs, Tab, Table } from 'react-bootstrap';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { API_BASE } from '../config';

const DashboardActuaciones = ({ onBack, userRole = 'bca', hideHeader = false }) => {
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [activeTab, setActiveTab] = useState('resumen');

  const [resumen, setResumen]           = useState(null);
  const [porFenomeno, setPorFenomeno]   = useState([]);
  const [porHoja, setPorHoja]           = useState([]);
  const [porTecnico, setPorTecnico]     = useState([]);
  const [evolucion, setEvolucion]       = useState([]);

  const [fechaDesde, setFechaDesde]         = useState('');
  const [fechaHasta, setFechaHasta]         = useState('');
  const [hojaFiltro, setHojaFiltro]         = useState('');
  const [fenomenoFiltro, setFenomenoFiltro] = useState('');
  const [filtrosDisponibles, setFiltrosDisponibles] = useState({ hojas: [], fenomenos: [], tecnicos: [] });
  const [agrupacion, setAgrupacion]         = useState('semana');

  const COLORS = {
    creaciones:     '#28a745',
    modificaciones: '#457b9d',
    eliminaciones:  '#e76f51',
    total:          '#D29F2A',
    series: ['#457b9d', '#2d6a4f', '#e76f51', '#f4a261', '#e9c46a', '#9ca3af', '#003A70']
  };

  const buildParams = useCallback((extra = {}) => {
    const p = new URLSearchParams();
    if (fechaDesde)     p.set('fecha_desde', fechaDesde);
    if (fechaHasta)     p.set('fecha_hasta', fechaHasta);
    if (hojaFiltro)     p.set('hoja', hojaFiltro);
    if (fenomenoFiltro) p.set('fenomeno', fenomenoFiltro);
    Object.entries(extra).forEach(([k, v]) => v && p.set(k, v));
    return p.toString() ? `?${p.toString()}` : '';
  }, [fechaDesde, fechaHasta, hojaFiltro, fenomenoFiltro]);

  useEffect(() => {
    const fetchFiltros = async () => {
      try {
        if (res.ok) setFiltrosDisponibles(await res.json());
      } catch {
        // error silencioso
      }
    };
    fetchFiltros();
  }, []);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params      = buildParams();
      const paramsSemana = buildParams({ agrupacion });

      const requests = [
        fetchWithAuth(`${API_BASE}/bca/dashboard/resumen${params}`),
        fetchWithAuth(`${API_BASE}/bca/dashboard/por-fenomeno${params}`),
        fetchWithAuth(`${API_BASE}/bca/dashboard/por-hoja${params}`),
        fetchWithAuth(`${API_BASE}/bca/dashboard/evolucion${paramsSemana}`),
      ];

      if (userRole === 'admin') {
        requests.push(fetchWithAuth(`${API_BASE}/bca/dashboard/por-tecnico${params}`));
      }

      const responses = await Promise.all(requests);
      if (!responses[0].ok) throw new Error('Error cargando datos del dashboard');

      const [resumenData, fenomenoData, hojaData, evolucionData, tecnicoData] =
        await Promise.all(responses.map(r => r.json()));

      setResumen(resumenData);
      setPorFenomeno(fenomenoData.fenomenos || []);
      setPorHoja(hojaData.hojas || []);
      setEvolucion(evolucionData.evolucion || []);
      if (tecnicoData) setPorTecnico(tecnicoData.tecnicos || []);

    } catch {
      setError('Error al cargar los datos del dashboard');
    } finally {
      setLoading(false);
    }
  }, [buildParams, agrupacion, userRole]);

  useEffect(() => { fetchAllData(); }, [fetchAllData]);

  const handleAplicarFiltros = () => fetchAllData();
  const handleLimpiarFiltros = () => {
    setFechaDesde(''); setFechaHasta(''); setHojaFiltro(''); setFenomenoFiltro('');
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
        <button onClick={onBack} style={styles.btnVolver}>Volver al Mapa</button>
      </Container>
    );
  }

  const pieDataAcciones = [
    { name: 'Creaciones',    value: resumen?.objetos_creados      || 0, color: COLORS.creaciones    },
    { name: 'Modificaciones',value: resumen?.objetos_modificados  || 0, color: COLORS.modificaciones},
    { name: 'Eliminaciones', value: resumen?.objetos_eliminados   || 0, color: COLORS.eliminaciones },
  ].filter(d => d.value > 0);

  const barFenomeno = porFenomeno.slice(0, 15).map(f => ({
    nombre:        f.fenomeno.replace(/^TM\d+_\d+_/, '').replace(/_[A-Z]$/, ''),
    objetos:       f.objetos_unicos,
    creaciones:    f.creaciones,
    modificaciones:f.modificaciones,
    eliminaciones: f.eliminaciones,
  }));

  const lineEvolucion = evolucion.map(e => ({
    periodo:    e.periodo ? e.periodo.substring(0, 10) : '',
    objetos:    e.objetos_unicos,
    operaciones:e.operaciones,
  }));

  return (
    <div style={styles.wrapper}>
      {!hideHeader && (
        <div style={styles.header}>
          <h2 style={styles.headerTitle}>Actuaciones BCA - Consumo Interno</h2>
          <button onClick={onBack} style={styles.btnVolver}>Volver al Mapa</button>
        </div>
      )}

      <Container fluid style={{ padding: '1.5rem', paddingBottom: '8rem' }}>
        <Card style={{ ...styles.card, marginBottom: '1.5rem' }}>
          <Card.Body>
            <Card.Title style={styles.cardTitle}>Filtros</Card.Title>
            <Row className="g-2 align-items-end">
              <Col md={2}>
                <Form.Label style={styles.label}>Desde</Form.Label>
                <Form.Control type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} size="sm" />
              </Col>
              <Col md={2}>
                <Form.Label style={styles.label}>Hasta</Form.Label>
                <Form.Control type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} size="sm" />
              </Col>
              <Col md={2}>
                <Form.Label style={styles.label}>Hoja</Form.Label>
                <Form.Select value={hojaFiltro} onChange={e => setHojaFiltro(e.target.value)} size="sm">
                  <option value="">Todas</option>
                  {filtrosDisponibles.hojas.map(h => (<option key={h.id_hoja} value={h.id_hoja}>{h.id_hoja}</option>))}
                </Form.Select>
              </Col>
              <Col md={3}>
                <Form.Label style={styles.label}>Fenómeno</Form.Label>
                <Form.Select value={fenomenoFiltro} onChange={e => setFenomenoFiltro(e.target.value)} size="sm">
                  <option value="">Todos</option>
                  {filtrosDisponibles.fenomenos.map(f => (
                    <option key={f.fenomeno} value={f.fenomeno}>
                      {f.fenomeno.replace(/^TM\d+_\d+_/, '').replace(/_[A-Z]$/, '')} ({f.objetos_unicos})
                    </option>
                  ))}
                </Form.Select>
              </Col>
              <Col md={3} style={{ display: 'flex', gap: '0.5rem' }}>
                <Button size="sm" onClick={handleAplicarFiltros} style={styles.btnAplicar}>Aplicar</Button>
                <Button size="sm" variant="outline-secondary" onClick={handleLimpiarFiltros}>Limpiar</Button>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        <Tabs activeKey={activeTab} onSelect={k => setActiveTab(k)} className="mb-4">

          <Tab eventKey="resumen" title="Resumen">
            <Row className="g-3 mt-1 mb-4">
              {[
                { label: 'Objetos únicos actuados', value: resumen?.objetos_unicos_total, color: COLORS.total   },
                { label: 'Hojas con actividad',     value: resumen?.hojas_con_actividad,  color: '#457b9d'      },
                { label: 'Fenómenos afectados',     value: resumen?.fenomenos_afectados,  color: '#2d6a4f'      },
                { label: 'Total operaciones',       value: resumen?.total_operaciones,    color: '#6c757d'      },
              ].map((kpi, i) => (
                <Col md={3} key={i}>
                  <Card style={styles.card} className="h-100">
                    <Card.Body className="text-center">
                      <h2 style={{ color: kpi.color, fontWeight: 'bold', margin: '0.5rem 0' }}>{kpi.value?.toLocaleString() ?? '—'}</h2>
                      <p style={{ color: '#666', fontSize: '0.85rem', margin: 0 }}>{kpi.label}</p>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>

            <Row className="g-3 mb-4">
              <Col md={4}>
                <Card style={{ ...styles.card, height: '100%' }}>
                  <Card.Body>
                    <Card.Title style={styles.cardTitle}>Desglose por acción</Card.Title>
                    {[
                      { label: 'Creaciones',     value: resumen?.objetos_creados,     bg: '#d4edda', color: '#155724' },
                      { label: 'Modificaciones', value: resumen?.objetos_modificados, bg: '#cfe2ff', color: '#084298' },
                      { label: 'Eliminaciones',  value: resumen?.objetos_eliminados,  bg: '#f8d7da', color: '#842029' },
                    ].map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', backgroundColor: item.bg, borderRadius: '6px', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.9rem', color: '#333' }}>{item.label}</span>
                        <span style={{ fontSize: '1.4rem', fontWeight: 'bold', color: item.color }}>{item.value?.toLocaleString()}</span>
                      </div>
                    ))}
                    <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.75rem' }}>
                      {resumen?.primera_actuacion && <span>Desde: {resumen.primera_actuacion.substring(0, 10)}</span>}
                      {resumen?.ultima_actuacion  && <span style={{ float: 'right' }}>Hasta: {resumen.ultima_actuacion.substring(0, 10)}</span>}
                    </div>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={8}>
                <Card style={styles.card}>
                  <Card.Body>
                    <Card.Title style={styles.cardTitle}>Distribución de actuaciones</Card.Title>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={pieDataAcciones} cx="50%" cy="50%" outerRadius={85} dataKey="value" label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                          {pieDataAcciones.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
                        </Pie>
                        <Tooltip formatter={(v) => v.toLocaleString()} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Tab>

          <Tab eventKey="fenomeno" title="Por Fenómeno">
            <Row className="g-3 mt-1">
              <Col md={12}>
                <Card style={styles.card}>
                  <Card.Body>
                    <Card.Title style={styles.cardTitle}>Objetos únicos por fenómeno cartográfico (top 15)</Card.Title>
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={barFenomeno} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="nombre" type="category" width={160} tick={{ fontSize: 11 }} />
                        <Tooltip /><Legend />
                        <Bar dataKey="creaciones"     stackId="a" fill={COLORS.creaciones}     name="Creaciones" />
                        <Bar dataKey="modificaciones" stackId="a" fill={COLORS.modificaciones}  name="Modificaciones" />
                        <Bar dataKey="eliminaciones"  stackId="a" fill={COLORS.eliminaciones}   name="Eliminaciones" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={12}>
                <Card style={styles.card}>
                  <Card.Body>
                    <Card.Title style={styles.cardTitle}>Detalle por fenómeno</Card.Title>
                    <Table striped hover responsive size="sm">
                      <thead>
                        <tr>
                          <th>Fenómeno</th>
                          <th className="text-end">Obj. únicos</th><th className="text-end">Creaciones</th>
                          <th className="text-end">Modificaciones</th><th className="text-end">Eliminaciones</th>
                          <th className="text-end">Total ops.</th><th className="text-end">Media ops/obj</th>
                          <th>Último cambio</th>
                        </tr>
                      </thead>
                      <tbody>
                        {porFenomeno.map((f, i) => (
                          <tr key={i}>
                            <td><small>{f.fenomeno}</small></td>
                            <td className="text-end"><strong>{f.objetos_unicos}</strong></td>
                            <td className="text-end" style={{ color: '#155724' }}>{f.creaciones}</td>
                            <td className="text-end" style={{ color: '#084298' }}>{f.modificaciones}</td>
                            <td className="text-end" style={{ color: '#842029' }}>{f.eliminaciones}</td>
                            <td className="text-end">{f.total_operaciones}</td>
                            <td className="text-end">{f.media_ops_por_objeto}</td>
                            <td><small>{f.ultimo_cambio?.substring(0, 10) ?? '—'}</small></td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Tab>

          <Tab eventKey="hoja" title="Por Hoja">
            <Row className="g-3 mt-1">
              <Col md={12}>
                <Card style={styles.card}>
                  <Card.Body>
                    <Card.Title style={styles.cardTitle}>Actividad por hoja BCA (top 20)</Card.Title>
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={porHoja.slice(0, 20)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="id_hoja" tick={{ fontSize: 10 }} /><YAxis />
                        <Tooltip /><Legend />
                        <Bar dataKey="creaciones"     fill={COLORS.creaciones}     name="Creaciones"     stackId="a" />
                        <Bar dataKey="modificaciones" fill={COLORS.modificaciones} name="Modificaciones" stackId="a" />
                        <Bar dataKey="eliminaciones"  fill={COLORS.eliminaciones}  name="Eliminaciones"  stackId="a" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={12}>
                <Card style={styles.card}>
                  <Card.Body>
                    <Card.Title style={styles.cardTitle}>Detalle por hoja</Card.Title>
                    <Table striped hover responsive size="sm">
                      <thead>
                        <tr>
                          <th>ID Hoja</th><th className="text-end">Obj. únicos</th>
                          <th className="text-end">Fenómenos</th><th className="text-end">Creaciones</th>
                          <th className="text-end">Modificaciones</th><th className="text-end">Eliminaciones</th>
                          <th>Último cambio</th>
                        </tr>
                      </thead>
                      <tbody>
                        {porHoja.map((h, i) => (
                          <tr key={i}>
                            <td><strong>{h.id_hoja}</strong></td>
                            <td className="text-end">{h.objetos_unicos}</td>
                            <td className="text-end">{h.fenomenos_en_hoja}</td>
                            <td className="text-end" style={{ color: '#155724' }}>{h.creaciones}</td>
                            <td className="text-end" style={{ color: '#084298' }}>{h.modificaciones}</td>
                            <td className="text-end" style={{ color: '#842029' }}>{h.eliminaciones}</td>
                            <td><small>{h.ultimo_cambio?.substring(0, 10) ?? '—'}</small></td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Tab>

          <Tab eventKey="evolucion" title="Evolución">
            <Row className="g-3 mt-1">
              <Col md={12}>
                <Card style={styles.card}>
                  <Card.Body>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <Card.Title style={{ ...styles.cardTitle, margin: 0 }}>Evolución temporal de objetos únicos actuados</Card.Title>
                      <Form.Select size="sm" value={agrupacion} onChange={e => setAgrupacion(e.target.value)} style={{ width: 'auto' }}>
                        <option value="semana">Por semana</option>
                        <option value="mes">Por mes</option>
                      </Form.Select>
                    </div>
                    <ResponsiveContainer width="100%" height={350}>
                      <LineChart data={lineEvolucion}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="periodo" tick={{ fontSize: 11 }} />
                        <YAxis yAxisId="left" /><YAxis yAxisId="right" orientation="right" />
                        <Tooltip /><Legend />
                        <Line yAxisId="left"  type="monotone" dataKey="objetos"     stroke={COLORS.total} name="Objetos únicos"    strokeWidth={2} dot={{ r: 4 }} />
                        <Line yAxisId="right" type="monotone" dataKey="operaciones" stroke="#6c757d"      name="Total operaciones" strokeWidth={1} strokeDasharray="4 2" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Tab>

          {userRole === 'admin' && (
            <Tab eventKey="tecnico" title="Por Técnico">
              <Row className="g-3 mt-1">
                <Col md={12}>
                  <Card style={styles.card}>
                    <Card.Body>
                      <Card.Title style={styles.cardTitle}>Productividad por técnico</Card.Title>
                      {porTecnico.length === 0 ? (
                        <Alert variant="info">No hay datos de técnicos para el periodo seleccionado.</Alert>
                      ) : (
                        <>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={porTecnico}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="usuario" /><YAxis />
                              <Tooltip /><Legend />
                              <Bar dataKey="creaciones"     fill={COLORS.creaciones}     name="Creaciones"     stackId="a" />
                              <Bar dataKey="modificaciones" fill={COLORS.modificaciones} name="Modificaciones" stackId="a" />
                              <Bar dataKey="eliminaciones"  fill={COLORS.eliminaciones}  name="Eliminaciones"  stackId="a" />
                            </BarChart>
                          </ResponsiveContainer>
                          <Table striped hover responsive size="sm" className="mt-3">
                            <thead>
                              <tr>
                                <th>Usuario</th>
                                <th className="text-end">Obj. únicos</th><th className="text-end">Creaciones</th>
                                <th className="text-end">Modificaciones</th><th className="text-end">Eliminaciones</th>
                                <th className="text-end">Total ops.</th><th>Primera act.</th><th>Última act.</th>
                              </tr>
                            </thead>
                            <tbody>
                              {porTecnico.map((t, i) => (
                                <tr key={i}>
                                  <td><strong>{t.usuario}</strong></td>
                                  <td className="text-end">{t.objetos_unicos}</td>
                                  <td className="text-end" style={{ color: '#155724' }}>{t.creaciones}</td>
                                  <td className="text-end" style={{ color: '#084298' }}>{t.modificaciones}</td>
                                  <td className="text-end" style={{ color: '#842029' }}>{t.eliminaciones}</td>
                                  <td className="text-end">{t.total_operaciones}</td>
                                  <td><small>{t.primera_actuacion?.substring(0, 10) ?? '—'}</small></td>
                                  <td><small>{t.ultima_actuacion?.substring(0, 10)  ?? '—'}</small></td>
                                </tr>
                              ))}
                            </tbody>
                          </Table>
                        </>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            </Tab>
          )}
        </Tabs>
      </Container>
    </div>
  );
};

const styles = {
  wrapper:     { flex: '1 1 100%', width: '100%', maxWidth: '100%', backgroundColor: '#f5f5f5', minHeight: '100vh', height: '100%', overflowY: 'auto', paddingTop: '0', position: 'relative' },
  header:      { position: 'sticky', top: 0, backgroundColor: 'white', padding: '1rem 2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid var(--bs-primary)' },
  headerTitle: { margin: 0, color: 'var(--bs-primary)', fontWeight: '600', fontSize: '1.5rem' },
  btnVolver:   { backgroundColor: 'var(--bs-primary)', color: 'var(--bs-warning)', border: 'none', padding: '0.5rem 1.5rem', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' },
  btnAplicar:  { backgroundColor: 'var(--bs-primary)', color: 'var(--bs-warning)', border: 'none' },
  card:        { border: '2px solid var(--bs-primary)', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
  cardTitle:   { color: 'var(--bs-primary)', marginBottom: '1rem' },
  label:       { fontSize: '0.8rem', color: '#555', marginBottom: '0.2rem' }
};

export default DashboardActuaciones;