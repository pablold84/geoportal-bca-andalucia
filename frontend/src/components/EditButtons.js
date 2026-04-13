import React, { useState } from 'react';
import { fetchWithAuth } from '../utils/fetchWithAuth';
import { Button } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config';

const EditButtons = ({ editing, setEditing, editedDetalle, estacionId, setEstacionDetalle, setAlertMessage }) => {
  const { canEdit } = useAuth();
  const [loading, setLoading] = useState(false);

  const showTempMessage = (message, duration = 3000) => {
    setAlertMessage(message);
    setTimeout(() => setAlertMessage(null), duration);
  };

  const saveChanges = async () => {
    setLoading(true);
    try {
      const payload = {
        estacion: editedDetalle.estacion,
        ubicacion: editedDetalle.ubicacion,
        datos_emplazamiento: editedDetalle.datos_emplazamiento,
        tipo_emplazamiento: editedDetalle.tipo_emplazamiento,
        datos_instalacion: editedDetalle.datos_instalacion,
        configuracion_equipo: editedDetalle.configuracion_equipo,
        alimentacion_estacion: editedDetalle.alimentacion_estacion
      };

      const res = await fetchWithAuth(`${API_BASE}/estaciones/${estacionId}/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        if (res.status === 403) throw new Error('No tienes permisos para editar');
        throw new Error('Error al guardar cambios');
      }

      setEstacionDetalle(editedDetalle);
      setEditing(false);
      showTempMessage({ text: 'Cambios guardados correctamente.', type: 'success' }, 3000);
    } catch (err) {
      showTempMessage({ text: err.message || 'Error al guardar cambios.', type: 'danger' }, 4000);
    } finally {
      setLoading(false);
    }
  };

  const cancelChanges = () => {
    setEditing(false);
    showTempMessage({ text: 'Edición cancelada.', type: 'warning' }, 2000);
  };

  return (
    <div style={{ marginTop: '10px', display: 'flex', gap: '0.5rem', justifyContent: 'space-between' }}>
      <Button
        className="btn-corporate-editar"
        size="sm"
        disabled={!canEdit() || editing || loading}
        onClick={() => setEditing(true)}
        title={!canEdit() ? "No tienes permisos para editar" : ""}
      >
        Editar
      </Button>
      <Button
        className="btn-corporate-guardar"
        size="sm"
        disabled={!editing || loading}
        onClick={saveChanges}
      >
        {loading ? 'Guardando…' : 'Guardar'}
      </Button>
      <Button
        className="btn-corporate-cancelar"
        size="sm"
        disabled={!editing || loading}
        onClick={cancelChanges}
      >
        Cancelar
      </Button>
    </div>
  );
};

export default EditButtons;