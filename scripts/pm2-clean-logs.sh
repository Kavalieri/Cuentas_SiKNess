#!/bin/bash

# CuentasSiK - Limpiar logs archivados PM2
# Autor: AI Assistant | Fecha: $(date '+%Y-%m-%d')
# Uso: ./pm2-clean-logs.sh [días] (default: 30)

set -e

# Parámetros
DAYS=${1:-30}
LOGS_DIR="/home/kava/.pm2/logs"
ARCHIVE_DIR="$LOGS_DIR/archive"

echo "🧹 LIMPIEZA DE LOGS PM2"
echo "======================="
echo "📅 Eliminando logs de más de $DAYS días"

# Verificar que existe el directorio
if [ ! -d "$ARCHIVE_DIR" ]; then
    echo "📁 Directorio de archivos no existe: $ARCHIVE_DIR"
    exit 0
fi

# Contar archivos antes
BEFORE_COUNT=$(find "$ARCHIVE_DIR" -name "*.log" -type f | wc -l)
BEFORE_SIZE=$(du -sh "$ARCHIVE_DIR" 2>/dev/null | cut -f1 || echo "0")

echo "📊 Estado antes de limpieza:"
echo "   - Archivos: $BEFORE_COUNT"
echo "   - Espacio: $BEFORE_SIZE"

# Eliminar archivos antiguos
find "$ARCHIVE_DIR" -name "*.log" -type f -mtime +$DAYS -delete

# Contar archivos después
AFTER_COUNT=$(find "$ARCHIVE_DIR" -name "*.log" -type f | wc -l)
AFTER_SIZE=$(du -sh "$ARCHIVE_DIR" 2>/dev/null | cut -f1 || echo "0")
DELETED=$((BEFORE_COUNT - AFTER_COUNT))

echo ""
echo "📊 Estado después de limpieza:"
echo "   - Archivos: $AFTER_COUNT"
echo "   - Espacio: $AFTER_SIZE"
echo "   - Eliminados: $DELETED archivos"

if [ $DELETED -gt 0 ]; then
    echo "✅ Limpieza completada: $DELETED archivos eliminados"
else
    echo "ℹ️  No había archivos que limpiar"
fi
