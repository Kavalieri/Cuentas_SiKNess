#!/usr/bin/env bash
# ============================================
# Script: reset_migrations_to_baseline_v3.sh
# Descripción: Limpia tabla _migrations y establece baseline v3.0.0
# Versión: 1.0.0
# Fecha: 2025-11-05
# Issue: #53
# ============================================

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Función de limpieza
cleanup() {
  if [ -n "$TEMP_FILE" ] && [ -f "$TEMP_FILE" ]; then
    rm -f "$TEMP_FILE"
  fi
}
trap cleanup EXIT

echo -e "${BOLD}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║  RESET MIGRACIONES A BASELINE v3.0.0                      ║${NC}"
echo -e "${BOLD}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Validar argumento
if [ "$#" -ne 1 ]; then
  echo -e "${RED}❌ Error: Se requiere especificar el entorno${NC}"
  echo ""
  echo "Uso: $0 <entorno>"
  echo "  entorno: dev | prod | both"
  echo ""
  exit 1
fi

ENV="$1"

if [[ ! "$ENV" =~ ^(dev|prod|both)$ ]]; then
  echo -e "${RED}❌ Error: Entorno inválido: $ENV${NC}"
  echo "Debe ser: dev, prod, o both"
  exit 1
fi

# Función para resetear una base de datos
reset_database() {
  local db_name=$1
  local env_label=$2

  echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
  echo -e "${BOLD}$env_label: $db_name${NC}"
  echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
  echo ""

  # Mostrar estado actual
  echo -e "${BLUE}📊 Estado actual:${NC}"
  local count=$(sudo -u postgres psql -d "$db_name" -tAc "SELECT COUNT(*) FROM _migrations;")
  echo "   Migraciones registradas: $count"
  echo ""

  # Confirmación
  echo -e "${YELLOW}⚠️  Esta operación:${NC}"
  echo "   1. Eliminará TODOS los registros de _migrations"
  echo "   2. Creará un único registro: baseline v3.0.0"
  echo "   3. NO modificará la estructura de la base de datos"
  echo ""

  read -p "¿Confirmas el reset de $env_label? (escribe 'yes' para continuar): " CONFIRM

  if [ "$CONFIRM" != "yes" ]; then
    echo -e "${YELLOW}❌ Operación cancelada para $env_label${NC}"
    echo ""
    return 1
  fi

  echo ""
  echo -e "${BLUE}🔄 Ejecutando reset...${NC}"

  # Limpiar tabla _migrations
  sudo -u postgres psql -d "$db_name" <<EOF
-- Eliminar todos los registros
DELETE FROM _migrations;

-- Insertar baseline v3.0.0
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
  '20251105_210000_baseline_v3.0.0.sql',
  CURRENT_TIMESTAMP,
  CURRENT_USER,
  0,
  'success',
  'Baseline v3.0.0 - Sistema de migraciones reorganizado (Issue #53)',
  'baseline_v3',
  'Punto inicial del sistema de migraciones v3.0.0 con scripts reorganizados'
);
EOF

  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Reset completado exitosamente${NC}"
    echo ""

    # Mostrar estado final
    echo -e "${BLUE}📊 Estado final:${NC}"
    sudo -u postgres psql -d "$db_name" -c "SELECT migration_name, applied_at, status, description FROM _migrations;"
    echo ""
  else
    echo -e "${RED}❌ Error al ejecutar reset${NC}"
    return 1
  fi
}

# Ejecutar según entorno
if [ "$ENV" == "dev" ]; then
  reset_database "cuentassik_dev" "🔵 DEV"
elif [ "$ENV" == "prod" ]; then
  reset_database "cuentassik_prod" "🔴 PROD"
elif [ "$ENV" == "both" ]; then
  reset_database "cuentassik_dev" "🔵 DEV"
  echo ""
  reset_database "cuentassik_prod" "🔴 PROD"
fi

echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ RESET COMPLETADO                                       ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BOLD}Sistema de migraciones v3.0.0 inicializado${NC}"
echo ""
echo "📚 Próximos pasos:"
echo "   1. Usar scripts en scripts/migrations/"
echo "   2. Las nuevas migraciones se registrarán automáticamente"
echo "   3. Usar 'migration_status.sh' para ver estado"
echo ""
