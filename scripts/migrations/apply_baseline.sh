#!/bin/bash
# Script: Aplicar baseline v3.0.0 a base de datos nueva
# Fecha: 5 Noviembre 2025
# Uso: ./apply_baseline.sh <nombre_base_datos>
#
# Este script:
# 1. Crea la base de datos vacía (si no existe)
# 2. Aplica el baseline v3.0.0
# 3. Registra en _migrations
# 4. Verifica la estructura

set -e

if [ "$#" -ne 1 ]; then
  echo "❌ Error: Falta el nombre de la base de datos"
  echo ""
  echo "Uso: $0 <nombre_base_datos>"
  echo ""
  echo "Ejemplo:"
  echo "  $0 test_baseline_v3"
  echo "  $0 cuentassik_new"
  exit 1
fi

DB_NAME="$1"
REPO_ROOT="/home/kava/workspace/proyectos/CuentasSiK/repo"
BASELINE_FILE="$REPO_ROOT/database/migrations/20251105_150000_baseline_v3.0.0_complete.sql"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 APLICAR BASELINE v3.0.0"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Base de datos: $DB_NAME"
echo "Baseline: 20251105_150000_baseline_v3.0.0_complete.sql"
echo ""

# Verificar que el baseline existe
if [ ! -f "$BASELINE_FILE" ]; then
  echo "❌ Error: Baseline no encontrado en: $BASELINE_FILE"
  exit 1
fi

# Paso 1: Crear base de datos si no existe
echo "📋 PASO 1: Preparar base de datos..."
DB_EXISTS=$(sudo -u postgres psql -t -A -c "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME';" 2>/dev/null || echo "0")

if [ "$DB_EXISTS" = "1" ]; then
  echo "⚠️  Base de datos '$DB_NAME' ya existe"
  read -p "¿Deseas eliminarla y recrearla? (yes/no): " CONFIRM
  if [ "$CONFIRM" != "yes" ]; then
    echo "❌ Operación cancelada"
    exit 1
  fi

  echo "🗑️  Eliminando base de datos existente..."
  sudo -u postgres psql -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$DB_NAME' AND pid <> pg_backend_pid();" > /dev/null
  sudo -u postgres dropdb "$DB_NAME"
fi

echo "🆕 Creando base de datos '$DB_NAME'..."
sudo -u postgres createdb --owner=cuentassik_owner "$DB_NAME"
echo "✅ Base de datos creada"

# Paso 2: Aplicar baseline
echo ""
echo "📥 PASO 2: Aplicar baseline v3.0.0..."

# Copiar a /tmp para permisos
TMP_BASELINE="/tmp/baseline_v3.0.0_$(date +%s).sql"
sudo cp "$BASELINE_FILE" "$TMP_BASELINE"
sudo chmod 644 "$TMP_BASELINE"

START_TIME=$(date +%s%3N)

# Aplicar con output detallado
if sudo -u postgres psql -d "$DB_NAME" -v ON_ERROR_STOP=1 -f "$TMP_BASELINE" > /tmp/baseline_output.log 2>&1; then
  END_TIME=$(date +%s%3N)
  EXECUTION_TIME=$((END_TIME - START_TIME))

  echo "✅ Baseline aplicado exitosamente (${EXECUTION_TIME}ms)"

  # Paso 3: Registrar en _migrations
  echo ""
  echo "📝 PASO 3: Registrar en tabla _migrations..."

  CHECKSUM=$(md5sum "$BASELINE_FILE" | awk '{print $1}')
  OUTPUT_LOG=$(cat /tmp/baseline_output.log)

  sudo -u postgres psql -d "$DB_NAME" << EOF > /dev/null
INSERT INTO _migrations (
  migration_name,
  applied_at,
  applied_by,
  execution_time_ms,
  status,
  output_log,
  checksum,
  description
) VALUES (
  '20251105_150000_baseline_v3.0.0_complete.sql',
  CURRENT_TIMESTAMP,
  CURRENT_USER,
  $EXECUTION_TIME,
  'success',
  '$OUTPUT_LOG',
  '$CHECKSUM',
  'Baseline v3.0.0 - Esquema completo desde PROD post Issue #47'
);
EOF

  echo "✅ Registrado en _migrations"

else
  echo "❌ Error aplicando baseline"
  echo ""
  echo "Últimas 30 líneas del error:"
  tail -30 /tmp/baseline_output.log
  sudo rm -f "$TMP_BASELINE"
  exit 1
fi

# Limpiar temporal
sudo rm -f "$TMP_BASELINE"
rm -f /tmp/baseline_output.log

# Paso 4: Verificar estructura
echo ""
echo "🔍 PASO 4: Verificar estructura..."

TABLES_COUNT=$(sudo -u postgres psql -d "$DB_NAME" -t -A -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';")
FUNCTIONS_COUNT=$(sudo -u postgres psql -d "$DB_NAME" -t -A -c "SELECT COUNT(*) FROM pg_proc WHERE pronamespace = 'public'::regnamespace;")
TRIGGERS_COUNT=$(sudo -u postgres psql -d "$DB_NAME" -t -A -c "SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema='public';")

echo "  📊 Tablas: $TABLES_COUNT"
echo "  ⚙️  Funciones: $FUNCTIONS_COUNT"
echo "  🔔 Triggers: $TRIGGERS_COUNT"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ BASELINE v3.0.0 APLICADO EXITOSAMENTE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎯 Siguiente paso: Crear household de prueba"
echo ""
echo "   psql -h 127.0.0.1 -U cuentassik_user -d $DB_NAME"
echo "   INSERT INTO households (id, name, created_at, updated_at)"
echo "   VALUES (gen_random_uuid(), 'Test Baseline v3.0.0', NOW(), NOW());"
echo ""
