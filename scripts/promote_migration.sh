#!/bin/bash
# promote_migration.sh - Mueve migración validada de development/ a tested/

set -e

readonly MIGRATIONS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../database/migrations" && pwd)"
readonly DEV_DIR="$MIGRATIONS_DIR/development"
readonly TESTED_DIR="$MIGRATIONS_DIR/tested"

echo "⬆️ Promover Migración (dev → tested)"
echo "===================================="
echo ""

# Verificar que existan migraciones
if [ ! -d "$DEV_DIR" ] || [ -z "$(ls -A $DEV_DIR/*.sql 2>/dev/null)" ]; then
  echo "⚠️ No hay migraciones en development/"
  exit 0
fi

# Listar migraciones disponibles
echo "📋 Migraciones en development/:"
select migration in "$DEV_DIR"/*.sql; do
  if [ -n "$migration" ]; then
    filename=$(basename "$migration")

    echo ""
    echo "📄 Migración seleccionada: $filename"
    echo ""
    echo "¿Seguro que está validada y lista para PROD? (yes/no)"
    read -r confirm

    if [ "$confirm" = "yes" ]; then
      mkdir -p "$TESTED_DIR"
      mv "$migration" "$TESTED_DIR/"
      echo "✅ Movida a tested/$filename"
      echo ""
      echo "📊 Próximos pasos:"
      echo "   1. Commit: git add database/migrations/tested/$filename"
      echo "   2. Al hacer deploy, se aplicará automáticamente en PROD"
    else
      echo "❌ Operación cancelada"
    fi
    break
  fi
done
