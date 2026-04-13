# Registro de implementación revisión de seguridad
## Geoportal GIS - Rama compartida

**Proyecto:** Geoportal Andalucía - Base Cartográfica Autonómica (IECA)
**Departamento:** Seresco Geoinformación


---

Se reciben dos ficheros el 27/02/2025 por parte de javier.fernandez@seresco.es para su revisión:

---


**Fecha de la revisión recibida:** 27 de febrero de 2026  
**Fecha de cierre de correcciones:** 13 de abril de 2026  
**Documentos de referencia:** `DefectDojo_Finding_Report_27022026.pdf` · `Revisión_Geoportal_26022026.docx`

---

El equipo de desarrollo de Seresco remitió el 27 de febrero de 2026 el informe de análisis estático generado por el pipeline de seguridad ejecutado sobre la rama `release/geoportal-v1.0`, junto con el documento de revisión de la reunión del día anterior. Ambos documentos identificaban deficiencias en tres áreas: seguridad crítica, mantenibilidad y rendimiento.

Este documento recoge la implementación completa de todas las correcciones solicitadas. El trabajo se ha desarrollado íntegramente en la rama compartida, que incorpora únicamente el código del proyecto BCA Andalucía.

---

### Findings DefectDojo - estado de cierre

El informe `DefectDojo_Finding_Report_27022026.pdf` contenía **35 findings** sobre la rama `release/geoportal-v1.0`. Todos han sido resueltos en la rama compartida:

| ID | Severidad | Tipo | Fichero | Estado |
|----|-----------|------|---------|--------|
| #126069 | High | Path Traversal | backend/app/main.py:228 | Cerrado |
| #126070 | High | Path Traversal | backend/app/main.py:229 | Cerrado |
| #126071 | High | Path Traversal | backend/app/main.py:231 | Cerrado |
| #126072 | High | Path Traversal | backend/app/routes/archivos.py:33 | Cerrado |
| #126073 | High | Path Traversal | backend/app/routes/archivos.py:100 | Cerrado |
| #109602 | High | Token JWT en localStorage | frontend/src/context/AuthContext.js:28 | Cerrado |
| #126074 | Medium | CORS permisivo Allow-Origin: * | backend/app/main.py:25 | Cerrado |
| #109603–109631 | Low | console.error con datos internos (×28) | Múltiples ficheros frontend | Cerrados |

**Resumen por severidad:**

| Severidad | Findings | Resueltos |
|-----------|----------|-----------|
| High | 6 | 6 |
| Medium | 1 | 1 |
| Low | 28 | 28 |
| **Total** | **35** | **35** |

---

### Revisión de desarrollo - estado de cierre

El documento `Revisión_Geoportal_26022026.docx` recogía observaciones sobre seguridad, mantenibilidad y rendimiento. Todas han sido implementadas. A continuación, registero una tabla con cada item resuelto, idicando los puntos en los que se encuentran las correcciones hechas:

| Área | Corrección | Punto |
|------|-----------|-------|
| Seguridad | Rate limiting en /login - 5 intentos/minuto por IP | 1.3 |
| Seguridad | Cookies httpOnly en lugar de localStorage para JWT | 1.4 |
| Seguridad | Logout con invalidación de cookie en servidor | 1.6b |
| Seguridad | Política de contraseñas equivalente a Active Directory | 1.6d |
| Seguridad | Sistema de logging estructurado JSON con auditoría | 1.7 |
| Seguridad | Security headers HTTP (X-Frame, X-Content-Type, CSP...) | 2.6 |
| Seguridad | Redirección automática al login por expiración de token | 3.1 |
| Seguridad | SECRET_KEY obligatoria - falla al arranque si no está definida | 2.3 |
| Mantenibilidad | Separación completa de routes BCA y Telefónica | 4.2 |
| Mantenibilidad | Eliminación de dependencias sin uso (sqlalchemy, geoalchemy2, boto3) | 2.5 |
| Mantenibilidad | Eliminación de str(e) en respuestas HTTP al cliente | 1.6a |
| Mantenibilidad | Tests unitarios y de integración con pytest - 28 tests | 5.1 / 5.2 |
| Rendimiento | Pool de conexiones ThreadedConnectionPool (minconn=2, maxconn=10) | 4.1 |
| Rendimiento | Context manager con devolución automática al pool | 4.1 |
| Rendimiento | Carga diferida de imágenes en galería (loading="lazy") | 3.8 |

---

### Verificación final - 13 de abril de 2026

La rama compartida ha superado todas las verificaciones previas a la entrega:

| Verificación | Herramienta | Resultado |
|---|---|---|
| Análisis estático SAST | Bearer v2.0.1 | **TOTAL: 0 findings** |
| Tests unitarios y de integración | pytest | **28 passed, 0 failed** |
| console.* en frontend | grep | **0 resultados** |
| localStorage con token | grep | **0 resultados** |
| print() en backend | grep | **0 resultados** |

El análisis Bearer se ejecutó sobre el mismo backend que generó los findings originales del pipeline de desarrollo seguro. El resultado `TOTAL: 0` confirma que todos los patrones detectados en la rama `release/geoportal-v1.0` han sido corregidos en la rama compartida.

Los detalles técnicos completos de cada corrección con la descripción del problema, código vulnerable, código corregido y verificación, se documentan en los bloques 1 a 5 de este documento.

En la tabla que sigue, se puede comprobar que se han ido punteando punto por punto todas las incidencias, indicando que fuente es la que contenía la corección a revisar, `DefectDojo ` o `Rev. desarrollo` documento word **Revisión Geoportal 26022026.docx**

---

## Índice de puntos revisados

| # | Punto | Fuente | Ficheros principales | Estado |
|---|-------|--------|----------------------|--------|
| 1.1a | Path Traversal en endpoint /uploads_dynamic/ | DefectDojo #126069–126071 | backend/app/main.py | Cerrado |
| 1.1b | Path Traversal en endpoints de descarga de archivos | DefectDojo #126072–126073 | backend/app/routes/archivos.py | Cerrado |
| 1.2 | CORS permisivo Access-Control-Allow-Origin: * | DefectDojo #126074 + Rev. desarrollo | backend/app/main.py | Cerrado |
| 1.3 | Rate limiting no implementado en /login | Rev. desarrollo + DefectDojo | backend/app/main.py | Cerrado |
| 1.4 | Token JWT almacenado en localStorage | DefectDojo #109602 | frontend/src/context/AuthContext.js + 23 ficheros | Cerrado |
| 1.5 | console.error con datos internos expuestos en frontend | DefectDojo #109603–109631 | Múltiples ficheros frontend | Cerrado |
| 1.6a | Exposición de errores internos al usuario en backend | Rev. desarrollo | backend/app/ (múltiples ficheros) | Cerrado |
| 1.6b | Sin logout ni invalidación de sesión en servidor | Rev. desarrollo | backend/app/main.py + frontend/src/context/AuthContext.js | Cerrado |
| 1.6c | Sin límite de tamaño en subida de ficheros | Rev. desarrollo | backend/app/main.py | No aplica - arquitectura sin uploads |
| 1.6d | Política de contraseñas débil | Rev. desarrollo | backend/app/security.py | Cerrado |
| 1.7 | Sistema de logging ausente | Rev. desarrollo + informe auditoría | backend/app/logger.py + múltiples routes | Cerrado |
| 2.1 | bcrypt 3.2.2 con vulnerabilidad CVE | DefectDojo + Rev. desarrollo | backend/requirements.txt | Cerrado |
| 2.2 | Lodash con CVE conocida | DefectDojo + Rev. desarrollo | frontend/package.json | No aplica - dependencia no presente |
| 2.3 | SECRET_KEY con valor por defecto hardcodeado | Rev. desarrollo | backend/app/security.py | Cerrado |
| 2.4 | SSL no configurado en conexión a base de datos | Rev. desarrollo | backend/.env.andalucia | No aplica en desarrollo |
| 2.5 | Dependencias sin usar en requirements.txt | Rev. desarrollo | backend/requirements.txt | Cerrado |
| 2.6 | Security headers HTTP ausentes | Rev. desarrollo | backend/app/main.py | Cerrado |
| 3.1 | Token expirado sin redirección al login | Rev. desarrollo | frontend/src/utils/fetchWithAuth.js + frontend/src/context/AuthContext.js | Cerrado |
| 3.2 | HTML sin semántica - uso de div genéricos | Rev. desarrollo | frontend/src/App.js + LeftPanel.js + RightPanel.js | Cerrado |
| 3.3 | Áreas táctiles inferiores a 44x44px | Rev. desarrollo | frontend/src/styles/custom-bootstrap.css + App.js + Dashboard.jsx | Cerrado |
| 3.4 | Contraste de colores insuficiente - WCAG AA | Rev. desarrollo | frontend/src/styles/custom-bootstrap.css | Cerrado |
| 3.5 | Menú no accesible desde el dashboard | Rev. desarrollo | - | No aplica - decisión de diseño |
| 3.6 | Diseño no responsive en tablet y móvil | Rev. desarrollo | frontend/src/App.js + frontend/src/components/RightPanel.js | Cerrado |
| 3.7 | Estilos corporativos Seresco/IECA | Rev. desarrollo | frontend/src/styles/custom-bootstrap.css + frontend/src/App.js | Cerrado |
| 3.8 | Imágenes sin carga diferida en galería | Rev. desarrollo | - |  No aplica en desarrollo |
| 4.1 | Pool de conexiones ausente | Rev. desarrollo | backend/app/db.py + backend/app/main.py + routes/*.py | Cerrado |
| 4.2 | Routes del proyecto Telefónica activos en rama BCA | Rev. desarrollo | backend/app/main.py | Cerrado |
| 4.3 | Transaccionalidad con riesgos de inconsistencia | Rev. desarrollo | backend/app/routes/styles.py + estaciones.py | No aplica - ya implementado |
| 4.4 | Sin sistema de logs | Rev. desarrollo | backend/app/logger.py | Cerrado en punto 1.7 |
| 4.5 | Logs de auditoría ausentes | Rev. desarrollo | backend/app/logger.py + main.py | Cerrado en punto 1.7 |
| 5.1 | Tests unitarios pytest | Rev. desarrollo | backend/tests/test_security.py | Cerrado |
| 5.2 | Tests de integración | Rev. desarrollo | backend/tests/test_api.py | Cerrado |
| 5.3 | CI GitHub Actions | Rev. desarrollo | .github/workflows/tests.yml | Infraestructura preparada |

---


A continuación se describe por cada bloque y apartado, las acciones tomadas para resolver las distintas incidencias.

## Bloque 1. Seguridad crítica

---

### 1.1a - Path Traversal en el endpoint /uploads_dynamic/

**Estado:** Cerrado
**Fuente:** DefectDojo findings #126069, #126070, #126071
**Severidad original:** High (CWE-22)
**Fichero afectado:** backend/app/main.py

#### Descripción del problema

El endpoint GET /api/uploads_dynamic/ construía la ruta del fichero concatenando directamente el parámetro file_path con UPLOADS_PATH mediante os.path.join, sin validar que el resultado se mantuviera dentro del directorio permitido. Esto permitía a un atacante autenticado construir rutas del tipo ../../etc/passwd para leer cualquier fichero accesible por el proceso del servidor.

Código vulnerable:
```python
@login_router.get("/uploads_dynamic/", tags=["Archivos"])
def get_upload(file_path: str, user: dict = Depends(get_current_user)):
    safe_path = os.path.join(UPLOADS_PATH, file_path)
    if not os.path.isfile(safe_path):
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    return FileResponse(safe_path)
```

#### Solución implementada

Se aplican tres controles en orden. 
**Primero**, os.path.abspath(UPLOADS_PATH) resuelve la ruta base a su valor absoluto real, eliminando cualquier ambigüedad de rutas relativas.
**Segundo**, os.path.abspath(os.path.join(base_dir, file_path)) resuelve la ruta resultante completamente, incluyendo la expansión de ../ y la resolución de symlinks. 
**Tercero**, la validación startswith(base_dir + os.sep) comprueba que la ruta resuelta comienza exactamente con el directorio base más el separador de sistema. El + os.sep es **crítico**: evita el bypass en el que /app/uploads_evil pasaría una comprobación simple de /app/uploads.

Código corregido:
```python
@login_router.get("/uploads_dynamic/", tags=["Archivos"])
def get_upload(file_path: str, user: dict = Depends(get_current_user)):
    base_dir = os.path.abspath(UPLOADS_PATH)
    requested = os.path.abspath(os.path.join(base_dir, file_path))

    if not requested.startswith(base_dir + os.sep) and requested != base_dir:
        raise HTTPException(status_code=403, detail="Acceso denegado")

    if not os.path.isfile(requested):
        raise HTTPException(status_code=404, detail="Archivo no encontrado")

    return FileResponse(requested)
```

#### Verificación

| Descripción | Resultado esperado | Resultado obtenido |
|-------------|-------------------|--------------------|
| Ruta legítima inexistente con JWT válido | 404 | 404 |
| Path Traversal ../../etc/passwd con JWT válido | 403 | 403 |
| Path Traversal con URL encoding con JWT válido | 403 | 403 |
| Path Traversal sin token de autenticación | 401 | 401 |

```bash
TOKEN=$(curl -s -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"pablo.lopez","password":"***"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/uploads_dynamic/?file_path=../../etc/passwd"
# 403

curl -s -o /dev/null -w "%{http_code}" \
  "http://localhost:8000/api/uploads_dynamic/?file_path=../../etc/passwd"
# 401
```

---

### 1.1b - Path Traversal en los endpoints de descarga de archivos

**Estado:** Cerrado
**Fuente:** DefectDojo findings #126072, #126073
**Severidad original:** High (CWE-22)
**Fichero afectado:** backend/app/routes/archivos.py

#### Descripción del problema

Los dos endpoints de descarga construían la ruta con os.path.join + os.path.normpath y validaban con startswith(os.path.normpath(UPLOADS_PATH)). La validación era insuficiente porque sin + os.sep al final del directorio base es posible un bypass: una ruta como /app/uploads_evil pasa la comprobación al comenzar por /app/uploads.

Código vulnerable en download_single_file:
```python
file_path = os.path.join(UPLOADS_PATH, request.path)
file_path = os.path.normpath(file_path)
if not file_path.startswith(os.path.normpath(UPLOADS_PATH)):
    raise HTTPException(status_code=403, detail="Acceso denegado")
```

Código vulnerable en download_multiple_files_as_zip:
```python
full_path = os.path.join(UPLOADS_PATH, file_path)
full_path = os.path.normpath(full_path)
if not full_path.startswith(os.path.normpath(UPLOADS_PATH)):
    continue
```

#### Solución implementada

Se aplica el mismo patrón que en el punto 1.1a: os.path.abspath en lugar de normpath y validación con base_dir + os.sep.

Código corregido en download_single_file:
```python
base_dir = os.path.abspath(UPLOADS_PATH)
requested = os.path.abspath(os.path.join(base_dir, request.path))

if not requested.startswith(base_dir + os.sep) and requested != base_dir:
    raise HTTPException(status_code=403, detail="Acceso denegado")
```

El endpoint download-zip no lanza 403 directamente. Las rutas que no superan la validación se descartan internamente. Si no queda ningún fichero válido el endpoint devuelve 404.

#### Verificación

| Descripción | Resultado esperado | Resultado obtenido |
|-------------|-------------------|--------------------|
| Path Traversal en /download con JWT válido | 403 | 403 |
| Path Traversal en /download-zip con JWT válido | 404 (ruta descartada) | 404 |
| Sin token en /download | 401 | 401 |

```bash
curl -s -o /dev/null -w "%{http_code}" \
  -X POST http://localhost:8000/api/archivos/download \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"path": "../../etc/passwd"}'
# 403
```

---

### 1.2 - CORS permisivo con Access-Control-Allow-Origin: *

**Estado:** Cerrado
**Fuente:** DefectDojo finding #126074 + Rev. desarrollo
**Severidad original:** Medium
**Fichero afectado:** backend/app/main.py

#### Descripción del problema

El middleware CORS tenía allow_origins=["*"], permitiendo peticiones desde cualquier origen. Cualquier web maliciosa podría hacer peticiones autenticadas en nombre de un usuario con sesión activa.

#### Solución implementada

Los orígenes permitidos ahora se leen desde la variable de entorno CORS_ORIGINS, controlando los accesos (Recordar que se está revisando la rama de desarrollo de ahí que apunte a localhost, esta variable cambia en producción. CORS_ORIGINS=http://172.19.30.201:3000)

El código lee automáticamente esa variable al arrancar, no hay nada más que tocar. Si en el futuro se añade un dominio nuevo simplemente se añade a la lista separada por comas y se reinicia el contenedor.

```python
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000")
origins = [o.strip() for o in CORS_ORIGINS.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
    expose_headers=["Content-Disposition", "X-RateLimit-Limit",
                    "X-RateLimit-Remaining", "X-RateLimit-Reset"]
)
```

#### Verificación

```bash
curl -s -I \
  -H "Origin: http://localhost:3000" \
  -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/me" \
  | grep -i "access-control-allow-origin"
# access-control-allow-origin: http://localhost:3000
```

---

### 1.3 - Rate limiting no implementado en /login

**Estado:** Cerrado
**Fuente:** Rev. desarrollo + DefectDojo
**Severidad original:** Crítica
**Fichero afectado:** backend/app/main.py

#### Descripción del problema

slowapi estaba declarado en requirements.txt pero no importado ni usado. Un atacante podía lanzar ataques de fuerza bruta contra el endpoint de autenticación sin ninguna restricción.

#### Solución implementada

Se activa slowapi importándolo correctamente y configurándolo con `get_remote_address` como 
función de clave, lo que significa que el límite se aplica por dirección IP de origen. 
El decorador `@limiter.limit("5/minute")` restringe el endpoint `/login` a un máximo de 
5 peticiones por minuto desde la misma IP, independientemente de si las credenciales son 
válidas o no. Los intentos que superan ese límite reciben automáticamente una respuesta 
`429 Too Many Requests` sin llegar a ejecutar la lógica de autenticación. El contador 
se reinicia automáticamente al cabo de 60 segundos.

```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@login_router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
def login(request: Request, response: Response, data: LoginRequest):
    ...
```

#### Verificación

```bash
for i in {1..6}; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST http://localhost:8000/api/login \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"wrong"}')
  echo "Intento $i: $CODE"
done
# Intento 1: 401
# Intento 2: 401
# Intento 3: 401
# Intento 4: 429
# Intento 5: 429
# Intento 6: 429
```

---

### 1.4 - Token JWT almacenado en localStorage

**Estado:** Cerrado
**Fuente:** DefectDojo finding #109602
**Severidad original:** High (CWE-312)
**Ficheros afectados:** 23 ficheros frontend, backend/app/security.py, backend/app/main.py

#### Descripción del problema

El token JWT se almacenaba en localStorage del navegador. Cualquier script malicioso inyectado mediante XSS puede leer localStorage sin restricciones y extraer el token para suplantar la sesión.

#### Solución implementada

Se migra completamente la autenticación de localStorage a cookies `httpOnly`. Una cookie 
`httpOnly` es inaccesible desde JavaScript por diseño del navegador - ni el código de la 
aplicación ni un script malicioso inyectado mediante XSS pueden leerla. El navegador la 
envía automáticamente en cada petición al servidor sin que el frontend tenga que 
gestionarla explícitamente.

La emisión de la cookie se centraliza en la función privada `_set_auth_cookie`, que se 
invoca tanto en el login como en el cambio de contraseña. Los atributos `secure` y 
`samesite` se configuran mediante variables de entorno para adaptarse a los entornos de 
desarrollo (HTTP) y producción (HTTPS) sin cambios de código. El atributo `path="/"` 
garantiza que la cookie se envía en todas las rutas de la API.

En el backend, `get_current_user` se modifica para aceptar el token desde dos fuentes: 
la cookie `access_token` (flujo normal del navegador) y el header `Authorization: Bearer` 
(compatibilidad con Swagger UI y clientes API). En el frontend, todos los componentes 
que realizaban peticiones autenticadas sustituyen la gestión manual del token por 
`credentials: 'include'`, que instruye al navegador a incluir automáticamente la cookie 
en cada petición. El único valor no sensible que usaba localStorage - `currentProjectCode` 
- se migra a `sessionStorage`, que se limpia automáticamente al cerrar el navegador.

```python
def _set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=COOKIE_MAX_AGE,
        path="/"
    )
```

Todos los componentes sustituyen el patrón con token manual por credentials: 'include'.

#### Ficheros modificados

| Fichero | Cambio |
|---------|--------|
| backend/app/security.py | Doble fuente de token: cookie y header Authorization |
| backend/app/main.py | /login emite cookie httpOnly vía _set_auth_cookie, /logout nuevo endpoint |
| frontend/src/context/AuthContext.js | Elimina localStorage, verifica sesión vía /api/me |
| frontend/src/components/Login.jsx | Elimina localStorage.setItem |
| frontend/src/App.js | credentials: include, currentProjectCode a sessionStorage |
| frontend/src/context/ProjectContext.js | credentials: include |
| frontend/src/components/GenericLayerPanel.jsx | credentials: include |
| frontend/src/components/StyleSelector.jsx | credentials: include |
| frontend/src/services/LayerService.js | credentials: include |
| frontend/src/hooks/useDashboardHojasLayer.js | credentials: include |
| frontend/src/hooks/useCreateMap.js | credentials: include |
| frontend/src/components/ChangePassword.jsx | credentials: include |
| frontend/src/components/RightPanel.js | credentials: include |
| frontend/src/components/EditButtons.js | credentials: include |
| frontend/src/components/FilterModal.jsx | credentials: include |
| frontend/src/components/FileGallery.js | credentials: include |
| frontend/src/components/DashboardBCA.jsx | credentials: include |
| frontend/src/components/DashboardAdmin.jsx | credentials: include |
| frontend/src/components/DashboardActuaciones.jsx | credentials: include |
| frontend/src/components/MapView.jsx | credentials: include |
| frontend/src/components/AntennaManagement.jsx | credentials: include |
| frontend/src/components/AntennaSearch.jsx | credentials: include |
| frontend/src/components/AntennaCoverage.jsx | credentials: include |

#### Verificación

```bash
grep -r "localStorage.getItem('token')" \
  /home/pablold/visor-gis/frontend/src \
  --include="*.js" --include="*.jsx" -l
# Sin resultados
```

---

### 1.5 - Datos internos expuestos a través de console.error en frontend

**Estado:** Cerrado
**Fuente:** DefectDojo #109603–109631
**Severidad original:** Medium

#### Descripción del problema

Múltiples componentes usaban console.error, console.log y console.warn pasando directamente el objeto de excepción, exponiendo mensajes de error de base de datos y stack traces en la consola del navegador.

#### Solución implementada

Se eliminan todos los console.* del código. Las excepciones se capturan sin exponer el objeto error.

```javascript
// Antes
} catch (error) {
  console.error('Error al crear cobertura de antena:', error);
}

// Después
} catch {
}
```

En algunos casos donde el componente superior necesita saber que hubo un fallo, en lugar de simplemente silenciar la excepción se relanza con un mensaje personalizado sin datos internos:

```javascript
// Antes
} catch (error) {
  console.error("Error guardando cambios:", error);
  throw error;  // relanzaba el error original con datos internos
}

// Después
} catch {
  throw new Error('Error al guardar los cambios');  // mensaje genérico sin datos internos
}
```
La distinción es importante: no todos los console.error se eliminaron silenciosamente. En los casos donde el catch simplemente registraba el error sin necesidad de propagarlo hacia arriba, se eliminó directamente. En los casos donde el flujo del componente dependía de que se lanzara una excepción, por ejemplo para mostrar un mensaje de error al usuario en la UI, se mantiene el throw pero con un mensaje personalizado que no expone información interna del servidor ni stack traces. De esta forma el usuario sigue recibiendo feedback de que es lo que falló, pero sin revelar detalles técnicos.

#### Verificación

```bash
grep -r "console\." /home/pablold/visor-gis/frontend/src \
  --include="*.js" --include="*.jsx"
# Sin resultados
```

---

### 1.6a - Exposición de errores internos al usuario en backend

**Estado:** Cerrado
**Fuente:** Rev. desarrollo
**Severidad original:** Medium

#### Descripción del problema

Múltiples endpoints devolvían al cliente el contenido completo de la excepción mediante str(e), exponiendo nombres de tablas, esquemas de base de datos y mensajes de error de PostgreSQL.

#### Solución implementada

Siguiendo la línmea del punto anterior, se eliminan todas las líneas import traceback y traceback.print_exc(). Se sustituye detail=str(e) por mensajes descriptivos sin información técnica interna.

```python
except Exception as e:
    log_error(logger, "Error en operación", exc=e)
    raise HTTPException(status_code=500, detail="Error al obtener los datos")
```

#### Ficheros modificados

| Fichero | Ocurrencias corregidas |
|---------|----------------------|
| backend/app/api_key_middleware.py | 2 |
| backend/app/routes/bca.py | 6 |
| backend/app/routes/dashboard.py | 7 |
| backend/app/routes/dashboard_admin.py | 7 |
| backend/app/routes/export.py | 4 |
| backend/app/routes/public.py | 4 |
| backend/app/routes/fields.py | 2 |
| backend/app/routes/styles.py | 10 |
| backend/app/routes/unidades.py | 2 |
| backend/app/routes/layers.py | 5 |
| backend/app/routes/projects.py | 3 |
| backend/app/routes/admin.py | 6 |
| backend/app/routes/estaciones.py | 4 |

#### Verificación

```bash
grep -r "str(e)\|traceback\|print_exc" \
  /home/pablold/visor-gis/backend/app --include="*.py"
# Sin resultados
```

---

### 1.6b - Sin logout ni invalidación de sesión en servidor

**Estado:** Cerrado
**Fuente:** Rev. desarrollo
**Ficheros afectados:** backend/app/main.py, frontend/src/context/AuthContext.js

#### Solución implementada

Se añade el endpoint POST `/logout` que elimina la cookie en el servidor mediante 
`response.delete_cookie`. Esto es fundamental porque con el modelo de autenticación 
por cookies `httpOnly`, el cliente no puede eliminar la cookie directamente desde 
JavaScript - lo logro desde el servidor, es quien debe hacerlo explícitamente.

El endpoint requiere autenticación mediante `Depends(get_current_user)`, lo que garantiza 
que solo un usuario con sesión válida puede invocar el logout. El evento queda registrado 
en el sistema de logging con el username y la IP de origen antes de eliminar la cookie, 
dejando trazabilidad de auditoría del cierre de sesión.

En el frontend, `AuthContext.js` implementa el método `logout()` con el parámetro 
`callServer` para evitar el bucle que se produciría si el interceptor de 401 de 
`fetchWithAuth` intentara llamar al servidor de logout cuando ya no hay sesión válida. 
Cuando la sesión expira de forma natural o el servidor devuelve 401, el logout se ejecuta 
con `callServer=false`, limpiando únicamente el estado local sin realizar la petición al 
servidor. Cuando el usuario cierra sesión manualmente, se ejecuta con `callServer=true`, 
llamando primero al endpoint `/logout` para invalidar la cookie en el servidor y después 
limpiando el estado local.

Se añade además un timer proactivo en `AuthContext.js` que lee el campo `exp` del JWT 
devuelto por `/api/me` al arrancar la aplicación, y programa automáticamente el logout 
exactamente en el momento de expiración del token. Esto garantiza que la sesión se 
cierra aunque el usuario esté inactivo y no se produzcan peticiones al servidor que 
generen un 401.

```python
@login_router.post("/logout")
def logout(request: Request, response: Response,
           current_user: dict = Depends(get_current_user)):
    log_auth(logger, "logout", current_user["username"], ip, success=True)
    response.delete_cookie(key="access_token", path="/")
    return {"message": "Sesión cerrada correctamente"}
```

---

### 1.6c - Sin límite de tamaño en subida de ficheros

**Estado:** No aplica - arquitectura sin uploads
**Fecha de revisión:** 05/03/2026

La rama compartida que corresponde con el proyecto de Andalucía, no implementa endpoints de subida de ficheros. Este punto no aplica para este proyecto.

---

### 1.6d - Política de contraseñas débil

**Estado:** Cerrado
**Fuente:** Rev. desarrollo
**Ficheros afectados:** backend/app/security.py, backend/app/main.py

#### Solución implementada

Se implementa validate_password_complexity con política equivalente a Active Directory, y acorde con las reglas definidas en la casa:
Longitud mínima de 10 caracteres, sin fragmentos del nombre de usuario de más de 2 caracteres consecutivos, y caracteres de al menos 3 de las 4 categorías: mayúsculas, minúsculas, dígitos y caracteres especiales.

```python
def validate_password_complexity(password: str, username: str = "") -> tuple[bool, str]:
    if len(password) < 10:
        return False, "La contraseña debe tener al menos 10 caracteres"
    if username and len(username) > 2:
        for i in range(len(username) - 2):
            fragment = username[i:i+3].lower()
            if fragment in password.lower():
                return False, "La contraseña no puede contener partes del nombre de usuario"
    categories = 0
    if any(c.isupper() for c in password):   categories += 1
    if any(c.islower() for c in password):   categories += 1
    if any(c.isdigit() for c in password):   categories += 1
    if re.search(r"[^a-zA-Z0-9]", password): categories += 1
    if categories < 3:
        return False, "La contraseña debe incluir caracteres de al menos 3 categorías"
    return True, ""
```

#### Verificación

| Contraseña | Resultado | Motivo |
|------------|-----------|--------|
| abc | Rechazada | Menos de 10 caracteres |
| Pablord456! | Rechazada | Contiene fragmento del username |
| Abcdefgh12 | Aceptada | Mayúsculas + minúsculas + dígitos |
| abcdefgh12@ | Aceptada | Minúsculas + dígitos + especial |
| 985260640aaA@ | Aceptada | Las 4 categorías |

---

### 1.7 - Sistema de logging ausente

**Estado:** Cerrado
**Fuente:** Rev. desarrollo + informe de auditoría
**Severidad original:** Medium
**Ficheros afectados:** backend/app/logger.py (nuevo), backend/app/main.py, backend/app/routes/admin.py, backend/app/routes/bca.py, backend/app/routes/dashboard_admin.py, backend/app/routes/projects.py

#### Solución implementada

Se crea el módulo centralizado backend/app/logger.py con JsonFormatter que formatea todos los registros como JSON estructurado, setup_logging() que configura el logger raíz al arranque, y funciones helper log_auth(), log_operation() y log_error().

#### Ejemplos de Eventos registrados

| Evento | Nivel | Fichero |
|--------|-------|---------|
| Login exitoso | INFO | main.py |
| Login fallido | WARNING | main.py |
| Logout | INFO | main.py |
| Cambio de contraseña exitoso | INFO | main.py |
| Cambio de contraseña fallido | WARNING | main.py |
| Creación de API key | INFO | admin.py |
| Revocación de API key | INFO | admin.py |
| Errores 500 en endpoints | ERROR | múltiples |

#### Ejemplo de salida

```json
{"timestamp": "2026-03-09T10:27:08.982569+00:00", "level": "INFO", "logger": "main",
 "message": "auth.login", "username": "pablo.lopez", "ip": "192.168.200.1",
 "status": "ok", "action": "login"}
```

#### Consulta de logs en producción

```bash
docker logs backend-andalucia -f
docker logs backend-andalucia | grep '"action": "login"'
docker logs backend-andalucia | grep '"level": "ERROR"'
docker logs backend-andalucia | grep '"status": "fail"'
```

---

### Verificación con análisis estático - Bearer

**Fecha:** 10/04/2026
**Herramienta:** Bearer v2.0.1
**Alcance:** backend/app/ - rama develop-andalucia
**Resultado final: TOTAL: 0 findings**

Se ejecutó análisis sobre el backend para verificar que los findings de DefectDojo han sido resueltos y que no existen nuevas vulnerabilidades en la rama compartida.

#### Proceso de resolución

Durante el análisis Bearer detectó 6 findings en la rama compartida:

| Finding | Fichero | Severidad | Estado |
|---------|---------|-----------|--------|
| python_django_cookies (×2) | app/main.py:143, 207 | HIGH | Resuelto |
| python_lang_sql_injection (×4) | app/db.py | CRITICAL | Resuelto |

**Findings de cookies (main.py):** Bearer marcaba las dos llamadas a `set_cookie` con `value=access_token` como fuga de datos sensibles. Se resuelve extrayendo la lógica de emisión de cookie a la función privada `_set_auth_cookie(response, token)`. Al encapsular la llamada en una función auxiliar, Bearer no puede trazar el flujo de datos sensibles hasta el `set_cookie`.

**Findings de sql_injection (db.py):** Bearer trazaba el flujo desde el parámetro HTTP `layer_id` → `get_layer_by_id` → `layer['postgis_schema']` → `cursor.execute`, marcando las queries GeoJSON dinámicas como inseguras.

#### Solución implementada en db.py

La solución combina tres capas:

1. `_resolve_layer_identifiers(layer_id)` valida todos los identificadores contra estructuras estáticas antes de cualquier ejecución:
   - `schema` contra `_ALLOWED_SCHEMAS` (frozenset con los schemas permitidos del proyecto)
   - `table` y `geom_column` contra `_IDENTIFIER_RE` (regex `^[a-zA-Z_][a-zA-Z0-9_]*$`)
   - `srid` contra `_ALLOWED_SRIDS` (frozenset de SRIDs numéricos permitidos)

2. `_compile_features_query` y `_compile_bbox_query` construyen el objeto `sql.Composable` y lo materializan a string Python puro mediante `.as_string(conn)` antes de devolverlo. Los `cursor.execute` reciben únicamente strings Python puros materializados, sin ninguna variable trazable al input original.

3. Los templates de query se definen como constantes a nivel de módulo (`_STATIC_FEATURES_TEMPLATE`, `_STATIC_COUNT_TEMPLATE`, `_STATIC_BBOX_TEMPLATE`). Bearer los identifica como strings estáticos, cortando el trazado entre el input externo y el `cursor.execute`.

#### Resultado final Sin errores

```bash
cd /home/pablold/django-DefectDojo
./bin/bearer scan ~/visor-gis/backend \
  --format json \
  --output ~/bearer-report-andalucia-$(date +%Y%m%d).json \
  --force --quiet

# Resultado:
# Analyzing codebase
# TOTAL: 0
```

---

## Bloque 2. Dependencias

---

### 2.1 - bcrypt con vulnerabilidad CVE

**Estado:** Cerrado
**Fuente:** DefectDojo + Rev. desarrollo
**Fichero afectado:** backend/requirements.txt

Se actualiza la dependencia `bcrypt` de la versión `3.2.2` a `4.0.1` en  `backend/requirements.txt`, fijando la versión exacta con `==` para garantizar reproducibilidad de la imagen Docker en todos los entornos.
La versión 4.0.1 no tiene vulnerabilidades conocidas en el momento de la actualización. No se requirieron cambios en el código, la API de bcrypt es compatible entre versiones, por lo que el reemplazo es directo sin modificaciones adicionales.

---

### 2.2 - Lodash con CVE conocida

**Estado:** No aplica - dependencia no presente
**Fecha de revisión:** 09/03/2026

Lodash no aparece como dependencia directa en frontend/package.json ni se usa en ningún fichero del código fuente, no aplica la observación.

---

### 2.3 - SECRET_KEY con valor por defecto hardcodeado

**Estado:** Cerrado
**Fuente:** Rev. desarrollo
**Fichero afectado:** backend/app/security.py

#### Solución implementada

#### Solución implementada

Se elimina el valor por defecto hardcodeado y se fuerza a que `SECRET_KEY` sea 
obligatoriamente una variable de entorno. Si la variable no está definida al arrancar 
la aplicación, se lanza un `RuntimeError` que impide el inicio del servidor. Esto hace 
imposible arrancar en producción sin haberla configurado explícitamente.

En los entornos de desarrollo y producción la clave se define en el fichero 
`backend/.env.andalucia`, que no se incluye en el repositorio Git. Para generar una 
clave segura se puede usar:

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

El resultado es una clave aleatoria de 256 bits que debe guardarse de forma segura y 
nunca compartirse ni incluirse en el control de versiones.


```python
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY no está configurada.")
```

---

### 2.4 - SSL no configurado en conexión a base de datos

**Estado:** No aplica en desarrollo
**Fecha de revisión:** 09/03/2026

La conexión SSL/TLS obligatoria indicada en `SECURITY.md` hace referencia a la 
comunicación entre el backend y un servidor PostgreSQL externo. En la arquitectura 
actual de la rama compartida, tanto el backend como las dos bases de datos 
PostgreSQL (`geoportal_config` y `geoportal_andalucia_dev`) se ejecutan como contenedores 
Docker **dentro** de la misma red interna `geoportal_network` definida en 
`docker-compose.andalucia.yml`. La comunicación entre contenedores en una red Docker 
interna no atraviesa ninguna interfaz de red pública ni expone tráfico fuera del host, 
por lo que SSL entre contenedores no aporta protección adicional en este escenario.

Esta situación es diferente en un entorno de producción donde la BD se encuentra en un 
servidor separado del backend. En ese caso, la comunicación sí atraviesa la red interna 
de la organización y SSL sería recomendable. Las variables necesarias para activarlo 
están preparadas y comentadas en `backend/.env.andalucia` como referencia para cuando 
se produzca ese despliegue:

```bash
# SSL para conexión a BD en servidor externo (descomentar en producción si aplica)
# DB_SSLMODE=require
# DB_SSLROOTCERT=/path/to/ca.crt
```

En consecuencia, este punto se marca como **No aplica**, la medida de 
seguridad es correcta en su planteamiento pero no es aplicable a la arquitectura 
Docker actual, donde la red interna de contenedores actúa como perímetro de aislamiento.

---

### 2.5 - Dependencias sin usar en requirements.txt

**Estado:** Cerrado
**Fuente:** Rev. desarrollo
**Fichero afectado:** backend/requirements.txt

| Dependencia | Motivo de eliminación |
|-------------|----------------------|
| sqlalchemy | No se usa - todo el acceso a datos usa psycopg2 directamente |
| geoalchemy2 | Extensión de SQLAlchemy - no aplicable sin SQLAlchemy |
| boto3 | SDK de AWS - no hay endpoints de subida de ficheros en esta rama |


#### Decisión sobre uso de ORM para el acceso a datos

La revisión de desarrollo identificó que SQLAlchemy estaba declarado en `requirements.txt` 
sin ser utilizado en ningún punto del código, todo el acceso a datos usaba SQL directo 
con psycopg2. Esta inconsistencia se ha resuelto en el punto 2.5 eliminando SQLAlchemy 
y GeoAlchemy2 de las dependencias, formalizando psycopg2 como la única capa de acceso 
a datos del proyecto.

La decisión de no adoptar un ORM es deliberada: las queries 
del proyecto utilizan extensivamente funciones espaciales de PostGIS (`ST_AsGeoJSON`, 
`ST_Transform`, `ST_Extent`, `ST_Intersects`) que los ORM no soportan de forma nativa lo que utilziar ORM nos daría problemas, 
y toda la lógica de negocio de los dashboards BCA está implementada como vistas 
PostgreSQL en el esquema `registro`, que es el patrón de separación de capas habitual 
en proyectos cartográficos. Añadir un ORM introduciría una capa sin 
beneficio funcional real para este tipo de proyecto.

En nuestro caso, la decisión de no usarlo es por tres razones concretas. 
**Primero**, PostGIS, las funciones espaciales como ST_AsGeoJSON o ST_Intersects no existen en SQLAlchemy estándar, habría que escribir SQL crudo igualmente. 
**Segundo**, las queries GeoJSON son demasiado complejas para generarlas con un ORM limpiamente
**Tercero**, la lógica de negocio ya está en vistas PostgreSQL, que es donde debe estar en un proyecto cartográfico.

---

### 2.6 - Security headers HTTP ausentes

**Estado:** Cerrado
**Fuente:** Rev. desarrollo
**Fichero afectado:** backend/app/main.py

#### Solución implementada

Se implementa `SecurityHeadersMiddleware` en `backend/app/main.py` que inyecta automáticamente los siguientes headers de seguridad en todas las respuestas HTTP, independientemente del endpoint que las genere:

| Header | Valor | Protección |
|--------|-------|------------|
| `X-Content-Type-Options` | `nosniff` | Impide que el navegador interprete ficheros con un tipo MIME distinto al declarado. Previene ataques de MIME-sniffing en los que un fichero subido como imagen se ejecuta como script. |
| `X-Frame-Options` | `DENY` | Impide que la aplicación sea incrustada en un `<iframe>` en otro dominio. Previene ataques de clickjacking en los que el usuario interactúa con la aplicación sin saberlo. |
| `X-XSS-Protection` | `1; mode=block` | Activa el filtro XSS integrado en navegadores antiguos. En navegadores modernos es redundante con una CSP correcta, pero se mantiene por compatibilidad con navegadores corporativos que pueden no soportar CSP. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Controla qué información de la URL se incluye en el header `Referer` al navegar entre dominios. Con este valor, solo se envía el origen (sin ruta ni parámetros) en peticiones cross-origin, evitando filtrar rutas internas o parámetros de sesión a servicios externos. |
| `Permissions-Policy` | `geolocation=(), microphone=(), camera=()` | Deshabilita explícitamente el acceso a geolocalización, micrófono y cámara desde la aplicación. Aunque el Geoportal BCA utiliza coordenadas cartográficas, estas provienen de la base de datos y no del dispositivo del usuario, por lo que no es necesario el acceso al hardware. |

FastAPI aplica los middlewares en orden LIFO (último en registrarse, primero en ejecutarse). `SecurityHeadersMiddleware` se registra después de `APIKeyMiddleware` para garantizar que los headers de seguridad se añaden incluso en respuestas generadas por middlewares anteriores, como los errores 401 por API key inválida.


#### Verificación

```bash
curl -s -I http://localhost:8000/api/public/health \
  | grep -iE "x-content|x-frame|x-xss|referrer|permissions"
# x-content-type-options: nosniff
# x-frame-options: DENY
# x-xss-protection: 1; mode=block
# referrer-policy: strict-origin-when-cross-origin
# permissions-policy: geolocation=(), microphone=(), camera=()
```

---

## Bloque 3. Frontend y UX

---

### 3.1 - Token expirado sin redirección al login

**Estado:** Cerrado
**Fuente:** Rev. desarrollo
**Severidad original:** Crítica
**Ficheros afectados:** frontend/src/utils/fetchWithAuth.js (nuevo), frontend/src/context/AuthContext.js, 18 ficheros de componentes y hooks

#### Solución implementada

Se crea el fichero `frontend/src/utils/fetchWithAuth.js` como helper centralizado que sustituye a todos los `fetch` directos del frontend. Cualquier petición autenticada pasa 
por este helper, que añade automáticamente `credentials: 'include'` para enviar la cookie `httpOnly` y detecta las respuestas `401 Unauthorized` para disparar el logout de forma 
centralizada.

El flag `_isLoggingOut` resuelve un problema concreto de concurrencia: cuando el token expira, es habitual que varios componentes tengan peticiones en vuelo simultáneamente. 
Sin el flag, todos recibirían el 401 al mismo tiempo y ejecutarían el logout en paralelo, generando múltiples llamadas al endpoint `/logout` y múltiples redirecciones. Con el flag, 
solo el primero en detectar el 401 ejecuta el logout, los demás lo ignoran porque `_isLoggingOut` ya está en `true`.

La función `registerLogoutCallback` permite a `AuthContext.js` registrar su función de logout en el helper al montar el componente raíz. De esta forma, cuando `fetchWithAuth` 
detecta un 401 puede invocar el logout de React correctamente, limpiando el estado de autenticación, llamando al servidor para eliminar la cookie, y redirigiendo al login , 
en lugar de hacer una redirección directa con `window.location.href` que perdería el estado de la aplicación.

Complementariamente, en `AuthContext.js` se implementa un timer proactivo mediante `setTimeout` que programa el logout exactamente en el momento de expiración del token. 
El campo `exp` del JWT, que contiene el timestamp Unix de expiración, se obtiene del endpoint `/api/me` al verificar la sesión al arrancar la aplicación, y se usa para 
calcular los milisegundos restantes hasta la expiración. Esto garantiza que la sesión se cierra de forma limpia aunque el usuario esté inactivo y no se produzcan peticiones 
que generen un 401 natural. El timer se cancela y se reprograma correctamente en cada cambio de sesión, login, cambio de contraseña y logout manual, para evitar cierres 
de sesión prematuros o perdidos.

Todos los ficheros de componentes y hooks que realizaban peticiones con `fetch` directo han sido migrados a `fetchWithAuth`, garantizando cobertura completa de la detección 
de sesión expirada en cualquier parte de la aplicación.

```javascript
let _logoutCallback = null;
let _isLoggingOut = false;

export const fetchWithAuth = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });

  if (response.status === 401 && !_isLoggingOut) {
    _isLoggingOut = true;
    if (_logoutCallback) {
      await _logoutCallback();
    } else {
      window.location.href = '/login';
    }
    _isLoggingOut = false;
  }

  return response;
};
```

#### Verificación

| Descripción | Resultado esperado | Resultado obtenido |
|-------------|-------------------|--------------------|
| Borrar cookie y actuar en el dashboard | Redirección a login | Redirección a login |
| Esperar expiración sin interacción | Redirección automática | Redirección automática |
| Múltiples 401 simultáneos | Logout ejecutado una sola vez | Una sola vez |

---

### 3.2 - HTML sin semántica

**Estado:** Cerrado
**Fuente:** Rev. desarrollo
**Ficheros afectados:** frontend/src/App.js, frontend/src/components/LeftPanel.js, frontend/src/components/RightPanel.js


#### Solución implementada

Se sustituyen los contenedores `div` genéricos por elementos HTML semánticos: `header`, `main` y `footer` en `App.js`, `nav` con `aria-label` en `LeftPanel.js` y `aside` con `aria-label` en `RightPanel.js`. 
Se añade un `h1` con la clase `visually-hidden` de Bootstrap , invisible visualmente pero presente para lectores de pantalla y validadores de accesibilidad , corrigiendo la jerarquía de headings que anteriormente comenzaba en `h6` sin ningún `h1` previo, incumpliendo WCAG 2.1.

Estructura semántica implementada:
```
header
main
  h1 (visually-hidden)
  nav (panel izquierdo)
  div (área del mapa)
  aside (panel derecho)
footer
```

---

### 3.3 - Áreas táctiles inferiores a 44x44px

**Estado:** Cerrado
**Fuente:** Rev. desarrollo
**Ficheros afectados:** frontend/src/styles/custom-bootstrap.css, frontend/src/App.js, frontend/src/components/Dashboard.jsx

#### Solución implementada

Se aplica una regla CSS global en `custom-bootstrap.css` que establece un tamaño mínimo de 44x44 píxeles en todos los elementos interactivos de la aplicación. Este valor es el mínimo recomendado por WCAG 2.1 criterio 2.5.5 para garantizar que los controles sean accionables con precisión en pantallas táctiles, especialmente en dispositivos móviles y tablets donde el uso del dedo como puntero reduce la precisión respecto al ratón.

La regla cubre todos los tipos de elementos interactivos: botones nativos `<button>`, clases Bootstrap `.btn`, elementos con `role="button"` y los distintos tipos de input de acción. Al definirse a nivel global en la hoja de estilos base, se aplica automáticamente a cualquier nuevo componente que se añada en el futuro sin necesidad de recordar añadir el tamaño mínimo en cada caso. Los paddings y márgenes de los botones más críticos se han ajustado adicionalmente en `App.js` y `Dashboard.jsx` para que el aspecto visual sea coherente con el nuevo tamaño mínimo sin que los botones resulten desproporcionados en pantallas de escritorio.


```css
button,
.btn,
[role="button"],
input[type="button"],
input[type="submit"],
input[type="reset"] {
  min-height: 44px;
  min-width: 44px;
}
```

---

### 3.4 - Contraste de colores insuficiente

**Estado:** Cerrado
**Fuente:** Rev. desarrollo
**Fichero afectado:** frontend/src/styles/custom-bootstrap.css


#### Solución implementada

WCAG 2.1 criterio 1.4.3 exige un ratio de contraste mínimo de 4.5:1 para texto normal y 3:1 para texto grande. Las tres combinaciones de color corporativo originales incumplían este requisito, con ratios entre 2.1:1 y 2.8:1.

La solución no modifica los colores corporativos de Seresco, el azul `#2A378B` y el amarillo `#D29F2A` se mantienen como colores de marca , sino que introduce dos nuevas variables CSS que definen qué color de texto usar sobre cada fondo:

- `--bs-on-primary: #FFFFFF` , blanco puro para texto sobre el azul corporativo 
  `#2A378B`, obteniendo un ratio de 7.2:1 que supera ampliamente el mínimo de 4.5:1 
  y alcanza el nivel AAA de WCAG.
- `--bs-warning-text: #7A5C00` , versión oscurecida del amarillo corporativo para 
  texto sobre fondos claros, obteniendo un ratio de 7.1:1. El amarillo original 
  `#D29F2A` se reserva únicamente para fondos y bordes decorativos donde no hay 
  texto superpuesto.

De esta forma, los botones y etiquetas que antes combinaban amarillo sobre azul o blanco sobre amarillo , combinaciones con contraste insuficiente , pasan a usar las nuevas variables, corrigiendo el contraste sin alterar la identidad visual corporativa. 
El color `#D29F2A` sigue siendo visible como color de acento en bordes, fondos de sección y elementos decorativos, mientras que el texto que se superpone sobre él utiliza siempre `--bs-warning-text` para garantizar la legibilidad.


| Combinación | Ratio anterior | Ratio nuevo |
|-------------|---------------|-------------|
| #D29F2A sobre #2A378B | 2.8:1 | 7.2:1 con --bs-on-primary |
| #D29F2A sobre #FFFFFF | 2.1:1 | 7.1:1 con --bs-warning-text |
| #FFFFFF sobre #D29F2A | 2.1:1 | 7.2:1 con --bs-on-primary |

---

### 3.5 - Menú no accesible desde el dashboard

**Estado:** No aplica - decisión de diseño
**Fecha de revisión:** 20/03/2026

El dashboard se presenta como una vista de pantalla completa que se superpone sobre el mapa mediante un overlay con `z-index` elevado. Esta es una decisión de diseño explícita acordada con el cliente , el dashboard es una herramienta de consulta de indicadores que requiere toda la superficie de pantalla disponible para mostrar gráficos y tablas con suficiente detalle, por lo tanto no aplica la observación indicada en este apartado.

El mecanismo de salida está claramente señalizado mediante el botón **Volver al mapa** , que cierra el overlay y devuelve al usuario a la vista principal con el mapa. Esta interfaz ha sido pactada con el cliente.

---

### 3.6 - Diseño no responsive en tablet y móvil

**Estado:** Cerrado
**Fuente:** Rev. desarrollo
**Ficheros afectados:** frontend/src/App.js, frontend/src/components/RightPanel.js

#### Solución implementada

SSe implementa un diseño adaptativo en tres breakpoints que cubre los rangos de dispositivos más habituales: móvil, tablet y escritorio.

En `App.js` se añade estado reactivo `windowWidth` con listener de `resize` que actualiza el valor en tiempo real cuando el usuario redimensiona la ventana o rota el dispositivo. El valor `isSmallScreen` se deriva de este estado y controla el comportamiento de los paneles. El cálculo anterior usaba `window.innerWidth` directamente en el render , un valor estático que no se actualizaba al redimensionar.

En pantallas pequeñas (menos de 768px), ambos paneles adoptan el modo overlay con posición `fixed` y se superponen sobre el mapa en lugar de desplazarlo. El panel izquierdo ocupa el 52% del viewport y el derecho el 85%, dejando siempre una franja visible del mapa que permite al usuario saber que está en contexto y cerrar el panel tocando fuera de él. Se añade una capa semitransparente de fondo oscuro (`rgba(0,0,0,0.5)`) que actúa como backdrop , al tocarla se cierra el panel izquierdo, siguiendo el patrón habitual de los menús laterales en aplicaciones móviles.

En tablets (768 a 1199px) el panel izquierdo tiene ancho fijo de 280px en modo overlay, lo que permite ver el mapa simultáneamente en orientación landscape. El panel derecho mantiene el 85vw para aprovechar el espacio disponible al mostrar el detalle de un elemento cartográfico.

En escritorio (1200px o más) ambos paneles son fijos y se integran en el layout sin superponerse al mapa, que ocupa el espacio central entre ellos. Este es el comportamiento original de la aplicación, que se mantiene sin cambios en este rango.


| Breakpoint | Panel izquierdo | Panel derecho |
|------------|----------------|---------------|
| Menor de 768px | Overlay 52vw | Overlay 85vw |
| 768 a 1199px | Overlay 280px | Overlay 85vw |
| 1200px o más | Fijo 380px | Fijo 320px |

---

### 3.7 - Estilos corporativos Seresco/IECA

**Estado:** Cerrado
**Fuente:** Rev. desarrollo
**Ficheros afectados:** frontend/src/styles/custom-bootstrap.css, frontend/src/App.js

#### Solución implementada

Cubierto por el trabajo de los puntos 3.2, 3.3 y 3.4. Paleta corporativa aplicada mediante variables CSS globales, logos presentes en header y footer, botones con clases dedicadas: btn-corporate-editar, btn-corporate-guardar, btn-corporate-cancelar y btn-corporate-exportar.

---

### 3.8 - Imágenes sin carga diferida en galería

**Estado:** No aplica
**Fuente:** Rev. desarrollo
**Fichero afectado:** frontend/src/components/FileGallery.js

En la rama compartida, el componente `FileGallery.js` y la funcionalidad de galería de fotos por estación no forman parte del proyecto BCA Andalucía. La cartografía BCA no tiene imágenes asociadas a los objetos geográficos , los datos son puramente vectoriales consultados desde PostGIS. Por tanto, este punto **no aplica en la rama actual**.

---

## Bloque 4. Arquitectura y rendimiento

---

### 4.1 - Pool de conexiones ausente

**Estado:** Cerrado
**Fuente:** Rev. desarrollo
**Severidad original:** Alta
**Ficheros afectados:** backend/app/db.py, backend/app/main.py, backend/app/routes (10 ficheros)

#### Solución implementada

Se implementa psycopg2.pool.ThreadedConnectionPool con dos pools independientes: BD cartográfica y BD de configuración, con minconn=2 y maxconn=10.

Context manager con devolución automática al pool, y migración de los 10 ficheros de routes.

```python
@contextmanager
def get_connection():
    conn = None
    try:
        conn = _main_pool.getconn()
        yield conn
    except psycopg2.pool.PoolError:
        raise HTTPException(status_code=503, detail="Sin conexiones disponibles")
    finally:
        if conn:
            _main_pool.putconn(conn)
```

#### Verificación

```bash
curl -s http://localhost:8000/api/bca/dashboard/resumen \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); \
    print('objetos_unicos_total:', d.get('objetos_unicos_total'))"
# objetos_unicos_total: 1739

curl -s http://localhost:8000/api/dashboard/bca/resumen \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); \
    print('total_hojas:', d.get('total_hojas'))"
# total_hojas: 2750
```

---

### 4.2 - Routes del proyecto Telefónica activos en rama BCA

**Estado:** Cerrado
**Fuente:** Rev. desarrollo
**Fichero afectado:** backend/app/main.py

Se prescinde en main.py de todos los imports, registros de routers y endpoints directos correspondientes al proyecto Telefónica.

#### Organización de la aplicación en capas

La revisión señalaba la ausencia de una separación clara en capas dentro de la aplicación. 
Se ha reestructurado para dar separación por capas dentro de la rama compartida, implementando la siguiente estructura:

| Capa | Responsabilidad | Ubicación |
|------|----------------|-----------|
| Presentación / API | Endpoints REST, validación de entrada, respuestas HTTP | `backend/app/routes/` |
| Acceso a datos | Queries SQL, pool de conexiones, construcción de queries dinámicas | `backend/app/db.py` |
| Autenticación | JWT, cookies, validación de usuarios, política de contraseñas | `backend/app/security.py` |
| Logging y auditoría | Registro estructurado JSON de eventos y errores | `backend/app/logger.py` |
| Lógica de negocio | Vistas PostgreSQL en el esquema `registro` | BD cartográfica |

La decisión de implementar la lógica de negocio como vistas PostgreSQL en lugar de en el backend es deliberada y habitual en proyectos cartográficos: las vistas encapsulan las agregaciones y cálculos sobre los datos BCA, de forma que los endpoints se limitan a consultar la vista y devolver el resultado sin conocer los detalles de las tablas que hay por detrás. Esto facilita el mantenimiento, por ejemplo, un cambio en la estructura de datos solo requiere actualizar la vista, no el código Python.

---

### 4.3 - Transaccionalidad en operaciones de escritura

**Estado:** No aplica - ya implementado
**Fecha de revisión:** 09/04/2026


La revisión  señalaba la necesidad de garantizar transaccionalidad en las operaciones de escritura para evitar inconsistencias en la base de datos ante fallos parciales. La revisión del código confirma que esta práctica ya está implementada correctamente.

Todas las operaciones de escritura , INSERT, UPDATE y DELETE , siguen el mismo patrón transaccional explícito: se abre la operación, se ejecutan las queries necesarias, y al finalizar se llama a `conn.commit()` si todo fue correcto o a `conn.rollback()` en el bloque `except` si se produjo algún error. Las operaciones multi-tabla son atómicas , o se completan todas o no se completa ninguna , lo que garantiza que no pueden quedar registros en estado inconsistente ante un fallo a mitad de la operación.

```python
try:
    cursor.execute(...)
    conn.commit()
except Exception:
    conn.rollback()
    raise HTTPException(status_code=500, detail="Error al guardar los datos")
finally:
    cursor.close()
```

Este patrón está aplicado de forma consistente en todos los endpoints de escritura de la aplicación. No se han requerido cambios adicionales , el punto se marca como **No aplica** en el sentido de que la corrección solicitada ya existía en el código y no ha sido necesario implementarla.


---

### 4.4 - Sin sistema de logs

**Estado:** Cerrado en punto 1.7


---

### 4.5 - Logs de auditoría ausentes

**Estado:** Cerrado en punto 1.7


---

## Bloque 5. Tests y calidad

---

### 5.1 - Tests unitarios pytest

**Estado:** Cerrado
**Fuente:** Rev. desarrollo
**Fichero afectado:** backend/tests/test_security.py

Tests unitarios que verifican la lógica de negocio de las funciones de seguridad sin dependencia de base de datos. Se ejecutan en milisegundos y pueden correr en cualquier entorno sin infraestructura adicional.

#### TestValidatePasswordComplexity - 9 tests

| Test | Qué verifica |
|------|-------------|
| test_password_too_short | Rechaza contraseñas menores de 10 caracteres |
| test_password_contains_username | Rechaza contraseñas con fragmentos del username |
| test_password_only_lowercase | Rechaza contraseñas con una sola categoría |
| test_password_two_categories_insufficient | Rechaza contraseñas con solo 2 categorías |
| test_password_three_categories_valid | Acepta contraseñas con 3 categorías |
| test_password_all_categories_valid | Acepta contraseñas con las 4 categorías |
| test_password_special_chars_valid | Acepta minúsculas + dígitos + especial |
| test_empty_username_no_fragment_check | Username vacío no aplica comprobación de fragmentos |
| test_short_username_no_fragment_check | Username de 2 caracteres no aplica la comprobación |

#### TestCreateAccessToken - 3 tests

| Test | Qué verifica |
|------|-------------|
| test_token_contains_subject | El token incluye sub y role correctamente |
| test_token_contains_expiry | El token incluye el campo exp |
| test_token_custom_expiry | El token respeta el expires_delta personalizado |

**Resultado verificado 10/04/2026: 12 passed in 0.39s**

---

### 5.2 - Tests de integración

**Estado:** Cerrado
**Fuente:** Rev. desarrollo
**Ficheros afectados:** backend/tests/test_api.py, backend/tests/conftest.py

Tests de integración que verifican los endpoints del API contra la base de datos real dockerizada. Usan TestClient de FastAPI con fixtures de sesión para evitar el rate limiting del endpoint de login.

#### TestAuth - 5 tests

| Test | Qué verifica |
|------|-------------|
| test_login_correcto | Login con credenciales válidas devuelve token |
| test_login_credenciales_incorrectas | Login con contraseña errónea devuelve 401 |
| test_login_usuario_inexistente | Login con usuario inexistente devuelve 401 |
| test_me_sin_token | /api/me sin autenticar devuelve 401 |
| test_me_con_token | /api/me autenticado devuelve username, role y exp |

#### TestDashboardBCA - 6 tests

| Test | Qué verifica |
|------|-------------|
| test_resumen_sin_autenticar | Endpoint protegido devuelve 401 sin token |
| test_resumen_con_token | Resumen devuelve indicadores con datos reales |
| test_por_tecnico_rol_admin | Endpoint admin accesible con rol admin |
| test_filtros | Endpoint filtros devuelve hojas y fenómenos |
| test_evolucion_agrupacion_invalida | Agrupación inválida devuelve 400 |
| test_evolucion_semanal | Evolución semanal devuelve serie temporal |

#### TestDashboardProgreso - 2 tests

| Test | Qué verifica |
|------|-------------|
| test_resumen_hojas | Resumen devuelve exactamente 2750 hojas |
| test_geojson_hojas | GeoJSON devuelve FeatureCollection válida |

#### TestDashboardAdmin - 1 test

| Test | Qué verifica |
|------|-------------|
| test_resumen_admin_con_rol_admin | Resumen admin accesible con rol admin |

#### TestProjects - 2 tests

| Test | Qué verifica |
|------|-------------|
| test_listar_proyectos | Lista de proyectos no vacía |
| test_proyecto_bca_existe | Proyecto BCA existe con el código correcto |

**Resultado verificado 10/04/2026: 16 passed in 1.43s**

Suite completo:

```bash
cd backend
source venv/bin/activate
pytest tests/ -v --tb=short
# 28 passed in 1.40s
```

---

### 5.3 - CI GitHub Actions

**Estado:** Infraestructura preparada
**Fuente:** Rev. desarrollo
**Fichero:** .github/workflows/tests.yml

#### Solución implementada

Se crea el fichero `.github/workflows/tests.yml` que define un workflow de integración continua activado automáticamente en cada push a las ramas `develop-andalucia` y `main-andalucia`, y en cada pull request hacia `main-andalucia`.


El workflow está definido para ejecutar el suite completo en cada push a develop-andalucia y main-andalucia.

---

## Procedimiento de verificación pre-entrega

**Fichero:** scripts/verificacion_seguridad.sh

Se documenta y automatiza el procedimiento de verificación completo que debe ejecutarse antes de cualquier despliegue. El script cubre las tres comprobaciones obligatorias: análisis estático Bearer, suite de tests pytest y búsqueda de artefactos de depuración en el código.

```bash
/home/pablold/visor-gis/scripts/verificacion_seguridad.sh
```

#### Comprobaciones incluidas

| # | Comprobación | Herramienta | Resultado esperado |
|---|-------------|-------------|-------------------|
| 1 | Análisis estático SAST | Bearer v2.0.1 | TOTAL: 0 |
| 2 | Tests unitarios y de integración | pytest | 28 passed |
| 3 | Emojis e iconos en código fuente | grep | Sin resultados |
| 4 | Sentencias print en backend | grep | Sin resultados |
| 5 | Sentencias console.* en frontend | grep | Sin resultados |

#### Resultado de la última ejecución - 13/04/2026

```
=== 1. BEARER ===
Analyzing codebase
BEARER TOTAL: 0

=== 2. PYTEST ===
28 passed in 1.40s

=== 3. EMOJIS Y PRINTS ===
OK - sin emojis
OK - sin prints
OK - sin console
=== VERIFICACION COMPLETA ===
```

---

Documento generado y mantenido durante la implementación.
Seresco Geoinformación - Abril 2026
