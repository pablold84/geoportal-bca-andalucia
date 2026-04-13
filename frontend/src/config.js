const getApiUrl = () => {
  if (window._env_?.REACT_APP_API_URL) {
    return window._env_.REACT_APP_API_URL;
  }
  
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  
  // Desarrollo local
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '172.19.30.220') {
    return `http://${hostname}:8000/api`;
  }
  
  // Producción
  return `${protocol}//${hostname}/api`;
};

export const API_BASE = getApiUrl();