#!/bin/bash
# ==============================================================================
# Script: Aplicar migración de subcategorías desde descripciones
# Issue: #16
# Descripción: Infiere subcategory_id desde transaction.description
# ==============================================================================

set -euo pipefail

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ==============================================================================
# Funciones auxiliares
# ==============================================================================

print_header() {
  echo ""
  echo -e "${BLUE}============================================================${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}============================================================${NC}"
  echo ""
}

print_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
  echo -e "${RED}❌ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

# ==============================================================================
# Función principal: Aplicar migración
# ==============================================================================

apply_migration() {
  local ENV=$1
  local DB_NAME=$2

  print_header "Aplicando migración de subcategorías en $ENV"

  # Ruta al script SQL
  local SQL_SCRIPT="$(dirname "$0")/populate_subcategory_from_description.sql"

  if [[ ! -f "$SQL_SCRIPT" ]]; then
    print_error "Script SQL no encontrado: $SQL_SCRIPT"
    exit 1
  fi

  print_info "Base de datos: $DB_NAME"
  print_info "Usuario: cuentassik_user"
  print_info "Script: $SQL_SCRIPT"
  echo ""

  # Estado ANTES
  print_info "Estado ANTES de la migración:"
  psql -h 127.0.0.1 -U cuentassik_user -d "$DB_NAME" -c "
    SELECT
      COUNT(*) as total_transacciones,
      COUNT(category_id) as con_categoria,
      COUNT(subcategory_id) as con_subcategoria,
      COUNT(category_id) - COUNT(subcategory_id) as candidatas
    FROM transactions;
  "

  echo ""
  read -p "¿Continuar con la migración? (yes/no): " CONFIRM

  if [[ "$CONFIRM" != "yes" ]]; then
    print_warning "Migración cancelada por el usuario"
    exit 0
  fi

  echo ""
  print_info "Ejecutando migración..."

  # Ejecutar script SQL
  psql -h 127.0.0.1 -U cuentassik_user -d "$DB_NAME" -f "$SQL_SCRIPT"

  local EXIT_CODE=$?

  if [[ $EXIT_CODE -eq 0 ]]; then
    print_success "Migración completada exitosamente en $ENV"
  else
    print_error "Error ejecutando migración (exit code: $EXIT_CODE)"
    exit $EXIT_CODE
  fi

  echo ""
  print_info "Estado DESPUÉS de la migración:"
  psql -h 127.0.0.1 -U cuentassik_user -d "$DB_NAME" -c "
    SELECT
      COUNT(*) as total_transacciones,
      COUNT(category_id) as con_categoria,
      COUNT(subcategory_id) as con_subcategoria,
      COUNT(category_id) - COUNT(subcategory_id) as sin_subcategoria_valido
    FROM transactions;
  "

  echo ""
  print_info "Muestra de transacciones actualizadas recientemente:"
  psql -h 127.0.0.1 -U cuentassik_user -d "$DB_NAME" -c "
    SELECT
      t.description,
      c.name as categoria,
      s.name as subcategoria,
      t.updated_at
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN subcategories s ON t.subcategory_id = s.id
    WHERE t.updated_at >= CURRENT_TIMESTAMP - INTERVAL '1 minute'
    ORDER BY t.updated_at DESC
    LIMIT 10;
  "
}

# ==============================================================================
# Main
# ==============================================================================

main() {
  print_header "Migración de Subcategorías desde Descripciones - Issue #16"

  # Verificar argumento
  if [[ $# -eq 0 ]]; then
    echo "Uso: $0 [dev|prod|both]"
    echo ""
    echo "Opciones:"
    echo "  dev   - Aplicar solo en DEV (cuentassik_dev)"
    echo "  prod  - Aplicar solo en PROD (cuentassik_prod)"
    echo "  both  - Aplicar en ambos entornos (primero DEV, luego PROD)"
    exit 1
  fi

  local ENV=$1

  case "$ENV" in
    dev)
      apply_migration "DEV" "cuentassik_dev"
      ;;
    prod)
      print_warning "⚠️  PRODUCCIÓN: Asegúrate de haber probado en DEV primero"
      echo ""
      read -p "¿Confirmas que quieres aplicar en PRODUCCIÓN? (yes/no): " PROD_CONFIRM

      if [[ "$PROD_CONFIRM" != "yes" ]]; then
        print_warning "Operación cancelada"
        exit 0
      fi

      apply_migration "PROD" "cuentassik_prod"
      ;;
    both)
      # Primero DEV
      apply_migration "DEV" "cuentassik_dev"

      echo ""
      print_success "DEV completado exitosamente"
      echo ""

      # Luego PROD (con confirmación adicional)
      print_warning "⚠️  Continuando con PRODUCCIÓN..."
      echo ""
      read -p "¿Confirmas que quieres aplicar en PRODUCCIÓN? (yes/no): " PROD_CONFIRM

      if [[ "$PROD_CONFIRM" != "yes" ]]; then
        print_warning "PROD cancelado. DEV ya aplicado."
        exit 0
      fi

      apply_migration "PROD" "cuentassik_prod"
      ;;
    *)
      print_error "Argumento inválido: $ENV"
      echo "Uso: $0 [dev|prod|both]"
      exit 1
      ;;
  esac

  echo ""
  print_success "🎉 Proceso completado exitosamente"
}

main "$@"
