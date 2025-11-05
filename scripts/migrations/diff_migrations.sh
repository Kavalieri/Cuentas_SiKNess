#!/bin/bash

# ============================================================================
# diff_migrations.sh - Comparar migraciones entre entornos
# ============================================================================
# Uso: ./scripts/migrations/diff_migrations.sh
#
# Compara migraciones aplicadas en DEV, PROD y TEST
# Muestra qué migraciones están solo en cada entorno
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

# Base de datos
DB_DEV="cuentassik_dev"
DB_PROD="cuentassik_prod"
DB_TEST="test_baseline_v3"

# Archivos temporales
TMP_DEV=$(mktemp)
TMP_PROD=$(mktemp)
TMP_TEST=$(mktemp)

# Limpiar al salir
cleanup() {
  rm -f "$TMP_DEV" "$TMP_PROD" "$TMP_TEST"
}
trap cleanup EXIT

echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}🔄 DIFERENCIAS DE MIGRACIONES${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Función para obtener lista de migraciones
get_migration_list() {
  local db_name=$1
  local output_file=$2

  # Verificar si la base de datos existe
  if ! sudo -u postgres psql -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$db_name'" | grep -q 1; then
    touch "$output_file"
    return 1
  fi

  # Verificar si la tabla _migrations existe
  if ! sudo -u postgres psql -d "$db_name" -tAc "SELECT 1 FROM information_schema.tables WHERE table_name='_migrations'" | grep -q 1; then
    touch "$output_file"
    return 1
  fi

  # Obtener lista de migraciones exitosas
  sudo -u postgres psql -d "$db_name" -tAc \
    "SELECT migration_name FROM _migrations WHERE status='success' ORDER BY migration_name" \
    > "$output_file" 2>/dev/null || touch "$output_file"

  return 0
}

# Obtener listas de migraciones
echo -e "${CYAN}📥 Consultando bases de datos...${NC}"
echo ""

DEV_EXISTS=false
PROD_EXISTS=false
TEST_EXISTS=false

if get_migration_list "$DB_DEV" "$TMP_DEV"; then
  DEV_EXISTS=true
  dev_count=$(wc -l < "$TMP_DEV" | tr -d ' ')
  echo -e "  ${BLUE}🔵 DEV:${NC}  $dev_count migración(es)"
fi

if get_migration_list "$DB_PROD" "$TMP_PROD"; then
  PROD_EXISTS=true
  prod_count=$(wc -l < "$TMP_PROD" | tr -d ' ')
  echo -e "  ${RED}🔴 PROD:${NC} $prod_count migración(es)"
fi

if get_migration_list "$DB_TEST" "$TMP_TEST"; then
  TEST_EXISTS=true
  test_count=$(wc -l < "$TMP_TEST" | tr -d ' ')
  echo -e "  ${CYAN}🧪 TEST:${NC} $test_count migración(es)"
fi

echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Comparar DEV vs PROD
if [ "$DEV_EXISTS" = true ] && [ "$PROD_EXISTS" = true ]; then
  echo ""
  echo -e "${BOLD}🔵 → 🔴 DEV vs PROD${NC}"
  echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""

  # Migraciones solo en DEV (listas para PROD)
  only_dev=$(comm -23 <(sort "$TMP_DEV") <(sort "$TMP_PROD"))

  if [ -n "$only_dev" ]; then
    echo -e "${GREEN}✅ SOLO en DEV (listas para desplegar a PROD):${NC}"
    echo "$only_dev" | while read -r migration; do
      echo -e "  📄 $migration"
    done
  else
    echo -e "${GREEN}✅ Sin migraciones pendientes para PROD${NC}"
  fi

  echo ""

  # Migraciones solo en PROD (inconsistencia)
  only_prod=$(comm -13 <(sort "$TMP_DEV") <(sort "$TMP_PROD"))

  if [ -n "$only_prod" ]; then
    echo -e "${RED}⚠️  SOLO en PROD (inconsistencia - aplicar a DEV):${NC}"
    echo "$only_prod" | while read -r migration; do
      echo -e "  📄 $migration"
    done
  else
    echo -e "${GREEN}✅ Sin inconsistencias (PROD no tiene migraciones extras)${NC}"
  fi

  echo ""

  # Migraciones en ambos
  both=$(comm -12 <(sort "$TMP_DEV") <(sort "$TMP_PROD"))

  if [ -n "$both" ]; then
    both_count=$(echo "$both" | wc -l | tr -d ' ')
    echo -e "${CYAN}🔄 Migraciones en AMBOS entornos: ${both_count}${NC}"
  fi

elif [ "$DEV_EXISTS" = false ] && [ "$PROD_EXISTS" = false ]; then
  echo ""
  echo -e "${YELLOW}⚠️  Ni DEV ni PROD existen o no tienen tabla _migrations${NC}"
elif [ "$DEV_EXISTS" = false ]; then
  echo ""
  echo -e "${YELLOW}⚠️  DEV no existe o no tiene tabla _migrations${NC}"
elif [ "$PROD_EXISTS" = false ]; then
  echo ""
  echo -e "${YELLOW}⚠️  PROD no existe o no tiene tabla _migrations${NC}"
fi

# Comparar TEST vs DEV/PROD
if [ "$TEST_EXISTS" = true ]; then
  echo ""
  echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}🧪 TEST${NC}"
  echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""

  # Migraciones solo en TEST (experimentales)
  if [ "$DEV_EXISTS" = true ]; then
    only_test=$(comm -23 <(sort "$TMP_TEST") <(sort "$TMP_DEV"))

    if [ -n "$only_test" ]; then
      echo -e "${YELLOW}🧪 SOLO en TEST (experimentales):${NC}"
      echo "$only_test" | while read -r migration; do
        echo -e "  📄 $migration"
      done
      echo ""
      echo -e "  ${CYAN}💡 Estas son migraciones de prueba no aplicadas a DEV/PROD${NC}"
    else
      echo -e "${GREEN}✅ TEST sincronizado con DEV${NC}"
    fi
  else
    echo -e "${YELLOW}⚠️  No se puede comparar (DEV no existe)${NC}"
  fi
fi

echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Recomendaciones
echo ""
echo -e "${BOLD}💡 RECOMENDACIONES${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ "$DEV_EXISTS" = true ] && [ "$PROD_EXISTS" = true ]; then
  only_dev=$(comm -23 <(sort "$TMP_DEV") <(sort "$TMP_PROD"))
  only_prod=$(comm -13 <(sort "$TMP_DEV") <(sort "$TMP_PROD"))

  if [ -n "$only_dev" ]; then
    echo -e "  ${GREEN}➜${NC} Hay migraciones listas para PROD:"
    echo -e "     ${CYAN}./scripts/migrations/apply_migration.sh prod <archivo.sql>${NC}"
    echo ""
  fi

  if [ -n "$only_prod" ]; then
    echo -e "  ${YELLOW}➜${NC} Hay inconsistencias (PROD tiene migraciones que DEV no):"
    echo -e "     Revisar y aplicar manualmente a DEV si es necesario"
    echo ""
  fi

  if [ -z "$only_dev" ] && [ -z "$only_prod" ]; then
    echo -e "  ${GREEN}✅ DEV y PROD están sincronizados${NC}"
    echo ""
  fi
else
  echo -e "  ${YELLOW}⚠️  No se puede dar recomendaciones (bases de datos no disponibles)${NC}"
  echo ""
fi

echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
