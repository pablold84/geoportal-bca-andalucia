# Guía de API Keys
## Geoportal BCA Andalucía

## Introducción

Las API Keys proporcionan un método de autenticación alternativo a JWT para acceso
programático al Geoportal BCA Andalucía. Son ideales para:
- Integraciones con otros sistemas corporativos
- Scripts automatizados de consulta de datos cartográficos
- Acceso desde servicios sin interfaz de usuario

## Características de las API Keys

- **Formato:** prefijo `gp_` seguido de 32 caracteres aleatorios
- **Hash seguro:** solo se almacena el hash bcrypt — la clave en texto plano
  se muestra únicamente en el momento de creación
- **Rate limiting configurable:** `basic` (100 req/h) o `premium` (1000 req/h)
- **Revocables:** desactivación inmediata sin afectar otros accesos
- **Trazables:** registro de uso en tabla `api_usage_logs` para auditoría

---

## Gestión de API Keys

### Crear una Nueva API Key

**Desde la API (con token JWT de admin):**

```bash
TOKEN="tu_token_jwt_admin"

curl -X POST "http://localhost:8000/api/admin/api-keys" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "client_name": "Script ETL Producción",
    "client_email": "sistemas@seresco.es",
    "description": "Consulta automatizada de capas BCA",
    "rate_limit_tier": "basic",
    "expires_in_days": null
  }'
```

Respuesta:
```json
{
  "id": 1,
  "api_key": "gp_abc123def456...",
  "key_prefix": "gp_abc123",
  "client_name": "Script ETL Producción",
  "rate_limit_tier": "basic",
  "requests_per_hour": 100,
  "created_at": "2026-04-13T10:00:00Z",
  "expires_at": null
}
```

> **IMPORTANTE:** Copiar la clave generada inmediatamente.
> La clave solo se muestra **UNA VEZ** — no se puede recuperar después.

**Tiers de rate limiting:**

| Tier | Peticiones/hora |
|------|----------------|
| `basic` | 100 |
| `premium` | 1000 |

### Listar API Keys Existentes

```bash
curl -X GET "http://localhost:8000/api/admin/api-keys" \
  -H "Authorization: Bearer $TOKEN"
```

### Ver Estadísticas de Uso

```bash
curl -X GET "http://localhost:8000/api/admin/api-keys/{id}/usage" \
  -H "Authorization: Bearer $TOKEN"
```

### Revocar una API Key

```bash
curl -X DELETE "http://localhost:8000/api/admin/api-keys/{id}" \
  -H "Authorization: Bearer $TOKEN"
```

La clave queda inactiva. Cualquier intento de uso retornará error 401.

---

## Usar API Keys en Aplicaciones

### Autenticación

Las API Keys se envían en el header `X-API-Key`:

```bash
API_KEY="gp_abc123def456..."

curl -X GET "http://localhost:8000/api/layers/1/features" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json"
```

### Ejemplos de Integración

#### Python con requests

```python
import requests

API_KEY = "gp_abc123def456..."
BASE_URL = "http://localhost:8000/api"

headers = {
    "X-API-Key": API_KEY,
    "Content-Type": "application/json"
}

# Obtener features de una capa con bbox
response = requests.get(
    f"{BASE_URL}/layers/1/features",
    headers=headers,
    params={
        "bbox": "-6.0,36.0,-1.0,38.5",
        "limit": 1000
    }
)
geojson = response.json()
print(f"Features obtenidos: {geojson['total_features']}")

# Obtener extensión de una capa
response = requests.get(f"{BASE_URL}/layers/1/bbox", headers=headers)
bbox = response.json()
print(f"Extensión: {bbox}")

# Listar proyectos disponibles
response = requests.get(f"{BASE_URL}/projects", headers=headers)
proyectos = response.json()
```

#### Shell script con curl

```bash
#!/bin/bash

API_KEY="gp_abc123def456..."
BASE_URL="http://localhost:8000/api"

# Función para hacer peticiones
api_call() {
  curl -s -X GET "$BASE_URL/$1" \
    -H "X-API-Key: $API_KEY" \
    -H "Content-Type: application/json"
}

# Obtener resumen del dashboard BCA
echo "Dashboard BCA..."
api_call "bca/dashboard/resumen" | python3 -m json.tool

# Obtener features de una capa con filtros
echo "Features con filtro..."
curl -s -X GET "$BASE_URL/layers/1/features" \
  -H "X-API-Key: $API_KEY" \
  -G \
  --data-urlencode "filters=[{\"field\":\"provincia\",\"operator\":\"equal\",\"value\":\"Sevilla\"}]" \
  | python3 -m json.tool
```

---

## Límites y Rate Limiting

### Comportamiento al Exceder el Límite

Cuando se excede el límite configurado, la API retorna:

**HTTP 429 Too Many Requests**
```json
{
  "detail": "Rate limit excedido. Límite: 100/hora"
}
```

### Estrategia de Manejo con Backoff

```python
import time
import requests

def api_call_with_retry(url, headers, max_retries=3):
    for attempt in range(max_retries):
        response = requests.get(url, headers=headers)

        if response.status_code == 200:
            return response.json()

        if response.status_code == 429:
            wait_time = 2 ** attempt  # 1s, 2s, 4s
            print(f"Rate limit alcanzado. Esperando {wait_time}s...")
            time.sleep(wait_time)
            continue

        response.raise_for_status()

    raise Exception("Máximo de reintentos alcanzado")
```

---

## Seguridad

### Buenas Prácticas

1. **Nunca incluir API keys en repositorios Git**

```bash
# Usar variables de entorno
export GEOPORTAL_API_KEY="gp_..."

# O archivos de configuración excluidos de Git
echo "gp_..." > .api_key
echo ".api_key" >> .gitignore
```

2. **Usar claves específicas por entorno y propósito**
   - Una clave por script o integración
   - Facilita la revocación granular si una clave se compromete

3. **Monitorizar uso anómalo**
   - Revisar `GET /api/admin/api-keys/{id}/usage` periódicamente
   - Picos inesperados pueden indicar clave comprometida

4. **Rotar claves periódicamente**
   - Crear nueva clave
   - Actualizar la integración
   - Revocar la clave antigua

### Revocar una Clave Comprometida

Si sospechas que una clave fue expuesta:

1. **Revocar inmediatamente:**
```bash
curl -X DELETE "http://localhost:8000/api/admin/api-keys/{id}" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

2. **Crear clave de reemplazo**

3. **Actualizar la integración con la nueva clave**

---

## Resolución de Problemas

### Error 401: "API key inválida"

- Verificar que la clave comienza con `gp_`
- Verificar que se envía en el header `X-API-Key` (no en `Authorization`)
- Confirmar que no hay espacios o saltos de línea en la clave

### Error 401: "API key revocada"

- La clave fue desactivada manualmente
- Crear una nueva clave de reemplazo

### Error 429: Rate limit excedido

- Esperar a que se reinicie el contador (ventana de 1 hora)
- Solicitar cambio a tier `premium` al administrador
- Optimizar la integración para reducir el número de peticiones

---

**Última actualización:** 13 de abril de 2026
**Versión:** 1.1
**Responsable:** Seresco Geoinformación (CyC)
