#!/bin/bash

# ============================================================================
# migration_status.sh - Mostrar estado de migraciones en todos los entornos
# ============================================================================
# Uso: ./scripts/migrations/migration_status.sh
#
# Muestra:
#   - Migraciones aplicadas en DEV, PROD y TEST
#   - Migraciones disponibles en database/migrations/
#   - Estado de sincronización entre entornos
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
MIGRATIONS_DIR="$REPO_ROOT/database/migrations"

# Base de datos
DB_DEV="cuentassik_dev"
DB_PROD="cuentassik_prod"
DB_TEST="test_baseline_v3"

echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}📊 ESTADO DE MIGRACIONES${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Función para obtener migraciones de una base de datos
get_migrations() {
  local db_name=$1
  local label=$2
  local color=$3

  # Verificar si la base de datos existe
  if ! sudo -u postgres psql -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$db_name'" | grep -q 1; then
    echo -e "${color}${label} (${db_name}):${NC}"
    echo -e "  ${YELLOW}⚠️  Base de datos no existe${NC}"
    echo ""
    return
  fi

  # Verificar si la tabla _migrations existe
  if ! sudo -u postgres psql -d "$db_name" -tAc "SELECT 1 FROM information_schema.tables WHERE table_name='_migrations'" | grep -q 1; then
    echo -e "${color}${label} (${db_name}):${NC}"
    echo -e "  ${YELLOW}⚠️  Tabla _migrations no existe${NC}"
    echo ""
    return
  fi

  echo -e "${color}${label} (${db_name}):${NC}"

  # Obtener migraciones aplicadas
  local migrations=$(sudo -u postgres psql -d "$db_name" -tAc \
    "SELECT migration_name, applied_at, status, execution_time_ms
     FROM _migrations
     WHERE status != 'rolled_back'
     ORDER BY applied_at DESC
     LIMIT 10")

  if [ -z "$migrations" ]; then
    echo -e "  ${YELLOW}(sin migraciones aplicadas)${NC}"
  else
    echo "$migrations" | while IFS='|' read -r name applied status time; do
      # Formatear fecha
      applied_formatted=$(echo "$applied" | cut -d'.' -f1 | sed 's/T/ /g')

      # Símbolo según status
      if [ "$status" = "success" ]; then
        symbol="✅"
      elif [ "$status" = "failed" ]; then
        symbol="❌"
      else
        symbol="⏳"
      fi

      echo -e "  ${symbol} ${name}"
      echo -e "     ${CYAN}${applied_formatted}${NC} (${time}ms)"
    done
  fi

  # Contar migraciones con rollback
  local rolled_back=$(sudo -u postgres psql -d "$db_name" -tAc \
    "SELECT COUNT(*) FROM _migrations WHERE status = 'rolled_back'")

  if [ "$rolled_back" -gt 0 ]; then
    echo -e "  ${YELLOW}⏪ ${rolled_back} migración(es) revertida(s)${NC}"
  fi

  echo ""
}

# Mostrar migraciones de cada entorno
get_migrations "$DB_DEV" "🔵 DEV" "$BLUE"
get_migrations "$DB_PROD" "🔴 PROD" "$RED"
get_migrations "$DB_TEST" "🧪 TEST" "$CYAN"

# Listar migraciones disponibles
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}📁 MIGRACIONES DISPONIBLES${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ -d "$MIGRATIONS_DIR" ]; then
  count=0

  for file in "$MIGRATIONS_DIR"/*.sql; do
    if [ -f "$file" ]; then
      filename=$(basename "$file")

      # Verificar si es el baseline
      if [[ "$filename" == *"baseline"* ]]; then
        echo -e "  📦 ${GREEN}${filename}${NC} (baseline)"
      else
        echo -e "  📄 ${filename}"
      fi

      count=$((count + 1))
    fi
  done

  if [ $count -eq 0 ]; then
    echo -e "  ${YELLOW}(sin archivos .sql)${NC}"
  else
    echo ""
    echo -e "  ${BOLD}Total: ${count} archivo(s)${NC}"
  fi
else
  echo -e "  ${RED}❌ Directorio no existe: $MIGRATIONS_DIR${NC}"
fi

echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Verificar sincronización
echo -e "${BOLD}🔄 ESTADO DE SINCRONIZACIÓN${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Comparar DEV vs PROD
if sudo -u postgres psql -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_DEV'" | grep -q 1 && \
   sudo -u postgres psql -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_PROD'" | grep -q 1; then

  # Obtener últimas migraciones
  dev_last=$(sudo -u postgres psql -d "$DB_DEV" -tAc \
    "SELECT migration_name FROM _migrations WHERE status='success' ORDER BY applied_at DESC LIMIT 1" 2>/dev/null || echo "")

  prod_last=$(sudo -u postgres psql -d "$DB_PROD" -tAc \
    "SELECT migration_name FROM _migrations WHERE status='success' ORDER BY applied_at DESC LIMIT 1" 2>/dev/null || echo "")

  if [ "$dev_last" = "$prod_last" ]; then
    echo -e "  ${GREEN}✅ DEV y PROD sincronizados${NC}"
    echo -e "     Última migración: ${dev_last}"
  else
    echo -e "  ${YELLOW}⚠️  DEV y PROD desincronizados${NC}"
    echo -e "     DEV:  ${dev_last:-ninguna}"
    echo -e "     PROD: ${prod_last:-ninguna}"
    echo ""
    echo -e "  ${CYAN}💡 Ejecuta:${NC} ./scripts/migrations/diff_migrations.sh"
  fi
else
  echo -e "  ${YELLOW}⚠️  No se pudo verificar sincronización (BD no existen)${NC}"
fi

echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
