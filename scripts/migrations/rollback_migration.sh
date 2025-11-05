#!/bin/bash

# ============================================================================
# rollback_migration.sh - Marcar migración como revertida
# ============================================================================
# Uso: ./scripts/migrations/rollback_migration.sh <entorno> <archivo.sql>
#
# Entornos: dev, prod, test
#
# IMPORTANTE: Este script NO ejecuta SQL de rollback automáticamente.
# Solo marca la migración como 'rolled_back' en _migrations.
# Si necesitas deshacer cambios de estructura, crea SQL manualmente.
# ============================================================================

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Configuración
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Validar argumentos
if [ $# -ne 2 ]; then
  echo -e "${RED}❌ Error: Se requieren 2 argumentos${NC}"
  echo ""
  echo -e "${BOLD}Uso:${NC}"
  echo -e "  ./scripts/migrations/rollback_migration.sh <entorno> <archivo.sql>"
  echo ""
  echo -e "${BOLD}Entornos válidos:${NC}"
  echo -e "  dev   - Desarrollo (cuentassik_dev)"
  echo -e "  prod  - Producción (cuentassik_prod)"
  echo -e "  test  - Testing (test_baseline_v3)"
  echo ""
  echo -e "${BOLD}Ejemplo:${NC}"
  echo -e "  ./scripts/migrations/rollback_migration.sh test 20251105_160000_test_feature.sql"
  exit 1
fi

ENV=$1
MIGRATION_FILE=$2

# Validar entorno
case "$ENV" in
  dev|DEV)
    DB_NAME="cuentassik_dev"
    ENV_LABEL="DEV"
    ENV_COLOR="$BLUE"
    ;;
  prod|PROD)
    DB_NAME="cuentassik_prod"
    ENV_LABEL="PROD"
    ENV_COLOR="$RED"
    ;;
  test|TEST)
    DB_NAME="test_baseline_v3"
    ENV_LABEL="TEST"
    ENV_COLOR="$CYAN"
    ;;
  *)
    echo -e "${RED}❌ Error: Entorno inválido '$ENV'${NC}"
    echo -e "   Usar: dev, prod o test"
    exit 1
    ;;
esac

# Configuración de base de datos (sin password - usa sudo -u postgres)
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}⏪ ROLLBACK DE MIGRACIÓN${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  ${BOLD}Entorno:${NC}   ${ENV_COLOR}${ENV_LABEL}${NC} ($DB_NAME)"
echo -e "  ${BOLD}Migración:${NC} $MIGRATION_FILE"
echo ""

# Verificar que la base de datos existe
if ! sudo -u postgres psql -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1; then
  echo -e "${RED}❌ Error: Base de datos '$DB_NAME' no existe${NC}"
  exit 1
fi

# Verificar que la tabla _migrations existe
if ! sudo -u postgres psql -d "$DB_NAME" -tAc "SELECT 1 FROM information_schema.tables WHERE table_name='_migrations'" | grep -q 1; then
  echo -e "${RED}❌ Error: Tabla _migrations no existe en '$DB_NAME'${NC}"
  exit 1
fi

# Verificar que la migración existe y está aplicada
MIGRATION_STATUS=$(sudo -u postgres psql -d "$DB_NAME" -tAc \
  "SELECT status FROM _migrations WHERE migration_name='$MIGRATION_FILE'" 2>/dev/null || echo "")

if [ -z "$MIGRATION_STATUS" ]; then
  echo -e "${RED}❌ Error: Migración '$MIGRATION_FILE' no encontrada en _migrations${NC}"
  echo ""
  echo -e "${CYAN}💡 Ver migraciones disponibles:${NC}"
  echo -e "   ./scripts/migrations/migration_status.sh"
  exit 1
fi

# Verificar estado actual
case "$MIGRATION_STATUS" in
  "success")
    echo -e "${GREEN}✅ Migración encontrada (estado: success)${NC}"
    echo ""
    ;;
  "rolled_back")
    echo -e "${YELLOW}⚠️  Migración ya está revertida${NC}"
    echo ""
    echo -e "${CYAN}💡 Ver estado actual:${NC}"
    echo -e "   ./scripts/migrations/migration_status.sh"
    exit 0
    ;;
  "failed")
    echo -e "${YELLOW}⚠️  Migración tiene estado 'failed'${NC}"
    echo -e "   ¿Deseas marcarla como revertida de todas formas?"
    read -p "   Continuar? (s/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[SsYy]$ ]]; then
      echo -e "${CYAN}Operación cancelada${NC}"
      exit 0
    fi
    echo ""
    ;;
  *)
    echo -e "${YELLOW}⚠️  Estado inesperado: $MIGRATION_STATUS${NC}"
    echo ""
    ;;
esac

# Confirmar rollback
echo -e "${YELLOW}⚠️  ADVERTENCIA: Este script solo marca la migración como revertida.${NC}"
echo -e "   ${BOLD}NO ejecuta SQL de rollback automáticamente.${NC}"
echo ""
echo -e "   Si necesitas deshacer cambios de estructura (DROP TABLE, etc.),"
echo -e "   debes crear y ejecutar SQL manualmente."
echo ""
read -p "¿Continuar con rollback? (s/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[SsYy]$ ]]; then
  echo -e "${CYAN}Operación cancelada${NC}"
  exit 0
fi

echo ""
echo -e "${CYAN}📝 Actualizando registro en _migrations...${NC}"

# Marcar como rolled_back
sudo -u postgres psql -d "$DB_NAME" <<-SQL
  UPDATE _migrations
  SET
    status = 'rolled_back',
    error_log = COALESCE(error_log || E'\n\n', '') ||
                'Rolled back manually at ' || NOW() || ' by ' || CURRENT_USER
  WHERE migration_name = '$MIGRATION_FILE';
SQL

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Migración marcada como revertida${NC}"
  echo ""

  # Mostrar información actualizada
  echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}📊 ESTADO ACTUALIZADO${NC}"
  echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""

  sudo -u postgres psql -d "$DB_NAME" <<-SQL
    SELECT
      migration_name as "Migración",
      status as "Estado",
      applied_at as "Aplicada",
      applied_by as "Usuario"
    FROM _migrations
    WHERE migration_name = '$MIGRATION_FILE';
SQL

  echo ""
  echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}💡 PRÓXIMOS PASOS${NC}"
  echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo -e "1. ${BOLD}Si necesitas deshacer cambios de estructura:${NC}"
  echo -e "   - Crea archivo SQL de rollback manualmente"
  echo -e "   - Ejecuta: sudo -u postgres psql -d $DB_NAME -f rollback.sql"
  echo ""
  echo -e "2. ${BOLD}Si quieres eliminar el registro completamente:${NC}"
  echo -e "   - Conecta a la BD y ejecuta:"
  echo -e "     DELETE FROM _migrations WHERE migration_name='$MIGRATION_FILE';"
  echo ""
  echo -e "3. ${BOLD}Ver estado actual:${NC}"
  echo -e "   - ./scripts/migrations/migration_status.sh"
  echo ""
  echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
else
  echo -e "${RED}❌ Error al actualizar _migrations${NC}"
  exit 1
fi
