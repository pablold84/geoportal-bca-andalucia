# ============================================================================
# DOCKERFILE FRONTEND - Geoportal GIS
# Build multi-stage: React build + Nginx serve
# ============================================================================

# ============================================================================
# STAGE 1: BUILD
# ============================================================================
FROM node:18-alpine AS builder

WORKDIR /app

# ✅ CRÍTICO: Declarar build arg para REACT_APP_API_URL
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL

# Copiar package files
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar código fuente
COPY . .

# ✅ Verificar que la variable está disponible durante el build
RUN echo "Building with REACT_APP_API_URL=$REACT_APP_API_URL"

# Build de producción (esto "hornea" las variables de entorno en el bundle)
RUN npm run build

# ============================================================================
# STAGE 2: SERVE
# ============================================================================
FROM nginx:alpine

# Copiar configuración de nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar el build desde el stage anterior
COPY --from=builder /app/build /usr/share/nginx/html

# Exponer puerto 80
EXPOSE 80

# Comando por defecto (nginx en foreground)
CMD ["nginx", "-g", "daemon off;"]
