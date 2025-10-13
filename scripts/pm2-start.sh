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

echo "📦 Archivando logs anteriores..."

# Crear directorio de archivo si no existe
ARCHIVE_DIR="logs/archive"
mkdir -p "$ARCHIVE_DIR"

# Función para archivar logs con timestamp
archive_logs() {
    local app_name="$1"
    local user_prefix="$2"
    local timestamp=$(date '+%Y%m%d_%H%M%S')

    # Determinar directorio de logs según el usuario
    if [ "$ENVIRONMENT" = "prod" ]; then
        LOG_DIR="/var/www/.pm2/logs"
    else
        LOG_DIR="$HOME/.pm2/logs"
    fi

    # Archivar logs existentes si existen
    if [ -f "$LOG_DIR/${app_name}-error.log" ]; then
        ${user_prefix}mv "$LOG_DIR/${app_name}-error.log" "$ARCHIVE_DIR/${app_name}-error_${timestamp}.log"
        echo "  ✅ Archivado: ${app_name}-error_${timestamp}.log"
    fi

    if [ -f "$LOG_DIR/${app_name}-out.log" ]; then
        ${user_prefix}mv "$LOG_DIR/${app_name}-out.log" "$ARCHIVE_DIR/${app_name}-out_${timestamp}.log"
        echo "  ✅ Archivado: ${app_name}-out_${timestamp}.log"
    fi
}

# Archivar logs según el entorno
if [ "$ENVIRONMENT" = "prod" ]; then
    archive_logs "$PM2_APP" "sudo -u www-data "
else
    archive_logs "$PM2_APP" ""
fi

echo "🔧 Iniciando PM2 para $PM2_APP..."

# Para producción, ejecutar como www-data
if [ "$ENVIRONMENT" = "prod" ]; then
    sudo -u www-data --preserve-env pm2 start ecosystem.config.js --only "$PM2_APP" --update-env
else
    pm2 start ecosystem.config.js --only "$PM2_APP" --update-env
fi
