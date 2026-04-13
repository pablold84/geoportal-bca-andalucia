# Usa la imagen base de Python 3.11 slim
FROM python:3.11-slim

# Crear directorio de la app
WORKDIR /app

# Copiar requerimientos
COPY requirements.txt .

# Instalar dependencias desde requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Instalar python-jose para JWT
RUN pip install python-jose

# Copiar el código de la app
COPY ./app /app/app

# Exponer puerto
EXPOSE 8000

# Comando para correr FastAPI
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
