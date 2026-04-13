import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '../utils/fetchWithAuth';
import { Modal, Button, Nav } from 'react-bootstrap';
import { API_BASE } from '../config';

const isImage = (archivo) => {
  const ext = archivo.extension_archivo?.toLowerCase() || archivo.url_archivo?.split('.').pop()?.toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
};

const tipoColor = { FOTOS: '#007bff', GRAFICAS: '#28a745', PLANOS: '#fd7e14' };

const transformUrl = (url_archivo) => {
  if (!url_archivo) return '';
  let path = url_archivo.replace(/\\/g, '/');
  const marker = 'CARTOGRAFIA_';
  const idx = path.indexOf(marker);
  if (idx !== -1) path = path.substring(idx);
  path = decodeURIComponent(path);
  return `${API_BASE}/uploads/${encodeURI(path)}`;
};

const FileGallery = ({ archivos, autoPlayInterval = 5000 }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTipo, setActiveTipo] = useState('FOTOS');
  const [downloading, setDownloading] = useState(false);

  const archivosValidos = archivos || [];
  const imagenes = archivosValidos.filter(isImage).map((a) => ({ ...a, url: transformUrl(a.url_archivo) })).filter((a) => a.url);
  const imagenesPorTipo = imagenes.filter((img) => img.tipo_archivo === activeTipo);

  useEffect(() => {
    if (imagenesPorTipo.length <= 1) return;
    const timer = setInterval(() => setSelectedIndex((prev) => (prev + 1) % imagenesPorTipo.length), autoPlayInterval);
    return () => clearInterval(timer);
  }, [imagenesPorTipo, autoPlayInterval]);

  useEffect(() => { setSelectedIndex(0); }, [activeTipo]);

  const getRelativePath = (url_archivo) => {
    let path = url_archivo.replace(/\\/g, '/');
    const marker = 'CARTOGRAFIA_';
    const idx = path.indexOf(marker);
    if (idx !== -1) path = path.substring(idx);
    return decodeURIComponent(path);
  };

  const downloadSingleImage = async (img) => {
    try {
      const response = await fetchWithAuth(`${API_BASE}/archivos/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: getRelativePath(img.url_archivo) })
      });
      if (!response.ok) throw new Error('Error al descargar');
      const blob = await response.blob();
      const extension = img.url.split('.').pop().split('?')[0];
      const filename = img.nombre_archivo || `imagen_${Date.now()}.${extension}`;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      alert('Error al descargar la imagen. Intenta de nuevo.');
    }
  };

  const downloadAllImages = async () => {
    if (imagenesPorTipo.length === 0) { alert('No hay imágenes para descargar'); return; }
    setDownloading(true);
    try {
      const paths = imagenesPorTipo.map(img => getRelativePath(img.url_archivo));
      const response = await fetchWithAuth(`${API_BASE}/archivos/download-zip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths, zipName: activeTipo })
      });
      if (!response.ok) throw new Error('Error al crear ZIP');
      const blob = await response.blob();
      const timestamp = new Date().toISOString().split('T')[0];
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeTipo}_${timestamp}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      alert('Error al descargar las imágenes. Intenta de nuevo.');
    } finally {
      setDownloading(false);
    }
  };

  if (imagenes.length === 0) return <p>No hay imágenes para mostrar</p>;

  const prevImage = () => setSelectedIndex((selectedIndex - 1 + imagenesPorTipo.length) % imagenesPorTipo.length);
  const nextImage = () => setSelectedIndex((selectedIndex + 1) % imagenesPorTipo.length);

  return (
    <div style={{ width: '100%', maxWidth: '100%', minWidth: 0, overflow: 'hidden', marginTop: '1rem' }}>
      <Nav variant="tabs" activeKey={activeTipo} onSelect={(k) => setActiveTipo(k)} style={{ marginBottom: '0.5rem' }}>
        {['FOTOS', 'GRAFICAS', 'PLANOS'].map((tipo) => (
          <Nav.Item key={tipo}>
            <Nav.Link eventKey={tipo} style={{ color: 'var(--bs-warning)', fontSize: '0.80rem', fontWeight: '500' }}>{tipo}</Nav.Link>
          </Nav.Item>
        ))}
      </Nav>

      {imagenesPorTipo.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
          <Button size="sm" className="btn-corporate-guardar" onClick={downloadAllImages} disabled={downloading} style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', whiteSpace: 'nowrap', minWidth: '180px' }}>
            {downloading ? 'Descargando...' : `Descargar todo (${imagenesPorTipo.length})`}
          </Button>
        </div>
      )}

      <div style={{ position: 'relative', textAlign: 'center', width: '100%', maxWidth: '100%', minWidth: 0, overflow: 'hidden', marginTop: '0.5rem' }}>
        {imagenesPorTipo.length > 0 && (
          <>
            {imagenesPorTipo.length > 1 && (
              <>
                <Button variant="light" style={{ position: 'absolute', top: '50%', left: 0, transform: 'translateY(-50%)', zIndex: 2, borderRadius: '50%', opacity: 0.7 }} onClick={prevImage}>◀</Button>
                <Button variant="light" style={{ position: 'absolute', top: '50%', right: 0, transform: 'translateY(-50%)', zIndex: 2, borderRadius: '50%', opacity: 0.7 }} onClick={nextImage}>▶</Button>
              </>
            )}
            <Button size="sm" className="btn-corporate-guardar" onClick={() => downloadSingleImage(imagenesPorTipo[selectedIndex])} style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 3, fontSize: '0.75rem', padding: '0.25rem 0.5rem', opacity: 0.9 }}>
              Descargar
            </Button>
            <img loading="lazy" src={imagenesPorTipo[selectedIndex]?.url} alt={imagenesPorTipo[selectedIndex]?.nombre_archivo || ''} style={{ maxWidth: '100%', width: '100%', height: 'auto', maxHeight: '500px', objectFit: 'contain', cursor: 'pointer', borderRadius: '6px' }} onClick={() => setModalOpen(true)} />
          </>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', overflowY: 'hidden', padding: '0.5rem 0', justifyContent: 'center', maxWidth: '100%', minWidth: 0 }}>
        {imagenesPorTipo.map((img, i) => (
          <img loading="lazy" key={i} src={img.url} alt={img.nombre_archivo || ''} style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '4px', border: i === selectedIndex ? `2px solid ${tipoColor[img.tipo_archivo] || '#007bff'}` : '1px solid #ccc', cursor: 'pointer', flexShrink: 0 }} onClick={() => setSelectedIndex(i)} />
        ))}
      </div>

      <Modal show={modalOpen} onHide={() => setModalOpen(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: '1rem' }}>{imagenesPorTipo[selectedIndex]?.nombre_archivo || ''}</Modal.Title>
          <Button size="sm" className="btn-corporate-guardar" onClick={() => downloadSingleImage(imagenesPorTipo[selectedIndex])} style={{ marginLeft: 'auto', marginRight: '2rem', fontSize: '0.75rem' }}>Descargar</Button>
        </Modal.Header>
        <Modal.Body style={{ textAlign: 'center', maxWidth: '100%', overflow: 'hidden' }}>
          <img loading="lazy" src={imagenesPorTipo[selectedIndex]?.url} alt={imagenesPorTipo[selectedIndex]?.nombre_archivo || ''} style={{ maxWidth: '100%', width: '100%', height: 'auto', objectFit: 'contain' }} />
        </Modal.Body>
        <Modal.Footer style={{ justifyContent: 'space-between' }}>
          <Button variant="secondary" onClick={prevImage}>◀ Anterior</Button>
          <span style={{ fontSize: '0.85rem', color: '#6c757d' }}>{selectedIndex + 1} / {imagenesPorTipo.length}</span>
          <Button variant="secondary" onClick={nextImage}>Siguiente ▶</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default FileGallery;