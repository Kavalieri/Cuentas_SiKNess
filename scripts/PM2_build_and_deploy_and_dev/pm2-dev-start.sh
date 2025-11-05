#!/bin/bash

# CuentasSiK - Iniciar entorno DESARROLLO
# Autor: AI Assistant | Fecha: $(date '+%Y-%m-%d')

set -e

# Pre-flight checks de seguridad
[ "$USER" = "kava" ] || { echo "❌ Ejecuta como kava"; exit 1; }
case "${PM2_HOME:-/home/kava/.pm2}" in /home/kava/.pm2) ;; *) echo "❌ PM2_HOME no válido"; exit 1;; esac

echo "🟢 INICIANDO ENTORNO DESARROLLO"
echo "================================="

# Configurar directorios de logs
LOGS_DIR="/home/kava/.pm2/logs"
ARCHIVE_DIR="$LOGS_DIR/archive"

# Crear directorios si no existen
mkdir -p "$LOGS_DIR" "$ARCHIVE_DIR"

# Archivo de logs actual
DEV_OUT_LOG="$LOGS_DIR/cuentassik-dev-out.log"
DEV_ERR_LOG="$LOGS_DIR/cuentassik-dev-error.log"

# Archivar logs existentes si existen
if [ -f "$DEV_OUT_LOG" ]; then
    TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
    echo "📦 Archivando logs anteriores..."
    mv "$DEV_OUT_LOG" "$ARCHIVE_DIR/cuentassik-dev-out_$TIMESTAMP.log" 2>/dev/null || true
    mv "$DEV_ERR_LOG" "$ARCHIVE_DIR/cuentassik-dev-error_$TIMESTAMP.log" 2>/dev/null || true
fi

# Verificar si el proceso ya está ejecutándose
if pm2 list | grep -q "cuentassik-dev.*online"; then
    echo "⚠️  El proceso de desarrollo ya está ejecutándose"
    pm2 status cuentassik-dev
    exit 0
fi

# Variables de entorno cargadas automáticamente por PM2 desde .env.development.local

# Iniciar proceso PM2
echo "🚀 Iniciando proceso de desarrollo..."
pm2 start ecosystem.config.js --only cuentassik-dev

# Verificar que se inició correctamente
sleep 2
if pm2 list | grep -q "cuentassik-dev.*online"; then
    echo "✅ Proceso de desarrollo iniciado correctamente"
    echo "🌐 Disponible en: http://localhost:3001"
    echo "📋 Ver logs: pm2 logs cuentassik-dev"
    pm2 status cuentassik-dev
else
    echo "❌ Error al iniciar proceso de desarrollo"
    pm2 logs cuentassik-dev --lines 10 --nostream
    exit 1
fi
