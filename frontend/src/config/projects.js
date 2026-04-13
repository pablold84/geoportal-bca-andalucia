/**
 * Configuración de proyectos del geoportal
 * Define las características y comportamiento de cada proyecto
 */

export const PROJECT_CONFIGS = {
  telefonica: {
    code: 'telefonica',
    name: 'Geoportal Telefónica',
    version: '1.0',
    features: {
      antennas: true,           // Gestión de antenas (crear/eliminar)
      coverage: true,           // Cálculo de cobertura
      antennaSearch: true,      // Búsqueda de antenas
      measurements: true,       // Herramientas de medición
      dashboard: true           // Dashboard de indicadores
    },
    dataSchema: 'estaciones',   // Esquema PostgreSQL específico
    logo: {
      header: '/logos/telefonica_header.svg',
      footer: '/logos/telefonica_footer.png'
    }
  },
  
  andalucia: {
    code: 'andalucia',
    name: 'Geoportal BCA Andalucía',
    version: '1.0',
    features: {
      antennas: false,          // NO tiene antenas
      coverage: false,          // NO calcula cobertura
      antennaSearch: false,     // NO busca antenas
      measurements: true,       // SÍ tiene mediciones
      dashboard: true           // Dashboard de indicadores BCA
    },
    dataSchema: 'bca_edicion',  // Esquema PostgreSQL específico
    logo: {
      header: '/logos/andalucia_header.svg',
      footer: '/logos/andalucia_footer.png'
    }
  }
};

/**
 * Obtiene la configuración del proyecto actual
 * @param {string} projectCode - Código del proyecto
 * @returns {Object} Configuración del proyecto
 */
export const getProjectConfig = (projectCode) => {
  return PROJECT_CONFIGS[projectCode] || PROJECT_CONFIGS.telefonica;
};