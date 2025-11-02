#!/bin/bash
# ==============================================================================
# Script: Limpiar categorías y subcategorías huérfanas
# Issue: #16
# Descripción: Elimina categorías de hogares que ya no existen
# ==============================================================================

set -euo pipefail

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
  echo ""
  echo -e "${BLUE}============================================================${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}============================================================${NC}"
  echo ""
}

print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }

cleanup_orphans() {
  local ENV=$1
  local DB_NAME=$2

  print_header "Limpiando categorías huérfanas en $ENV"

  local SQL_SCRIPT="$(dirname "$0")/cleanup_orphan_categories.sql"

  if [[ ! -f "$SQL_SCRIPT" ]]; then
    print_error "Script SQL no encontrado: $SQL_SCRIPT"
    exit 1
  fi

  print_info "Base de datos: $DB_NAME"
  print_info "Script: $SQL_SCRIPT"
  echo ""

  # Vista previa
  print_info "Vista previa de categorías huérfanas:"
  psql -h 127.0.0.1 -U cuentassik_user -d "$DB_NAME" -c "
    SELECT
      c.household_id,
      COUNT(DISTINCT c.id) as categorias,
      COUNT(DISTINCT s.id) as subcategorias
    FROM categories c
    LEFT JOIN households h ON c.household_id = h.id
    LEFT JOIN subcategories s ON s.category_id = c.id
    WHERE h.id IS NULL
    GROUP BY c.household_id;
  " || true

  echo ""
  read -p "¿Continuar con la limpieza? (yes/no): " CONFIRM

  if [[ "$CONFIRM" != "yes" ]]; then
    print_warning "Limpieza cancelada"
    exit 0
  fi

  echo ""
  print_info "Ejecutando limpieza..."

  psql -h 127.0.0.1 -U cuentassik_user -d "$DB_NAME" -f "$SQL_SCRIPT"

  if [[ $? -eq 0 ]]; then
    print_success "Limpieza completada en $ENV"
  else
    print_error "Error ejecutando limpieza"
    exit 1
  fi

  echo ""
  print_info "Verificación final:"
  psql -h 127.0.0.1 -U cuentassik_user -d "$DB_NAME" -c "
    SELECT
      h.name as hogar,
      COUNT(DISTINCT c.id) as categorias,
      COUNT(DISTINCT s.id) as subcategorias
    FROM households h
    LEFT JOIN categories c ON c.household_id = h.id
    LEFT JOIN subcategories s ON s.category_id = c.id
    GROUP BY h.name;
  "
}

main() {
  print_header "Limpieza de Categorías Huérfanas - Issue #16"

  if [[ $# -eq 0 ]]; then
    echo "Uso: $0 [dev|prod|both]"
    exit 1
  fi

  case "$1" in
    dev)
      cleanup_orphans "DEV" "cuentassik_dev"
      ;;
    prod)
      print_warning "⚠️  PRODUCCIÓN: Asegúrate de haber probado en DEV primero"
      read -p "¿Confirmas limpieza en PRODUCCIÓN? (yes/no): " CONFIRM
      [[ "$CONFIRM" != "yes" ]] && exit 0
      cleanup_orphans "PROD" "cuentassik_prod"
      ;;
    both)
      cleanup_orphans "DEV" "cuentassik_dev"
      echo ""
      print_success "DEV completado"
      echo ""
      read -p "¿Continuar con PRODUCCIÓN? (yes/no): " CONFIRM
      [[ "$CONFIRM" != "yes" ]] && exit 0
      cleanup_orphans "PROD" "cuentassik_prod"
      ;;
    *)
      print_error "Argumento inválido: $1"
      exit 1
      ;;
  esac

  echo ""
  print_success "🎉 Limpieza completada exitosamente"
}

main "$@"
