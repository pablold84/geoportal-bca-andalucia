import { useState } from "react";
import axios from "axios";
import { API_BASE } from '../config';

export default function useEstacionEditing(estacionData, estacionId) {
  const [data, setData] = useState(estacionData);
  const [editing, setEditing] = useState(false);

  const startEditing  = () => setEditing(true);
  const cancelEditing = () => { setData(estacionData); setEditing(false); };

  const handleChange = (section, field, value) => {
    setData(prev => ({
      ...prev,
      [section]: { ...prev[section], [field]: value }
    }));
  };

  const saveChanges = async () => {
    try {
      await axios.put(`${API_BASE}/estaciones/${estacionId}/update`, data, {
        withCredentials: true
      });
      setEditing(false);
    } catch {
      throw new Error('Error al guardar los cambios');
    }
  };

  return { data, editing, startEditing, cancelEditing, handleChange, saveChanges };
}