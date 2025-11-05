#!/bin/bash

# CuentasSiK - Estado general PM2
# Autor: AI Assistant | Fecha: $(date '+%Y-%m-%d')

set -e

echo "📊 ESTADO GENERAL PM2"
echo "====================="

echo ""
echo "👤 Procesos PM2 (usuario kava):"
echo "--------------------------------"
if pm2 list 2>/dev/null | grep -E "(online|stopped|errored)" > /dev/null; then
    pm2 status
else
    echo "   Sin procesos ejecutándose"
fi

echo ""
echo "📁 Logs activos:"
echo "----------------"
LOGS_DIR="/home/kava/.pm2/logs"
if [ -d "$LOGS_DIR" ]; then
    ls -lah "$LOGS_DIR"/*.log 2>/dev/null || echo "   Sin logs activos"
else
    echo "   Directorio de logs no existe"
fi

echo ""
echo "🗄️  Logs archivados:"
echo "--------------------"
ARCHIVE_DIR="$LOGS_DIR/archive"
if [ -d "$ARCHIVE_DIR" ]; then
    ARCHIVE_COUNT=$(find "$ARCHIVE_DIR" -name "*.log" -type f | wc -l)
    ARCHIVE_SIZE=$(du -sh "$ARCHIVE_DIR" 2>/dev/null | cut -f1 || echo "0")
    echo "   Archivos: $ARCHIVE_COUNT"
    echo "   Espacio: $ARCHIVE_SIZE"

    if [ $ARCHIVE_COUNT -gt 0 ]; then
        echo ""
        echo "   Últimos 5 archivos:"
        find "$ARCHIVE_DIR" -name "*.log" -type f -printf "%T@ %p\n" | sort -nr | head -5 | while read timestamp file; do
            date_formatted=$(date -d "@${timestamp%.*}" '+%Y-%m-%d %H:%M')
            filename=$(basename "$file")
            echo "     $date_formatted - $filename"
        done
    fi
else
    echo "   Sin logs archivados"
fi

echo ""
echo "🌐 URLs disponibles:"
echo "-------------------"
echo "   DEV:  http://localhost:3001"
echo "   PROD: http://localhost:3000"
echo "   TEST: http://localhost:3001/dual-flow/testing"
