import { useState } from "react";
import { fetchWithAuth } from '../utils/fetchWithAuth';
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import 'bootstrap/dist/css/bootstrap.min.css';
import '../styles/custom-bootstrap.css';
import logoHeader from '../styles/seresco_logo.svg';
import logoFooter from '../styles/logo.png';
import { API_BASE } from '../config';

export default function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();
  const { updateToken } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword.length < 8) {
      setError("La nueva contraseña debe tener al menos 8 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }
    if (newPassword === currentPassword) {
      setError("La nueva contraseña debe ser diferente a la actual");
      return;
    }

    try {
      const response = await fetchWithAuth(`${API_BASE}/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        if (data.access_token) {
          updateToken(data.access_token);
        }
        setSuccess("Contraseña actualizada exitosamente. Redirigiendo...");
        setTimeout(() => navigate("/"), 2000);
      } else {
        setError(data.detail || "Error al cambiar la contraseña");
      }
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    }
  };

  return (
    <div className="d-flex flex-column" style={{ minHeight: "100vh" }}>
      <div style={{
        backgroundColor: "#ffffff",
        padding: "0.5rem 1rem",
        display: "flex",
        alignItems: "center",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        zIndex: 1000
      }}>
        <img src={logoHeader} alt="Logo" style={{ height: "40px" }} />
      </div>

      <div className="container d-flex justify-content-center align-items-center flex-grow-1">
        <div className="card shadow-lg p-4" style={{ width: "100%", maxWidth: "500px" }}>
          <h2 className="text-center mb-3" style={{ color: 'var(--bs-primary)' }}>
            Cambiar Contraseña
          </h2>

          <div className="alert alert-warning mb-4" role="alert">
            <strong>Atención:</strong> Debes cambiar tu contraseña antes de continuar.
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="currentPassword" className="form-label">Contraseña Actual</label>
              <input
                type="password"
                id="currentPassword"
                className="form-control"
                placeholder="Introduce tu contraseña actual"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>

            <div className="mb-3">
              <label htmlFor="newPassword" className="form-label">Nueva Contraseña</label>
              <input
                type="password"
                id="newPassword"
                className="form-control"
                placeholder="Mínimo 8 caracteres"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <small className="form-text text-muted">Mínimo 8 caracteres</small>
            </div>

            <div className="mb-3">
              <label htmlFor="confirmPassword" className="form-label">Confirmar Nueva Contraseña</label>
              <input
                type="password"
                id="confirmPassword"
                className="form-control"
                placeholder="Repite la nueva contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <div className="d-flex justify-content-between">
              <button type="submit" className="btn btn-corporate-editar w-100">
                Cambiar Contraseña
              </button>
            </div>

            {error && (
              <div className="alert alert-danger mt-3" role="alert">{error}</div>
            )}
            {success && (
              <div className="alert alert-success mt-3" role="alert">{success}</div>
            )}
          </form>
        </div>
      </div>

      <div style={{
        backgroundColor: "#ffffff",
        padding: "0.25rem 1rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: "0 -2px 4px rgba(0,0,0,0.1)",
        fontSize: "0.8rem"
      }}>
        <img src={logoFooter} alt="Logo" style={{ height: "30px" }} />
        <span style={{ color: "var(--bs-primary)", fontWeight: "500" }}>
          Geoportal - v1.0
        </span>
      </div>
    </div>
  );
}