#!/bin/bash
# Script de limpieza de períodos mensuales vacíos
# Solo elimina períodos SIN transacciones NI contribuciones
# Mantiene el período actual por seguridad

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🧹 Limpieza de Períodos Mensuales Vacíos"
echo "========================================"
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para preguntar confirmación
confirm() {
  read -p "$1 (y/n): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}❌ Operación cancelada${NC}"
    exit 1
  fi
}

# 1. Identificar períodos vacíos
echo "📊 Identificando períodos vacíos..."
EMPTY_PERIODS=$(psql -h 127.0.0.1 -U cuentassik_user -d cuentassik_dev -t -c "
SELECT COUNT(*)
FROM monthly_periods mp
WHERE NOT EXISTS (
  SELECT 1 FROM transactions t WHERE t.period_id = mp.id
)
AND NOT EXISTS (
  SELECT 1 FROM contributions c 
  WHERE c.household_id = mp.household_id 
    AND c.year = mp.year 
    AND c.month = mp.month
)
AND (mp.year != EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER OR mp.month != EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER);
" | xargs)

echo -e "${YELLOW}Encontrados: ${EMPTY_PERIODS} períodos vacíos${NC}"
echo ""

if [ "$EMPTY_PERIODS" -eq 0 ]; then
  echo -e "${GREEN}✅ No hay períodos vacíos para eliminar${NC}"
  exit 0
fi

# 2. Mostrar detalle de períodos a eliminar
echo "📋 Detalle de períodos vacíos (excluyendo mes actual):"
echo "------------------------------------------------------"
psql -h 127.0.0.1 -U cuentassik_user -d cuentassik_dev -c "
SELECT 
  LEFT(id::text, 8) || '...' as id,
  year || '-' || LPAD(month::text, 2, '0') as periodo,
  phase,
  status
FROM monthly_periods mp
WHERE NOT EXISTS (
  SELECT 1 FROM transactions t WHERE t.period_id = mp.id
)
AND NOT EXISTS (
  SELECT 1 FROM contributions c 
  WHERE c.household_id = mp.household_id 
    AND c.year = mp.year 
    AND c.month = mp.month
)
AND (mp.year != EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER OR mp.month != EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER)
ORDER BY mp.year, mp.month;
"

echo ""
echo -e "${YELLOW}⚠️  ATENCIÓN: Esta operación NO se puede deshacer${NC}"
echo ""

# 3. Confirmar eliminación
confirm "¿Deseas eliminar estos ${EMPTY_PERIODS} períodos vacíos?"

# 4. Realizar backup de seguridad
echo ""
echo "💾 Creando backup de seguridad..."
BACKUP_FILE="$REPO_ROOT/database/backups/monthly_periods_$(date +%Y%m%d_%H%M%S).sql"
mkdir -p "$REPO_ROOT/database/backups"

psql -h 127.0.0.1 -U cuentassik_user -d cuentassik_dev -c "
COPY (
  SELECT * FROM monthly_periods mp
  WHERE NOT EXISTS (
    SELECT 1 FROM transactions t WHERE t.period_id = mp.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM contributions c 
    WHERE c.household_id = mp.household_id 
      AND c.year = mp.year 
      AND c.month = mp.month
  )
  AND (mp.year != EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER OR mp.month != EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER)
) TO STDOUT WITH CSV HEADER;
" > "$BACKUP_FILE"

echo -e "${GREEN}✅ Backup creado: $BACKUP_FILE${NC}"
echo ""

# 5. Eliminar períodos vacíos
echo "🗑️  Eliminando períodos vacíos..."
DELETED=$(psql -h 127.0.0.1 -U cuentassik_user -d cuentassik_dev -t -c "
WITH deleted AS (
  DELETE FROM monthly_periods
  WHERE id IN (
    SELECT mp.id
    FROM monthly_periods mp
    WHERE NOT EXISTS (
      SELECT 1 FROM transactions t WHERE t.period_id = mp.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM contributions c 
      WHERE c.household_id = mp.household_id 
        AND c.year = mp.year 
        AND c.month = mp.month
    )
    AND (mp.year != EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER OR mp.month != EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER)
  )
  RETURNING *
)
SELECT COUNT(*) FROM deleted;
" | xargs)

echo ""
echo -e "${GREEN}✅ Eliminados: ${DELETED} períodos${NC}"

# 6. Mostrar estado final
echo ""
echo "📊 Estado final:"
echo "----------------"
psql -h 127.0.0.1 -U cuentassik_user -d cuentassik_dev -c "
SELECT 
  COUNT(*) as total_periodos,
  COUNT(CASE WHEN phase = 'active' THEN 1 END) as activos,
  COUNT(CASE WHEN phase = 'closed' THEN 1 END) as cerrados,
  COUNT(CASE WHEN phase = 'preparing' THEN 1 END) as en_preparacion
FROM monthly_periods;
"

echo ""
echo -e "${GREEN}✅ Limpieza completada exitosamente${NC}"
echo ""
echo "📁 Backup disponible en: $BACKUP_FILE"
echo "🔙 Para restaurar (si necesario):"
echo "   psql -h 127.0.0.1 -U cuentassik_user -d cuentassik_dev -c \"COPY monthly_periods FROM '$BACKUP_FILE' WITH CSV HEADER;\""
