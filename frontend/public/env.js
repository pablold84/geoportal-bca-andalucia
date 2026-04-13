window._env_ = {
  REACT_APP_API_URL: (() => {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const port = window.location.port;
    
    // Si estamos en desarrollo local (puerto 3000)
    if (port === '3000') {
      return `${protocol}//${hostname}:8000/api`;
    }
    
    // Si estamos en producción (sin puerto o puerto 443/80)
    return `${protocol}//${hostname}/api`;
  })()
};