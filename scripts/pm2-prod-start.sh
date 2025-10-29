#!/bin/bash

# CuentasSiK - Iniciar entorno PRODUCCIÓN
# Autor: AI Assistant | Fecha: $(date '+%Y-%m-%d')

set -e

# Pre-flight checks de seguridad
[ "$USER" = "kava" ] || { echo "❌ Ejecuta como kava"; exit 1; }
case "${PM2_HOME:-/home/kava/.pm2}" in /home/kava/.pm2) ;; *) echo "❌ PM2_HOME no válido"; exit 1;; esac

echo "🟢 INICIANDO ENTORNO PRODUCCIÓN"
echo "================================="

# Configurar directorios de logs
LOGS_DIR="/home/kava/.pm2/logs"
ARCHIVE_DIR="$LOGS_DIR/archive"

# Crear directorios si no existen
mkdir -p "$LOGS_DIR" "$ARCHIVE_DIR"

# Archivo de logs actual
PROD_OUT_LOG="$LOGS_DIR/cuentassik-prod-out.log"
PROD_ERR_LOG="$LOGS_DIR/cuentassik-prod-error.log"

# Archivar logs existentes si existen
if [ -f "$PROD_OUT_LOG" ]; then
    TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
    echo "📦 Archivando logs anteriores..."
    mv "$PROD_OUT_LOG" "$ARCHIVE_DIR/cuentassik-prod-out_$TIMESTAMP.log" 2>/dev/null || true
    mv "$PROD_ERR_LOG" "$ARCHIVE_DIR/cuentassik-prod-error_$TIMESTAMP.log" 2>/dev/null || true
fi

# Verificar si el proceso ya está ejecutándose
if pm2 list | grep -q "cuentassik-prod.*online"; then
    echo "⚠️  El proceso de producción ya está ejecutándose"
    pm2 status cuentassik-prod
    exit 0
fi

# Cargar variables de entorno explícitamente
if [ -f ".env.production.local" ]; then
    echo "📋 Cargando variables de entorno desde .env.production.local..."
    set -a
    source .env.production.local
    set +a
else
    echo "⚠️  Archivo .env.production.local no encontrado"
fi

# Verificar que el build existe
if [ ! -d ".next" ]; then
    echo "❌ Build de producción no encontrado. Ejecuta 'npm run build' primero"
    exit 1
fi

# Iniciar proceso PM2 con variables de entorno
echo "🚀 Iniciando proceso de producción..."
pm2 start ecosystem.config.js --only cuentassik-prod --update-env

# Verificar que se inició correctamente
sleep 3
if pm2 list | grep -q "cuentassik-prod.*online"; then
    echo "✅ Proceso de producción iniciado correctamente"
    echo "🌐 Disponible en: http://localhost:3000"
    echo "📋 Ver logs: pm2 logs cuentassik-prod"
    pm2 status cuentassik-prod
else
    echo "❌ Error al iniciar proceso de producción"
    pm2 logs cuentassik-prod --lines 10 --nostream
    exit 1
fi
