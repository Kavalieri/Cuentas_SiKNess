#!/bin/bash
# Script: Crear nueva migración
# Fecha: 31 Octubre 2025
# Fase 10/12 del Issue #6
#
# Uso: ./create_migration.sh <descripcion>
# Ejemplo: ./create_migration.sh "add refund system tables"

set -e

if [ "$#" -lt 1 ]; then
  echo "❌ Error: Falta descripción"
  echo ""
  echo "Uso: $0 <descripcion>"
  echo ""
  echo "Ejemplo:"
  echo "  $0 'add refund system tables'"
  echo "  $0 'fix transaction constraints'"
  exit 1
fi

DESCRIPTION="$*"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
# Convertir descripción a snake_case
SLUG=$(echo "$DESCRIPTION" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/_/g' | sed 's/__*/_/g' | sed 's/^_//;s/_$//')
FILENAME="${TIMESTAMP}_${SLUG}.sql"
REPO_ROOT="/home/kava/workspace/proyectos/CuentasSiK/repo"
FILEPATH="$REPO_ROOT/database/migrations/development/$FILENAME"

echo "=========================================="
echo "📝 Creador de Migraciones v2.1.0"
echo "=========================================="
echo ""
echo "📄 Descripción: $DESCRIPTION"
echo "🕐 Timestamp: $TIMESTAMP"
echo "📁 Archivo: $FILENAME"
echo ""

# Crear archivo con plantilla
cat > "$FILEPATH" << EOF
-- Migración: $DESCRIPTION
-- Fecha: $(date '+%d %B %Y')
-- Autor: $(whoami)
-- Sistema: v2.1.0+

-- ========================================
-- DESARROLLO (cuentassik_dev)
-- ========================================
\c cuentassik_dev

-- TODO: Agregar cambios de estructura aquí
-- Ejemplo:
-- CREATE TABLE IF NOT EXISTS nueva_tabla (
--   id SERIAL PRIMARY KEY,
--   nombre VARCHAR(255) NOT NULL,
--   created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
-- );

-- ALTER TABLE nueva_tabla OWNER TO cuentassik_owner;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON nueva_tabla TO cuentassik_user;

\echo ''
\echo '✅ DEV: Cambios aplicados'

-- ========================================
-- PRODUCCIÓN (cuentassik_prod)
-- ========================================
\c cuentassik_prod

-- TODO: Replicar los mismos cambios aquí
-- (copiar el bloque de arriba)

\echo ''
\echo '✅ PROD: Cambios aplicados'

-- ========================================
-- VERIFICACIÓN
-- ========================================
\c cuentassik_dev
\echo ''
\echo '=== VERIFICACIÓN DEV ==='
-- SELECT COUNT(*) FROM nueva_tabla;

\c cuentassik_prod
\echo ''
\echo '=== VERIFICACIÓN PROD ==='
-- SELECT COUNT(*) FROM nueva_tabla;

\echo ''
\echo '✅ Migración completada'
EOF

echo "✅ Archivo creado: $FILEPATH"
echo ""
echo "📝 Próximos pasos:"
echo "  1. Editar el archivo SQL con tus cambios"
echo "  2. Aplicar a DEV: ./scripts/apply_migration.sh dev $FILENAME"
echo "  3. Probar en DEV"
echo "  4. Si todo funciona, aplicar a PROD:"
echo "     ./scripts/apply_migration.sh prod $FILENAME"
echo ""
echo "💡 Tip: Las migraciones deben ser solo DDL (estructura)"
echo "        No incluir INSERT/UPDATE/DELETE de datos"
echo ""
