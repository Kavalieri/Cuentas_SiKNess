#!/bin/bash
# promote_migration.sh - Mueve migraciones validadas de development/ a tested/
# Versión: 2.1.0

set -e

readonly MIGRATIONS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../database/migrations" && pwd)"
readonly DEV_DIR="$MIGRATIONS_DIR/development"
readonly TESTED_DIR="$MIGRATIONS_DIR/tested"

# Colores
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

show_help() {
  echo "⬆️  Promover Migraciones (dev → tested)"
  echo "========================================="
  echo ""
  echo "Uso:"
  echo "  ./promote_migration.sh [OPCIONES]"
  echo ""
  echo "Opciones:"
  echo "  -a, --all              Promocionar TODAS las migraciones (requiere confirmación)"
  echo "  -f, --file FILENAME    Promocionar migración específica"
  echo "  -p, --pattern PATTERN  Promocionar migraciones que coincidan con patrón"
  echo "  -l, --list             Solo listar migraciones disponibles"
  echo "  -h, --help             Mostrar esta ayuda"
  echo ""
  echo "Ejemplos:"
  echo "  ./promote_migration.sh                          # Modo interactivo"
  echo "  ./promote_migration.sh --all                    # Promocionar todas"
  echo "  ./promote_migration.sh --file 20251101_xxx.sql  # Una específica"
  echo "  ./promote_migration.sh --pattern '20251101_*'   # Por patrón de fecha"
  echo "  ./promote_migration.sh --list                   # Ver disponibles"
  echo ""
}

list_migrations() {
  echo -e "${BLUE}📋 Migraciones en development/:${NC}"
  echo ""

  local count=0
  if [ -d "$DEV_DIR" ]; then
    for migration in "$DEV_DIR"/*.sql; do
      [ -e "$migration" ] || continue
      [ "$(basename "$migration")" = ".gitkeep" ] && continue

      filename=$(basename "$migration")
      filesize=$(du -h "$migration" | cut -f1)
      count=$((count + 1))

      echo -e "  ${GREEN}$count.${NC} $filename ${YELLOW}($filesize)${NC}"
    done
  fi

  if [ $count -eq 0 ]; then
    echo -e "${YELLOW}⚠️  No hay migraciones en development/${NC}"
  else
    echo ""
    echo -e "${BLUE}Total: $count migración(es)${NC}"
  fi
}

promote_file() {
  local filename=$1
  local filepath="$DEV_DIR/$filename"

  if [ ! -f "$filepath" ]; then
    echo -e "${RED}❌ Error: No existe $filename en development/${NC}"
    return 1
  fi

  mkdir -p "$TESTED_DIR"
  mv "$filepath" "$TESTED_DIR/"
  echo -e "${GREEN}✅ $filename → tested/${NC}"
  return 0
}

promote_all() {
  local count=0
  local promoted=0

  for migration in "$DEV_DIR"/*.sql; do
    [ -e "$migration" ] || continue
    filename=$(basename "$migration")
    [ "$filename" = ".gitkeep" ] && continue

    count=$((count + 1))
  done

  if [ $count -eq 0 ]; then
    echo -e "${YELLOW}⚠️  No hay migraciones para promocionar${NC}"
    return 0
  fi

  echo -e "${YELLOW}⚠️  Vas a promocionar $count migración(es) a tested/${NC}"
  echo ""
  echo "Esto significa que están validadas y listas para PROD."
  echo ""
  read -p "¿Continuar? (yes/no): " confirm

  if [ "$confirm" != "yes" ]; then
    echo -e "${RED}❌ Operación cancelada${NC}"
    return 1
  fi

  echo ""
  mkdir -p "$TESTED_DIR"

  for migration in "$DEV_DIR"/*.sql; do
    [ -e "$migration" ] || continue
    filename=$(basename "$migration")
    [ "$filename" = ".gitkeep" ] && continue

    mv "$migration" "$TESTED_DIR/"
    echo -e "${GREEN}✅ $filename → tested/${NC}"
    promoted=$((promoted + 1))
  done

  echo ""
  echo -e "${GREEN}✅ Promocionadas $promoted migración(es)${NC}"
}

promote_pattern() {
  local pattern=$1
  local count=0
  local promoted=0

  echo -e "${BLUE}📋 Migraciones que coinciden con '$pattern':${NC}"
  echo ""

  for migration in "$DEV_DIR"/$pattern; do
    [ -e "$migration" ] || continue
    filename=$(basename "$migration")
    [ "$filename" = ".gitkeep" ] && continue

    echo "  • $filename"
    count=$((count + 1))
  done

  if [ $count -eq 0 ]; then
    echo -e "${YELLOW}⚠️  No hay migraciones que coincidan${NC}"
    return 0
  fi

  echo ""
  read -p "¿Promocionar estas $count migración(es)? (yes/no): " confirm

  if [ "$confirm" != "yes" ]; then
    echo -e "${RED}❌ Operación cancelada${NC}"
    return 1
  fi

  echo ""
  mkdir -p "$TESTED_DIR"

  for migration in "$DEV_DIR"/$pattern; do
    [ -e "$migration" ] || continue
    filename=$(basename "$migration")
    [ "$filename" = ".gitkeep" ] && continue

    mv "$migration" "$TESTED_DIR/"
    echo -e "${GREEN}✅ $filename → tested/${NC}"
    promoted=$((promoted + 1))
  done

  echo ""
  echo -e "${GREEN}✅ Promocionadas $promoted migración(es)${NC}"
}

interactive_mode() {
  echo "⬆️  Promover Migración (dev → tested)"
  echo "====================================="
  echo ""

  # Verificar que existan migraciones
  if [ ! -d "$DEV_DIR" ] || [ -z "$(ls -A $DEV_DIR/*.sql 2>/dev/null | grep -v '.gitkeep')" ]; then
    echo -e "${YELLOW}⚠️  No hay migraciones en development/${NC}"
    exit 0
  fi

  list_migrations
  echo ""
  echo -e "${BLUE}Selecciona una migración (número) o:${NC}"
  echo "  • 'a' para promocionar TODAS"
  echo "  • 'q' para salir"
  echo ""

  local migrations=()
  for migration in "$DEV_DIR"/*.sql; do
    [ -e "$migration" ] || continue
    [ "$(basename "$migration")" = ".gitkeep" ] && continue
    migrations+=("$migration")
  done

  read -p "Opción: " choice

  case "$choice" in
    q|Q)
      echo -e "${YELLOW}❌ Cancelado${NC}"
      exit 0
      ;;
    a|A)
      promote_all
      ;;
    [0-9]*)
      local index=$((choice - 1))
      if [ $index -ge 0 ] && [ $index -lt ${#migrations[@]} ]; then
        local migration="${migrations[$index]}"
        local filename=$(basename "$migration")

        echo ""
        echo -e "${BLUE}📄 Migración seleccionada: $filename${NC}"
        echo ""
        read -p "¿Está validada y lista para PROD? (yes/no): " confirm

        if [ "$confirm" = "yes" ]; then
          promote_file "$filename"
        else
          echo -e "${RED}❌ Operación cancelada${NC}"
        fi
      else
        echo -e "${RED}❌ Opción inválida${NC}"
        exit 1
      fi
      ;;
    *)
      echo -e "${RED}❌ Opción inválida${NC}"
      exit 1
      ;;
  esac
}

# Main
case "${1:-}" in
  -h|--help)
    show_help
    exit 0
    ;;
  -l|--list)
    list_migrations
    exit 0
    ;;
  -a|--all)
    promote_all
    ;;
  -f|--file)
    if [ -z "${2:-}" ]; then
      echo -e "${RED}❌ Error: Especifica el nombre del archivo${NC}"
      echo "Uso: $0 --file FILENAME"
      exit 1
    fi
    promote_file "$2"
    ;;
  -p|--pattern)
    if [ -z "${2:-}" ]; then
      echo -e "${RED}❌ Error: Especifica el patrón${NC}"
      echo "Uso: $0 --pattern 'PATTERN'"
      exit 1
    fi
    promote_pattern "$2"
    ;;
  "")
    interactive_mode
    ;;
  *)
    echo -e "${RED}❌ Opción desconocida: $1${NC}"
    echo ""
    show_help
    exit 1
    ;;
esac

echo ""
echo -e "${BLUE}📊 Próximos pasos:${NC}"
echo "   1. Commit: git add database/migrations/tested/"
echo "   2. Push: git push origin main"
echo "   3. Deploy a PROD: ./scripts/apply_migration.sh prod <archivo>"
echo ""
