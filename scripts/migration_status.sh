#!/bin/bash
# Script: Ver estado de migraciones
# Fecha: 31 Octubre 2025
# Fase 10/12 del Issue #6

set -e

REPO_ROOT="/home/kava/workspace/proyectos/CuentasSiK/repo"

echo "=========================================="
echo "📊 Estado de Migraciones v2.1.0"
echo "=========================================="
echo ""

# Contar archivos pendientes
DEVELOPMENT=$(find "$REPO_ROOT/database/migrations/development" -name "*.sql" 2>/dev/null | wc -l)
TESTED=$(find "$REPO_ROOT/database/migrations/tested" -name "*.sql" 2>/dev/null | wc -l)

echo "📁 ARCHIVOS:"
echo "  • development/: $DEVELOPMENT migraciones"
echo "  • tested/:      $TESTED migraciones"
echo ""

# Migraciones en DEV
echo "🔵 DESARROLLO (cuentassik_dev):"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
sudo -u postgres psql -d cuentassik_dev << 'EOF'
SELECT
  migration_name,
  TO_CHAR(applied_at, 'YYYY-MM-DD HH24:MI') as aplicada,
  status,
  COALESCE(execution_time_ms::text || 'ms', 'N/A') as tiempo
FROM _migrations
ORDER BY applied_at DESC
LIMIT 10;
EOF

TOTAL_DEV=$(sudo -u postgres psql -d cuentassik_dev -t -A -c "SELECT COUNT(*) FROM _migrations;")
echo ""
echo "  Total aplicadas en DEV: $TOTAL_DEV"
echo ""

# Migraciones en PROD
echo "🔴 PRODUCCIÓN (cuentassik_prod):"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
sudo -u postgres psql -d cuentassik_prod << 'EOF'
SELECT
  migration_name,
  TO_CHAR(applied_at, 'YYYY-MM-DD HH24:MI') as aplicada,
  status,
  COALESCE(execution_time_ms::text || 'ms', 'N/A') as tiempo
FROM _migrations
ORDER BY applied_at DESC
LIMIT 10;
EOF

TOTAL_PROD=$(sudo -u postgres psql -d cuentassik_prod -t -A -c "SELECT COUNT(*) FROM _migrations;")
echo ""
echo "  Total aplicadas en PROD: $TOTAL_PROD"
echo ""

# Detectar diferencias
echo "🔍 SINCRONIZACIÓN:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$TOTAL_DEV" -eq "$TOTAL_PROD" ]; then
  echo "✅ DEV y PROD sincronizados ($TOTAL_DEV migraciones)"
else
  echo "⚠️  Diferencias: DEV tiene $TOTAL_DEV, PROD tiene $TOTAL_PROD"
fiecho ""
echo "=========================================="
