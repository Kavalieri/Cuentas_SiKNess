#!/bin/bash

# Script para limpiar logs archivados antiguos de PM2
# Uso: ./scripts/pm2-clean-logs.sh [days]

set -e

DAYS_TO_KEEP=${1:-7}  # Por defecto, mantener logs de 7 días

echo "🧹 Limpiando logs archivados más antiguos que $DAYS_TO_KEEP días..."

ARCHIVE_DIR="logs/archive"

if [ ! -d "$ARCHIVE_DIR" ]; then
    echo "📁 Directorio $ARCHIVE_DIR no existe, creándolo..."
    mkdir -p "$ARCHIVE_DIR"
    exit 0
fi

# Contar archivos antes de la limpieza
FILES_BEFORE=$(find "$ARCHIVE_DIR" -name "*.log" | wc -l)
echo "📊 Archivos de logs encontrados: $FILES_BEFORE"

# Eliminar archivos más antiguos que N días
DELETED_COUNT=0
while IFS= read -r -d '' file; do
    echo "  🗑️  Eliminando: $(basename "$file")"
    rm "$file"
    ((DELETED_COUNT++))
done < <(find "$ARCHIVE_DIR" -name "*.log" -type f -mtime +$DAYS_TO_KEEP -print0)

echo "✅ Limpieza completada:"
echo "   - Archivos eliminados: $DELETED_COUNT"
echo "   - Archivos restantes: $((FILES_BEFORE - DELETED_COUNT))"

# Mostrar estadísticas del directorio
if [ $((FILES_BEFORE - DELETED_COUNT)) -gt 0 ]; then
    echo ""
    echo "📋 Archivos restantes por aplicación:"
    find "$ARCHIVE_DIR" -name "*.log" -type f -printf '%f\n' | \
        sed 's/_[0-9]*\.log$//' | \
        sort | uniq -c | \
        awk '{printf "   - %-20s: %d archivos\n", $2, $1}'

    echo ""
    echo "🕒 Logs más antiguos y más recientes:"
    OLDEST=$(find "$ARCHIVE_DIR" -name "*.log" -type f -printf '%T@ %f\n' | sort -n | head -1 | awk '{print $2}')
    NEWEST=$(find "$ARCHIVE_DIR" -name "*.log" -type f -printf '%T@ %f\n' | sort -n | tail -1 | awk '{print $2}')

    if [ -n "$OLDEST" ]; then
        echo "   - Más antiguo: $OLDEST"
    fi
    if [ -n "$NEWEST" ]; then
        echo "   - Más reciente: $NEWEST"
    fi
fi

echo ""
echo "💡 Tip: Para cambiar la retención, usa: ./scripts/pm2-clean-logs.sh <días>"
echo "    Ejemplo: ./scripts/pm2-clean-logs.sh 30  # Mantener 30 días"
