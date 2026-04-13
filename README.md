# Geoportal BCA Andalucía

Sistema de información geográfica (GIS) web para la gestión y visualización de la
Base Cartográfica Autonómica (BCA) de Andalucía, desarrollado para la Junta de
Andalucía (IECA) por Seresco Geoinformación.

## Visión General del Proyecto

El Geoportal BCA Andalucía es una plataforma de visualización y seguimiento cartográfico
que permite gestionar miles de capas vectoriales organizadas por grupos temáticos,
consultar el progreso de actualización de hojas cartográficas y monitorizar la actividad
del equipo técnico mediante dashboards de indicadores.

El desarrollo se ha realizado siguiendo principios de seguridad desde la fase de diseño,
con especial atención a los findings del pipeline de análisis estático de seguridad
ejecutado por el equipo de desarrollo de Seresco (Bearer SAST: TOTAL: 0 findings).

## Arquitectura Técnica

### Diseño

La arquitectura se basa en tres pilares:

**1. Separación de responsabilidades por capas**

| Capa | Responsabilidad | Ubicación |
|------|----------------|-----------|
| Presentación / API | Endpoints REST, validación de entrada | `backend/app/routes/` |
| Acceso a datos | Queries SQL, pool de conexiones | `backend/app/db.py` |
| Autenticación | JWT, cookies, política de contraseñas | `backend/app/security.py` |
| Logging y auditoría | Registro estructurado JSON | `backend/app/logger.py` |
| Lógica de negocio | Vistas PostgreSQL en esquema `registro` | BD cartográfica |

**2. Base de datos espacial dual**

PostgreSQL con PostGIS proporciona capacidades geoespaciales nativas. La rama BCA
Andalucía usa dos bases de datos independientes:

- `geoportal_config` (puerto 5436): usuarios, capas, proyectos, estilos
- `geoportal_andalucia_dev` / producción (puerto 5450): datos cartográficos BCA

**3. Autenticación por cookies httpOnly**

El token JWT se almacena en cookies `httpOnly` inaccesibles desde JavaScript,
eliminando el vector de ataque XSS que supone el uso de `localStorage`.

### Stack Tecnológico

**Backend**
- FastAPI (Python 3.12): framework asíncrono con validación automática de datos
- PostgreSQL 16 con PostGIS: base de datos relacional con capacidades espaciales
- psycopg2 + ThreadedConnectionPool: acceso a BD con pool de conexiones
- JWT + bcrypt 4.0.1: autenticación segura con tokens firmados y hash de contraseñas
- slowapi: rate limiting por IP en endpoints críticos
- Bearer: análisis estático SAST (resultado: TOTAL: 0 findings)

**Frontend**
- React 18: biblioteca para interfaces de usuario con hooks y componentes funcionales
- OpenLayers 9: librería cartográfica profesional compatible con estándares OGC
- Bootstrap 5: framework CSS responsive con sistema de componentes
- Recharts: librería de gráficos para dashboards de indicadores

**Infraestructura**
- Docker Compose: orquestación de contenedores (backend + 2x PostgreSQL/PostGIS)
- Servidores propios de Seresco
- PostgreSQL con PostGIS en servidores corporativos

## Instalación y Configuración

### Requisitos Previos

- Python 3.12 o superior
- Node.js 18 o superior
- PostgreSQL 16+ con extensión PostGIS
- Docker y Docker Compose
- Git para control de versiones

### Configuración del Backend

```bash
# Levantar el stack completo
docker compose -f docker-compose.andalucia.yml up -d

# El backend estará disponible en:
# http://localhost:8000
# Documentación Swagger: http://localhost:8000/api/docs
```

Variables de entorno requeridas en `backend/.env.andalucia`:

```bash
SECRET_KEY=<clave-generada-con-secrets.token_hex(32)>
DATABASE_URL=postgresql://postgres:password@postgis-andalucia:5432/geoportal_andalucia_dev
CONFIG_DATABASE_URL=postgresql://postgres:password@postgis-config:5432/geoportal_config
CORS_ORIGINS=http://localhost:3000
COOKIE_SECURE=false
COOKIE_SAMESITE=lax
```

### Configuración del Frontend

```bash
cd frontend
npm install
npm start
# Disponible en http://localhost:3000
```

## Arquitectura de Despliegue en Producción

```
Internet
    |
    v
[Firewall Corporativo]
    |
    v
[Apache Proxy Reverso] — Producción (172.19.30.201)
    |
    +---> Frontend (React SPA)
    |
    +---> Backend (FastAPI) -----> Puerto interno: 8000
          |
          +---> geoportal_config    (puerto 5436)
          |
          +---> geoportal_andalucia (puerto 5450)
```

**Variables de entorno en producción:**
```bash
SECRET_KEY=<clave-unica-produccion-min-32-chars>
CORS_ORIGINS=http://172.19.30.201:3000
COOKIE_SECURE=true
COOKIE_SAMESITE=strict
```

## Seguridad

La seguridad se ha tratado como requisito funcional desde el inicio, no como añadido
posterior. Todas las medidas han sido verificadas con análisis estático Bearer.

### Autenticación y Autorización

**JWT con cookies httpOnly**

El token JWT se almacena en cookies `httpOnly`, inaccesibles desde JavaScript.
El navegador las envía automáticamente en cada petición. El logout invalida la
cookie en el servidor. Ver `docs/SECURITY.md` para detalles completos.

**Control de acceso basado en roles (RBAC)**

Tres roles implementados: `admin`, `edicion`, `bca`.

**Gestión de contraseñas**

Política equivalente a Active Directory: mínimo 10 caracteres, sin fragmentos
del username, al menos 3 de 4 categorías (mayúsculas, minúsculas, dígitos, especiales).
Hash bcrypt 4.0.1 con factor de trabajo 12.

### Protección de API

**Rate limiting:** 5 intentos de login por minuto por IP (slowapi).

**CORS restrictivo:** orígenes permitidos desde variable de entorno `CORS_ORIGINS`.

**Security headers:** X-Content-Type-Options, X-Frame-Options, X-XSS-Protection,
Referrer-Policy, Permissions-Policy — inyectados en todas las respuestas.

**Prevención de inyección SQL:** validación de identificadores contra whitelists
estáticas, materialización de queries via `.as_string(conn)`. Bearer SAST: 0 findings.

**API Keys:** sistema complementario con prefijo `gp_`, hash bcrypt, rate limiting
configurable y registro de uso. Ver `docs/API_KEYS_GUIDE.md`.

### Checklist Pre-Producción

- [ ] `SECRET_KEY` generada aleatoriamente (mínimo 32 caracteres hex)
- [ ] `CORS_ORIGINS` apunta a dominio de producción
- [ ] `COOKIE_SECURE=true` y `COOKIE_SAMESITE=strict`
- [ ] Rate limiting verificado con 6 intentos de login erróneos
- [ ] `bearer scan` ejecutado — resultado `TOTAL: 0`
- [ ] Suite pytest — `28 passed`
- [ ] Backups automáticos configurados (CRON)

## Tests

Suite completa de tests unitarios e integración:

```bash
cd backend
source venv/bin/activate
pytest tests/ -v --tb=short
# 28 passed
```

| Suite | Tests | Cobertura |
|-------|-------|-----------|
| `test_security.py` | 12 | Política de contraseñas, creación de tokens JWT |
| `test_api.py` | 16 | Auth, dashboards BCA, progreso, admin, proyectos |

CI/CD: workflow en `.github/workflows/tests.yml` ejecuta los tests unitarios
en cada push a `develop-andalucia` y `main-andalucia`.

## Verificación de Seguridad Pre-Entrega

```bash
/home/pablold/visor-gis/scripts/verificacion_seguridad.sh
```

Cubre: Bearer SAST, pytest, búsqueda de prints/console/emojis en código fuente.

## Funcionalidades Implementadas

### Visualización Cartográfica BCA

- Visor de capas vectoriales organizadas por grupos temáticos (más de 2750 hojas)
- Activación/desactivación de capas con control de opacidad
- Filtrado de features por atributos con múltiples operadores
- Tooltip corporativo con colores Seresco/IECA al pasar sobre features
- Zoom automático a la extensión de cada capa
- Capas base: OSM, PNOA, Catastro, WMS corporativo

### Sistema de Estilos

- Creación y edición de estilos visuales por capa (punto, línea, polígono)
- Previsualización en tiempo real del estilo antes de guardar
- Aplicación inmediata del estilo activo en el mapa via LayerService

### Dashboards de Indicadores BCA

- **Dashboard Actuaciones:** seguimiento de cambios por técnico, fenómeno y hoja
- **Dashboard Progreso:** estado de las 2750 hojas cartográficas con mapa de calor
- **Dashboard Admin:** productividad del equipo (solo rol admin)
- Acceso diferenciado por rol — admin ve todos los dashboards, bca ve solo progreso

### Autenticación y Control de Acceso

- Login con cookie httpOnly, logout con invalidación en servidor
- Cambio de contraseña obligatorio en primer acceso
- Redirección automática al login por expiración de token
- Timer proactivo que cierra sesión exactamente al expirar el JWT

### Herramientas Cartográficas

- Medición de distancias y áreas sobre el mapa
- Exportación de mediciones en GeoJSON, WKT y KML
- Gestión de API keys para acceso programático

## Estructura del Proyecto

```
visor-gis/
├── backend/
│   ├── app/
│   │   ├── routes/              # Endpoints organizados por recurso
│   │   │   ├── admin.py         # Gestión de usuarios y API keys
│   │   │   ├── bca.py           # Dashboard actuaciones BCA
│   │   │   ├── dashboard.py     # Dashboard progreso hojas
│   │   │   ├── dashboard_admin.py # Dashboard admin equipo
│   │   │   ├── layers.py        # Capas cartográficas
│   │   │   ├── projects.py      # Proyectos
│   │   │   └── styles.py        # Estilos de capas
│   │   ├── schemas/             # Modelos Pydantic
│   │   ├── db.py                # Pool de conexiones y queries
│   │   ├── security.py          # Autenticación y autorización
│   │   ├── api_key_utils.py     # Gestión de API keys
│   │   ├── api_key_middleware.py # Middleware API keys
│   │   ├── logger.py            # Logging estructurado JSON
│   │   └── main.py              # Punto de entrada FastAPI
│   ├── tests/
│   │   ├── conftest.py          # Fixtures pytest
│   │   ├── test_security.py     # Tests unitarios seguridad
│   │   └── test_api.py          # Tests integración API
│   ├── scripts/
│   │   └── verificacion_seguridad.sh  # Script verificación pre-entrega
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/          # Componentes React
│   │   │   ├── MapView.jsx      # Visor cartográfico principal
│   │   │   ├── LeftPanel.js     # Panel de navegación
│   │   │   ├── RightPanel.js    # Panel de detalle
│   │   │   ├── DashboardBCA.jsx # Dashboard actuaciones
│   │   │   ├── DashboardActuaciones.jsx
│   │   │   └── DashboardAdmin.jsx
│   │   ├── hooks/               # Hooks personalizados
│   │   ├── context/             # Context API (Auth, Project)
│   │   ├── services/            # LayerService (OpenLayers)
│   │   ├── utils/               # fetchWithAuth y utilidades
│   │   └── styles/              # CSS corporativo
│   └── package.json
├── docs/
│   ├── SECURITY.md              # Documentación de seguridad
│   ├── API_KEYS_GUIDE.md        # Gestión de API keys
│   ├── DEVELOPMENT.md           # Guía de desarrollo y pruebas
│   └── security/
│       └── SECURITY_FIXES.md    # Registro de correcciones de seguridad
├── scripts/
│   └── verificacion_seguridad.sh
├── docker-compose.andalucia.yml
└── README.md
```

## Metodología de Desarrollo

El proyecto se ha desarrollado siguiendo principios de seguridad por diseño:

- **Análisis estático continuo:** Bearer SAST en cada entrega
- **Tests automatizados:** 28 tests unitarios e integración con pytest
- **Revisión de seguridad:** respuesta completa al informe DefectDojo (35 findings cerrados)
- **Control de versiones:** rama `develop-andalucia` para desarrollo BCA,
  separada del proyecto Telefónica del que deriva la base de código

## Documentación Adicional

- `docs/SECURITY.md`: documentación detallada de seguridad
- `docs/API_KEYS_GUIDE.md`: gestión de claves de API
- `docs/DEVELOPMENT.md`: guía de navegación y pruebas
- `docs/security/SECURITY_FIXES.md`: registro completo de correcciones

## Equipo y Contacto

Proyecto desarrollado por el equipo de CyC de Seresco Geoinformación.

Para consultas técnicas, contactar con Pablo López (CyC).

---

**Última actualización:** 13 de abril de 2026
**Versión:** 1.1
**Responsable:** Seresco Geoinformación (CyC)

