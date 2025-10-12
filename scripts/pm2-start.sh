#!/bin/bash

# Script para iniciar PM2 con variables de entorno cargadas
# Uso: ./scripts/pm2-start.sh [dev|prod]

set -e

ENVIRONMENT=${1:-dev}

echo "🚀 Iniciando CuentasSiK con PM2 (entorno: $ENVIRONMENT)"

# Determinar archivo .env basado en el entorno
if [ "$ENVIRONMENT" = "prod" ]; then
    ENV_FILE=".env.production.local"
    PM2_APP="cuentassik-prod"
elif [ "$ENVIRONMENT" = "dev" ]; then
    ENV_FILE=".env.development.local"
    PM2_APP="cuentassik-dev"
else
    echo "❌ Entorno no válido. Use 'dev' o 'prod'"
    exit 1
fi

# Verificar que existe el archivo .env
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Archivo $ENV_FILE no encontrado"
    exit 1
fi

echo "📄 Cargando variables de entorno desde $ENV_FILE"

# Cargar variables y exportarlas al entorno actual
set -a  # Exportar automáticamente todas las variables
source <(node scripts/load-env.js "$ENV_FILE" | grep -E "^[A-Z_]+=")
set +a  # Desactivar exportación automática

echo "✅ Variables de entorno cargadas correctamente"

# Verificar variables críticas
echo "� Verificando variables críticas..."
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL no está definida"
    exit 1
fi
if [ -z "$GOOGLE_CLIENT_ID" ]; then
    echo "⚠️ ADVERTENCIA: GOOGLE_CLIENT_ID no está definida (OAuth no funcionará)"
fi

echo "�🔧 Iniciando PM2 para $PM2_APP..."

# Para producción, ejecutar como www-data
if [ "$ENVIRONMENT" = "prod" ]; then
    sudo -u www-data --preserve-env pm2 start ecosystem.config.js --only "$PM2_APP" --update-env
else
    pm2 start ecosystem.config.js --only "$PM2_APP" --update-env
fi
