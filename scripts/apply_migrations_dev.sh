#!/bin/bash
# apply_migrations_dev.sh - Aplica migraciones pendientes en DEV

set -e

readonly MIGRATIONS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../database/migrations" && pwd)"
readonly DEV_DIR="$MIGRATIONS_DIR/development"

echo "🔄 Aplicar Migraciones a DEV"
echo "============================"
echo ""

# Verificar que existan migraciones
if [ ! -d "$DEV_DIR" ] || [ -z "$(ls -A $DEV_DIR/*.sql 2>/dev/null)" ]; then
  echo "⚠️ No hay migraciones en development/"
  exit 0
fi

# Listar migraciones disponibles
echo "📋 Migraciones disponibles:"
ls -1 "$DEV_DIR"/*.sql
echo ""

# Aplicar cada migración
for migration in "$DEV_DIR"/*.sql; do
  filename=$(basename "$migration")
  echo "🔄 Aplicando: $filename"

  # Aplicar migración
  sudo -u postgres psql -d cuentassik_dev -f "$migration"

  if [ $? -eq 0 ]; then
    echo "✅ Aplicada: $filename"
  else
    echo "❌ Error aplicando: $filename"
    exit 1
  fi
  echo ""
done

echo "✅ Todas las migraciones aplicadas"
echo ""
echo "📊 Próximos pasos:"
echo "   1. Verificar cambios: psql -U cuentassik_user -d cuentassik_dev"
echo "   2. Probar funcionalidad afectada"
echo "   3. Si funciona: ⬆️ Promover a tested/"
