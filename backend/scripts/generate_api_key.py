#!/usr/bin/env python3
# /home/pablold/visor-gis/backend/scripts/generate_api_key.py

"""
Script para generar API keys desde la línea de comandos.

Uso:
    python scripts/generate_api_key.py \\
        --client-name "Empresa ABC" \\
        --client-email "contacto@empresaabc.com" \\
        --description "Integración sistema monitoreo" \\
        --tier premium \\
        --expires-in-days 365

Parámetros:
    --client-name: Nombre del cliente (requerido)
    --client-email: Email del cliente (requerido)
    --description: Descripción del uso (requerido)
    --tier: Tier de rate limit (basic o premium, default: basic)
    --expires-in-days: Días hasta expiración (opcional, default: sin expiración)
    --created-by: Usuario que crea la key (default: system)
"""

import sys
import os
import argparse

# Agregar el directorio padre al path para importar módulos de app
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db import get_connection
from app.api_key_utils import create_api_key, RATE_LIMIT_TIERS


def main():
    parser = argparse.ArgumentParser(
        description='Generar una nueva API key para acceso externo',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Ejemplos:

  # API key básica sin expiración
  python scripts/generate_api_key.py \\
      --client-name "Cliente Demo" \\
      --client-email "demo@example.com" \\
      --description "Testing API" \\
      --tier basic

  # API key premium con expiración en 1 año
  python scripts/generate_api_key.py \\
      --client-name "Empresa XYZ" \\
      --client-email "api@xyz.com" \\
      --description "Integración producción" \\
      --tier premium \\
      --expires-in-days 365 \\
      --created-by "admin"

Tiers disponibles:
  - basic: 100 requests/hora
  - premium: 1000 requests/hora
        """
    )
    
    parser.add_argument(
        '--client-name',
        required=True,
        help='Nombre del cliente o empresa'
    )
    
    parser.add_argument(
        '--client-email',
        required=True,
        help='Email de contacto del cliente'
    )
    
    parser.add_argument(
        '--description',
        required=True,
        help='Descripción del uso de la API key'
    )
    
    parser.add_argument(
        '--tier',
        choices=['basic', 'premium'],
        default='basic',
        help='Tier de rate limit (default: basic)'
    )
    
    parser.add_argument(
        '--expires-in-days',
        type=int,
        default=None,
        help='Días hasta expiración (default: sin expiración)'
    )
    
    parser.add_argument(
        '--created-by',
        default='system',
        help='Usuario que crea la API key (default: system)'
    )
    
    args = parser.parse_args()
    
    print("=" * 80)
    print("🔑 GENERADOR DE API KEYS - Geoportal GIS")
    print("=" * 80)
    print()
    
    # Mostrar configuración
    print("📋 Configuración:")
    print(f"   Cliente: {args.client_name}")
    print(f"   Email: {args.client_email}")
    print(f"   Descripción: {args.description}")
    print(f"   Tier: {args.tier} ({RATE_LIMIT_TIERS[args.tier]} req/hora)")
    print(f"   Expira en: {args.expires_in_days if args.expires_in_days else 'Sin expiración'} días")
    print(f"   Creado por: {args.created_by}")
    print()
    
    # Confirmar
    response = input("¿Desea continuar? (s/n): ")
    if response.lower() != 's':
        print("❌ Operación cancelada")
        return
    
    print()
    print("🔄 Conectando a la base de datos...")
    
    conn = None
    try:
        conn = get_connection()
        print("✅ Conexión establecida")
        print()
        print("🔄 Generando API key...")
        
        key_data = create_api_key(
            client_name=args.client_name,
            client_email=args.client_email,
            description=args.description,
            rate_limit_tier=args.tier,
            created_by=args.created_by,
            expires_in_days=args.expires_in_days,
            db_conn=conn
        )
        
        if not key_data:
            print("❌ Error al generar la API key")
            return
        
        print("=" * 80)
        print("✅ API KEY GENERADA EXITOSAMENTE")
        print("=" * 80)
        print()
        print("⚠️  IMPORTANTE: Guarde esta información en un lugar seguro.")
        print("   La API key completa solo se muestra UNA VEZ y no se puede recuperar.")
        print()
        print("📋 DETALLES DE LA API KEY:")
        print("-" * 80)
        print(f"ID:                {key_data['id']}")
        print(f"API Key:           {key_data['api_key']}")  # ⚠️ ÚNICA VEZ
        print(f"Prefijo:           {key_data['key_prefix']}")
        print(f"Cliente:           {key_data['client_name']}")
        print(f"Tier:              {key_data['rate_limit_tier']}")
        print(f"Límite:            {key_data['requests_per_hour']} requests/hora")
        print(f"Creada:            {key_data['created_at']}")
        if key_data.get('expires_at'):
            print(f"Expira:            {key_data['expires_at']}")
        else:
            print(f"Expira:            Sin expiración")
        print("-" * 80)
        print()
        
        print("📖 EJEMPLO DE USO:")
        print("-" * 80)
        print("# Bash/cURL:")
        print(f"curl -H 'X-API-Key: {key_data['api_key']}' \\")
        print("     https://api.geoportal.com/api/public/estaciones")
        print()
        print("# Python:")
        print("import requests")
        print()
        print("headers = {")
        print(f"    'X-API-Key': '{key_data['api_key']}'")
        print("}")
        print()
        print("response = requests.get(")
        print("    'https://api.geoportal.com/api/public/estaciones',")
        print("    headers=headers")
        print(")")
        print()
        print("# JavaScript:")
        print("const response = await fetch('https://api.geoportal.com/api/public/estaciones', {")
        print("  headers: {")
        print(f"    'X-API-Key': '{key_data['api_key']}'")
        print("  }")
        print("});")
        print("-" * 80)
        print()
        print("✅ API key registrada en la base de datos correctamente")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        if conn:
            conn.close()


if __name__ == "__main__":
    main()