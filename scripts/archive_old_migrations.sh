#!/bin/bash
# Script: Archivar migraciones pre-v2.1.0
# Fecha: 31 Octubre 2025
# Fase 9/12 del Issue #6

set -e

REPO_ROOT="/home/kava/workspace/proyectos/CuentasSiK/repo"
APPLIED_DIR="$REPO_ROOT/database/migrations/applied"
ARCHIVE_DIR="$REPO_ROOT/database/migrations/archive/pre_v2.1.0"

echo "=========================================="
echo "📦 Archivando migraciones pre-v2.1.0"
echo "=========================================="
echo ""

# Crear directorio de archivo
mkdir -p "$ARCHIVE_DIR"

# Contar migraciones a archivar
BASELINE="20251101_000000_baseline_v2.1.0.sql"
TO_ARCHIVE=$(find "$APPLIED_DIR" -name "*.sql" ! -name "$BASELINE" 2>/dev/null | wc -l)

if [ "$TO_ARCHIVE" -eq "0" ]; then
  echo "ℹ️  No hay migraciones para archivar (solo baseline presente)"
  echo ""
  ls -lh "$APPLIED_DIR"/*.sql 2>/dev/null || echo "  (directorio vacío)"
  exit 0
fi

echo "📝 Encontradas $TO_ARCHIVE migraciones para archivar"
echo ""

# Mover todas las migraciones excepto el baseline
echo "🔄 Moviendo archivos..."
find "$APPLIED_DIR" -name "*.sql" ! -name "$BASELINE" -exec mv {} "$ARCHIVE_DIR/" \; 2>/dev/null || true

# Contar archivados
ARCHIVED=$(ls -1 "$ARCHIVE_DIR"/*.sql 2>/dev/null | wc -l)

echo ""
echo "=========================================="
echo "✅ ARCHIVADO COMPLETADO"
echo "=========================================="
echo ""
echo "📊 RESUMEN:"
echo "  • Archivados: $ARCHIVED archivos"
echo "  • Ubicación: $ARCHIVE_DIR"
echo "  • Baseline activo: $APPLIED_DIR/$BASELINE"
echo ""

# Mostrar estructura final
echo "📂 Estructura final:"
echo ""
echo "  applied/"
ls -lh "$APPLIED_DIR"/*.sql 2>/dev/null || echo "    (vacío)"
echo ""
echo "  archive/pre_v2.1.0/"
ls -1 "$ARCHIVE_DIR"/*.sql 2>/dev/null | head -10
TOTAL_ARCHIVE=$(ls -1 "$ARCHIVE_DIR"/*.sql 2>/dev/null | wc -l)
if [ "$TOTAL_ARCHIVE" -gt "10" ]; then
  echo "    ... y $((TOTAL_ARCHIVE - 10)) más"
fi
echo ""
