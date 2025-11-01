#!/bin/bash
# Script: Aplicar migración al sistema v2.1.0+
# Fecha: 31 Octubre 2025 (Actualizado: 1 Noviembre 2025)
# Fase 10/12 del Issue #6
#
# Uso: ./apply_migration.sh <entorno> <archivo_migracion>
#
# Ejemplos:
#   ./apply_migration.sh dev 20251101_120000_add_new_feature.sql
#     → Busca en: database/migrations/development/
#
#   ./apply_migration.sh prod 20251101_120000_add_new_feature.sql
#     → Busca en: database/migrations/tested/ (migraciones probadas)
#
# Workflow recomendado:
#   1. Crear migración en development/
#   2. Aplicar a DEV con: ./apply_migration.sh dev <archivo>
#   3. Probar en DEV
#   4. Mover a tested/: mv database/migrations/development/<archivo> database/migrations/tested/
#   5. Aplicar a PROD con: ./apply_migration.sh prod <archivo>

set -e

# Validar argumentos
if [ "$#" -ne 2 ]; then
  echo "❌ Error: Argumentos incorrectos"
  echo ""
  echo "Uso: $0 <entorno> <archivo_migracion>"
  echo ""
  echo "Entornos válidos:"
  echo "  - dev   : Aplica a cuentassik_dev (desde development/)"
  echo "  - prod  : Aplica a cuentassik_prod (desde tested/)"
  echo "  - both  : Aplica a ambos (desde development/)"
  echo ""
  echo "Ejemplo:"
  echo "  $0 dev 20251101_120000_add_new_feature.sql"
  echo "  $0 prod 20251101_120000_add_new_feature.sql"
  exit 1
fi

ENV="$1"
MIGRATION_FILE="$2"
REPO_ROOT="/home/kava/workspace/proyectos/CuentasSiK/repo"

# Validar entorno
if [[ ! "$ENV" =~ ^(dev|prod|both)$ ]]; then
  echo "❌ Error: Entorno inválido '$ENV'"
  echo "   Debe ser: dev, prod, o both"
  exit 1
fi

# Determinar directorio de migraciones según entorno
# DEV: usa development/ (trabajo activo)
# PROD: usa tested/ (migraciones probadas en DEV)
if [ "$ENV" = "prod" ]; then
  MIGRATION_DIR="tested"
else
  MIGRATION_DIR="development"
fi

MIGRATION_PATH="$REPO_ROOT/database/migrations/$MIGRATION_DIR/$MIGRATION_FILE"

# Validar archivo existe
if [ ! -f "$MIGRATION_PATH" ]; then
  echo "❌ Error: Archivo no encontrado: $MIGRATION_PATH"
  echo ""
  if [ "$ENV" = "prod" ]; then
    echo "💡 Para PROD, el archivo debe estar en: database/migrations/tested/"
    echo "   Asegúrate de haber movido la migración desde development/ a tested/"
  else
    echo "💡 Para DEV, el archivo debe estar en: database/migrations/development/"
  fi
  exit 1
fi

# Función para aplicar migración
apply_to_database() {
  local DB_NAME=$1
  local ENV_NAME=$2

  echo ""
  echo "🔄 Aplicando a $ENV_NAME ($DB_NAME)..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # Calcular checksum
  CHECKSUM=$(md5sum "$MIGRATION_PATH" | awk '{print $1}')

  # Verificar si ya está aplicada EXITOSAMENTE
  ALREADY_APPLIED=$(sudo -u postgres psql -d "$DB_NAME" -t -A << EOF
SELECT COUNT(*) FROM _migrations
WHERE migration_name = '$MIGRATION_FILE'
  AND status = 'success';
EOF
  )

  if [ "$ALREADY_APPLIED" -gt "0" ]; then
    echo "⏭️  Ya aplicada exitosamente en $ENV_NAME - Saltando"
    return 0
  fi

  # Verificar si hubo intentos fallidos previos
  FAILED_ATTEMPTS=$(sudo -u postgres psql -d "$DB_NAME" -t -A << EOF
SELECT COUNT(*) FROM _migrations
WHERE migration_name = '$MIGRATION_FILE'
  AND status = 'failed';
EOF
  )

  if [ "$FAILED_ATTEMPTS" -gt "0" ]; then
    echo "⚠️  Detectados $FAILED_ATTEMPTS intento(s) fallido(s) previo(s)"
    echo "   Reintentando aplicación..."
  fi

  # Registrar inicio
  START_TIME=$(date +%s%3N)

  # Copiar migración a /tmp para que postgres pueda leerla (permisos)
  TMP_MIGRATION="/tmp/migration_$(basename "$MIGRATION_FILE")"
  echo "📋 Copiando a ubicación temporal..."
  sudo cp "$MIGRATION_PATH" "$TMP_MIGRATION"
  sudo chmod 644 "$TMP_MIGRATION"

  # Aplicar migración
  echo "📝 Ejecutando SQL..."
  if sudo -u postgres psql -d "$DB_NAME" -v ON_ERROR_STOP=1 << EOF > /tmp/migration_output.log 2>&1
-- Cambiar a owner para DDL
SET ROLE cuentassik_owner;

-- Ejecutar migración
\i $TMP_MIGRATION
EOF
  then
    STATUS="success"
    END_TIME=$(date +%s%3N)
    EXECUTION_TIME=$((END_TIME - START_TIME))
    OUTPUT_LOG=$(cat /tmp/migration_output.log)
    ERROR_LOG=""

    # Registrar en _migrations (sin silenciar errores para debugging)
    if ! sudo -u postgres psql -d "$DB_NAME" << EOF
INSERT INTO _migrations (
  migration_name,
  applied_at,
  applied_by,
  execution_time_ms,
  status,
  output_log,
  checksum,
  description
)
VALUES (
  '$MIGRATION_FILE',
  CURRENT_TIMESTAMP,
  CURRENT_USER,
  $EXECUTION_TIME,
  '$STATUS',
  \$\$$(echo "$OUTPUT_LOG" | head -100)\$\$,
  '$CHECKSUM',
  'Aplicada automáticamente'
);
EOF
    then
      echo "⚠️  Advertencia: Migración aplicada pero registro en _migrations falló"
      echo "   La estructura está actualizada pero el tracking puede estar incompleto"
    fi

    echo "✅ Aplicada exitosamente en $ENV_NAME (${EXECUTION_TIME}ms)"

    # Limpiar archivo temporal
    sudo rm -f "$TMP_MIGRATION"

    # ✨ NUEVO: Auto-regenerar types TypeScript
    echo ""
    echo "🔄 Regenerando types TypeScript desde esquema PostgreSQL..."

    if [ "$ENV_NAME" == "DEV" ]; then
      if npm run types:generate:dev --silent 2>&1 | grep -q "Introspected"; then
        echo "✅ Types regenerados exitosamente"
      else
        echo "⚠️  Warning: Error regenerando types (no crítico)"
        echo "   Puedes hacerlo manualmente: npm run types:generate:dev"
      fi
    else
      if npm run types:generate:prod --silent 2>&1 | grep -q "Introspected"; then
        echo "✅ Types regenerados exitosamente"
      else
        echo "⚠️  Warning: Error regenerando types (no crítico)"
        echo "   Puedes hacerlo manualmente: npm run types:generate:prod"
      fi
    fi

  else
    STATUS="failed"
    END_TIME=$(date +%s%3N)
    EXECUTION_TIME=$((END_TIME - START_TIME))
    OUTPUT_LOG=""
    ERROR_LOG=$(cat /tmp/migration_output.log)

    echo "❌ Error al aplicar en $ENV_NAME:"
    cat /tmp/migration_output.log

    # Registrar error (sin silenciar para debugging)
    if ! sudo -u postgres psql -d "$DB_NAME" << EOF
INSERT INTO _migrations (
  migration_name,
  applied_at,
  applied_by,
  execution_time_ms,
  status,
  error_log,
  checksum
)
VALUES (
  '$MIGRATION_FILE',
  CURRENT_TIMESTAMP,
  CURRENT_USER,
  $EXECUTION_TIME,
  '$STATUS',
  \$\$$(echo "$ERROR_LOG" | head -100)\$\$,
  '$CHECKSUM'
);
EOF
    then
      echo "⚠️  Advertencia: No se pudo registrar el error en _migrations"
    fi

    # Limpiar archivo temporal
    sudo rm -f "$TMP_MIGRATION"
    return 1
  fi

  rm -f /tmp/migration_output.log
}

# Ejecutar
echo "=========================================="
echo "🚀 Aplicador de Migraciones v2.1.0"
echo "=========================================="
echo ""
echo "📄 Archivo: $MIGRATION_FILE"
echo "🎯 Entorno: $ENV"

if [ "$ENV" == "dev" ] || [ "$ENV" == "both" ]; then
  apply_to_database "cuentassik_dev" "DEV"
fi

if [ "$ENV" == "prod" ] || [ "$ENV" == "both" ]; then
  apply_to_database "cuentassik_prod" "PROD"
fi

echo ""
echo "=========================================="
echo "✅ Proceso completado"
echo "=========================================="
echo ""
echo "📝 Recuerda hacer commit de los cambios:"
echo "   git add database/migrations/ types/database.generated.ts"
echo "   git commit -m 'feat(db): aplicar migración $MIGRATION_FILE'"
echo ""
