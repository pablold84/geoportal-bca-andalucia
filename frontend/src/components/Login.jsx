import { useState } from "react";
import { useNavigate } from "react-router-dom";
import 'bootstrap/dist/css/bootstrap.min.css';
import '../styles/custom-bootstrap.css';
import logoHeader from '../styles/seresco_logo.svg';
import logoFooter from '../styles/logo.png';
import { API_BASE } from '../config';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });
      if (response.ok) {
        const data = await response.json();
        onLogin(data.access_token);
        navigate("/");
      } else {
        setError("Usuario o contraseña incorrectos");
      }
    } catch {
      setError("Error de conexión. Inténtalo de nuevo.");
    }
  };

  return (
    <div className="d-flex flex-column" style={{ minHeight: "100vh" }}>
      <div style={{ backgroundColor: "#ffffff", padding: "0.5rem 1rem", display: "flex", alignItems: "center", boxShadow: "0 2px 4px rgba(0,0,0,0.1)", zIndex: 1000 }}>
        <img src={logoHeader} alt="Logo" style={{ height: "40px" }} />
      </div>

      <div className="container d-flex justify-content-center align-items-center flex-grow-1">
        <div className="card shadow-lg p-4" style={{ width: "100%", maxWidth: "400px" }}>
          <h2 className="text-center mb-4" style={{ color: 'var(--bs-primary)' }}>Iniciar sesión</h2>

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="username" className="form-label">Usuario</label>
              <input
                type="text"
                id="username"
                className="form-control"
                placeholder="Introduce tu usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="mb-3">
              <label htmlFor="password" className="form-label">Contraseña</label>
              <input
                type="password"
                id="password"
                className="form-control"
                placeholder="Introduce tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="alert alert-danger py-2" role="alert">
                {error}
              </div>
            )}

            <button type="submit" className="btn btn-corporate-editar w-100">
              Entrar
            </button>
          </form>
        </div>
      </div>

      <div style={{ backgroundColor: "#f8f9fa", padding: "0.5rem 1rem", display: "flex", justifyContent: "center", alignItems: "center", borderTop: "1px solid #dee2e6" }}>
        <img src={logoFooter} alt="Seresco" style={{ height: "30px" }} />
      </div>
    </div>
  );
}