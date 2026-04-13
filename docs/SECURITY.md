# Documentación de Seguridad
## Geoportal BCA Andalucía — Rama develop-andalucia

## Introducción

Este documento describe las medidas de seguridad implementadas en el Geoportal BCA
Andalucía, proporciona guías para configuración segura en producción y establece
procedimientos para auditorías de seguridad.

El enfoque de seguridad ha sido holístico, tratándola como requisito funcional desde
la fase de diseño, no como capa añadida posteriormente. Todas las medidas descritas
han sido verificadas mediante análisis estático con Bearer (TOTAL: 0 findings) y
suite de tests automatizados (28 passed).

---

## Medidas de Seguridad Implementadas

### Autenticación

#### JSON Web Tokens (JWT) con cookies httpOnly

El sistema utiliza JWT para autenticación stateless. Cada token contiene:
- Identificador único de usuario (`sub`)
- Rol asignado (`admin`, `edicion`, `bca`)
- Flag de cambio de contraseña obligatorio (`requires_password_change`)
- Timestamp de expiración (`exp`)

Los tokens se firman con `SECRET_KEY` mediante algoritmo HS256. La clave debe ser
única por entorno y tener mínimo 32 caracteres hexadecimales (256 bits de entropía).

Generación de SECRET_KEY segura:
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

La aplicación lanza `RuntimeError` al arranque si `SECRET_KEY` no está definida,
haciendo imposible arrancar en producción sin configurarla explícitamente.

**Almacenamiento del token — cookies httpOnly**

El token JWT se transmite y almacena exclusivamente mediante cookies `httpOnly`.
Este mecanismo garantiza que:

- La cookie es inaccesible desde JavaScript por diseño del navegador
- Un script malicioso inyectado mediante XSS no puede extraer el token
- El navegador envía la cookie automáticamente en cada petición al servidor
- El logout invalida la cookie en el servidor mediante `response.delete_cookie`

La emisión de cookie se centraliza en la función privada `_set_auth_cookie`:

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

Los atributos `secure` y `samesite` se configuran mediante variables de entorno:

| Variable | Desarrollo | Producción |
|----------|-----------|------------|
| COOKIE_SECURE | false | true |
| COOKIE_SAMESITE | lax | strict |

El endpoint `GET /api/me` acepta el token desde dos fuentes para mantener
compatibilidad con Swagger UI: cookie `access_token` y header `Authorization: Bearer`.

Ciclo de vida del token:
1. Login exitoso → emisión de cookie httpOnly + token en body para extracción de rol
2. Navegador envía cookie automáticamente en cada petición
3. Backend valida firma y expiración en `get_current_user`
4. Timer proactivo en frontend programa logout exactamente al expirar `exp`
5. Logout → `POST /api/logout` elimina cookie en servidor + limpia estado React

#### Gestión de Contraseñas

Protección mediante hash bcrypt (versión 4.0.1) con factor de trabajo 12.
Este factor proporciona balance entre seguridad y rendimiento, requiriendo
aproximadamente 250ms por hash en hardware moderno.

Política de contraseñas implementada — equivalente a Active Directory:
- Longitud mínima: **10 caracteres**
- Sin fragmentos del nombre de usuario de más de 2 caracteres consecutivos
- Caracteres de al menos **3 de las 4 categorías**: mayúsculas, minúsculas,
  dígitos y caracteres especiales
- Cambio obligatorio en primer login (`requires_password_change: true`)
- Hash almacenado, nunca contraseña en texto plano

No se implementa recuperación por email por decisión de seguridad. Requiere
intervención de administrador para reset — contactar con Pablo López (CyC).

#### Control de Acceso (RBAC)

Roles implementados en la rama BCA Andalucía:

**Administrador (`admin`)**
- Gestión completa de usuarios y API keys
- Acceso a todos los dashboards incluyendo Dashboard Admin
- Todas las operaciones de edición y lectura

**Edición (`edicion`)**
- Creación y modificación de capas y estilos
- Acceso a dashboards BCA
- Lectura de toda la información cartográfica

**BCA (`bca`)**
- Acceso a dashboards BCA de progreso
- Visualización de capas cartográficas
- Solo lectura

---

### Seguridad en API

#### CORS (Cross-Origin Resource Sharing)

Configuración restrictiva mediante variable de entorno `CORS_ORIGINS`.
En producción nunca utilizar comodín:

```python
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000")
origins = [o.strip() for o in CORS_ORIGINS.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
```

Configuración por entorno en `backend/.env.andalucia`:

```bash
# Desarrollo
CORS_ORIGINS=http://localhost:3000,http://172.19.30.221:3000

# Producción
CORS_ORIGINS=http://172.19.30.201:3000
```

Si en producción se sirve con HTTPS, los orígenes deben incluir `https://` —
un origen `http://` y `https://` son distintos para CORS aunque apunten al
mismo servidor.

#### Rate Limiting

Protección contra ataques de fuerza bruta implementada con `slowapi`:

- **Endpoint /login**: máximo **5 intentos por minuto por IP**
  - El límite se aplica independientemente de si las credenciales son válidas
  - Los intentos que superan el límite reciben `429 Too Many Requests`
  - El contador se reinicia automáticamente al cabo de 60 segundos

```python
limiter = Limiter(key_func=get_remote_address)

@login_router.post("/login")
@limiter.limit("5/minute")
def login(request: Request, response: Response, data: LoginRequest):
    ...
```

Verificación:
```bash
for i in {1..6}; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST http://localhost:8000/api/login \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"wrong"}')
  echo "Intento $i: $CODE"
done
# Intento 1-3: 401
# Intento 4-6: 429
```

#### Security Headers HTTP

`SecurityHeadersMiddleware` inyecta automáticamente en todas las respuestas:

| Header | Valor | Protección |
|--------|-------|------------|
| `X-Content-Type-Options` | `nosniff` | Previene MIME-sniffing |
| `X-Frame-Options` | `DENY` | Previene clickjacking |
| `X-XSS-Protection` | `1; mode=block` | Filtro XSS en navegadores legacy |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Evita filtrar rutas internas |
| `Permissions-Policy` | `geolocation=(), microphone=(), camera=()` | Deshabilita acceso a hardware |

Verificación:
```bash
curl -s -I http://localhost:8000/api/public/health \
  | grep -iE "x-content|x-frame|x-xss|referrer|permissions"
```

#### API Keys para acceso programático

Sistema complementario de autenticación mediante claves de API para integraciones:
- Claves generadas con `secrets.token_urlsafe(32)` con prefijo `gp_`
- Hash bcrypt almacenado — la clave en texto plano solo se muestra una vez
- Rate limiting configurable por clave (`basic`: 100 req/h, `premium`: 1000 req/h)
- Revocación inmediata sin afectar otros accesos
- Registro de uso en tabla `api_usage_logs` para auditoría

---

### Base de Datos

#### Arquitectura dual

La rama BCA Andalucía usa dos bases de datos independientes con pools separados:

| Pool | Base de datos | Puerto | Uso |
|------|--------------|--------|-----|
| `_config_pool` | `geoportal_config` | 5436 | Usuarios, capas, proyectos, estilos |
| `_main_pool` | `geoportal_andalucia_dev` | 5450 (producción) | Datos cartográficos BCA |

#### Pool de conexiones

Se implementa `psycopg2.pool.ThreadedConnectionPool` con context manager que
garantiza la devolución automática de conexiones al pool sin riesgo de fugas:

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

Configuración: `minconn=2`, `maxconn=10` por pool.

#### Conexión SSL/TLS

La conexión SSL/TLS entre backend y BD no aplica en el entorno de desarrollo
actual, donde ambos servicios se ejecutan como contenedores Docker dentro de
la misma red interna `geoportal_network`. La comunicación entre contenedores
no atraviesa ninguna interfaz de red pública.

Para entornos donde la BD se encuentre en un servidor externo, activar en
`backend/.env.andalucia`:

```bash
# SSL para conexión a BD en servidor externo
# DB_SSLMODE=require
# DB_SSLROOTCERT=/path/to/ca.crt
```

#### Prevención de Inyección SQL

Protección mediante múltiples capas en `backend/app/db.py`:

1. **Validación de identificadores** — `_resolve_layer_identifiers` valida
   schema, tabla, columna de geometría y SRID contra whitelists estáticas
   antes de cualquier ejecución:
   - `_ALLOWED_SCHEMAS`: frozenset con schemas permitidos del proyecto
   - `_IDENTIFIER_RE`: regex `^[a-zA-Z_][a-zA-Z0-9_]*$`
   - `_ALLOWED_SRIDS`: frozenset de SRIDs numéricos permitidos

2. **Materialización de queries** — `_compile_features_query` y
   `_compile_bbox_query` materializan el objeto `sql.Composable` a string
   Python puro mediante `.as_string(conn)` antes de ejecutar. Los
   `cursor.execute` reciben únicamente strings materializados.

3. **Templates estáticos** — las estructuras de query se definen como
   constantes a nivel de módulo (`_STATIC_FEATURES_TEMPLATE`, etc.).

4. **Filtros validados** — `_build_filter_clauses` valida cada campo de
   filtro contra `allowed_columns` (columnas reales de la tabla obtenidas
   de `information_schema`) y contra `_IDENTIFIER_RE` antes de construir
   cláusulas WHERE.

Resultado del análisis estático Bearer sobre esta arquitectura: **TOTAL: 0 findings**.

---

### Código

#### Backend

Principios aplicados:
- Sin credenciales hardcodeadas — toda configuración sensible en variables de entorno
- Sin `print()` ni `traceback` en código de producción
- Sin `str(e)` en respuestas HTTP al cliente — mensajes genéricos sin datos internos
- Validación exhaustiva — todos los endpoints validan entrada con schemas Pydantic
- Logging estructurado JSON — sistema centralizado en `backend/app/logger.py`

#### Frontend

Medidas implementadas:
- Sin `console.*` en código de producción
- Sin token en `localStorage` — autenticación exclusivamente por cookie httpOnly
- `fetchWithAuth` centraliza todas las peticiones autenticadas con detección
  automática de sesión expirada (401) y redirección al login
- `credentials: 'include'` en todas las peticiones para envío automático de cookie

---

## Checklist de Seguridad Pre-Producción

**Crítico (obligatorio)**
- [ ] `SECRET_KEY` generada aleatoriamente — mínimo 32 caracteres hex
- [ ] `CORS_ORIGINS` apunta a dominio de producción (no localhost)
- [ ] `COOKIE_SECURE=true` y `COOKIE_SAMESITE=strict`
- [ ] Rate limiting activo — verificar con 6 intentos de login erróneos
- [ ] Credenciales de base de datos seguras en `.env.andalucia`
- [ ] `bearer scan` ejecutado con resultado `TOTAL: 0`
- [ ] Suite pytest completa — `28 passed`
- [ ] Backups automáticos configurados con Sistemas (CRON)

**Recomendado**
- [ ] SSL/TLS activo si BD en servidor externo (`DB_SSLMODE=require`)
- [ ] `LOG_FILE` configurado para persistencia de logs
- [ ] Revisión de logs de auditoría tras primeras 24h en producción

---

## Procedimiento de Verificación de Seguridad

Ejecutar antes de cualquier entrega o despliegue:

```bash
/home/pablold/visor-gis/scripts/verificacion_seguridad.sh
```

El script cubre: análisis Bearer, suite pytest, búsqueda de prints/console
en código fuente. Resultado esperado en rama `develop-andalucia`:

```
BEARER TOTAL: 0
28 passed
OK — sin emojis
OK — sin prints
OK — sin console
```

---

## Herramientas de Auditoría

**Análisis estático**
- **Bearer** (principal): análisis SAST con trazado de flujo de datos.
  Ejecutar: `./bin/bearer scan ~/visor-gis/backend --format json --force --quiet`
- **pytest**: suite de 28 tests unitarios e integración

**Consulta de logs en producción**
```bash
docker logs backend-andalucia -f
docker logs backend-andalucia | grep '"level": "ERROR"'
docker logs backend-andalucia | grep '"status": "fail"'
docker logs backend-andalucia | grep '"action": "login"'
```

---

## Referencias

- OWASP Top 10 2021
- OWASP ASVS — estándar de verificación de seguridad
- JWT Best Practices RFC 8725
- Bearer rules: https://docs.bearer.com/reference/rules/

---

**Última actualización:** 13 de abril de 2026
**Versión:** 1.1
**Responsable:** Seresco Geoinformación (CyC)

