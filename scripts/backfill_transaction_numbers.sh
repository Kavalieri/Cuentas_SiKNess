#!/bin/bash

# Script de backfill para numerar transacciones existentes
# Issue: #27
# Descripción: Asigna números secuenciales a transacciones que no tienen transaction_number
# Uso: ./scripts/backfill_transaction_numbers.sh [dev|prod]

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Validar argumento
if [ $# -ne 1 ]; then
    echo -e "${RED}❌ Error: Debe especificar el entorno (dev o prod)${NC}"
    echo "Uso: ./scripts/backfill_transaction_numbers.sh [dev|prod]"
    exit 1
fi

ENV=$1

# Validar entorno
if [ "$ENV" != "dev" ] && [ "$ENV" != "prod" ]; then
    echo -e "${RED}❌ Error: Entorno inválido. Usar 'dev' o 'prod'${NC}"
    exit 1
fi

# Configurar base de datos según entorno
if [ "$ENV" == "dev" ]; then
    DB_NAME="cuentassik_dev"
else
    DB_NAME="cuentassik_prod"
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔢 Backfill de Transaction Numbers${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}📊 Entorno: ${ENV^^}${NC}"
echo -e "${YELLOW}🗄️  Base de datos: ${DB_NAME}${NC}"
echo ""

# Advertencia para producción
if [ "$ENV" == "prod" ]; then
    echo -e "${RED}⚠️  ADVERTENCIA: Ejecutando en PRODUCCIÓN${NC}"
    echo -e "${YELLOW}Este script modificará datos existentes en la base de datos de producción.${NC}"
    echo ""
    read -p "¿Estás seguro de continuar? (escribe 'yes' para confirmar): " CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
        echo -e "${RED}❌ Operación cancelada${NC}"
        exit 0
    fi
    echo ""
fi

# Verificar que existe la columna
echo -e "${BLUE}📋 Verificando estructura de la base de datos...${NC}"
COLUMN_EXISTS=$(psql -h 127.0.0.1 -U cuentassik_user -d "$DB_NAME" -tAc \
    "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'transaction_number';")

if [ "$COLUMN_EXISTS" -eq 0 ]; then
    echo -e "${RED}❌ Error: La columna transaction_number no existe${NC}"
    echo -e "${YELLOW}Ejecuta primero la migración: ./scripts/apply_migration.sh $ENV 20251102_045126_add_transaction_numbering_system.sql${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Columna transaction_number encontrada${NC}"
echo ""

# Contar transacciones sin número
echo -e "${BLUE}📊 Analizando transacciones...${NC}"
TOTAL_TX=$(psql -h 127.0.0.1 -U cuentassik_user -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM transactions;")
TX_WITHOUT_NUMBER=$(psql -h 127.0.0.1 -U cuentassik_user -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM transactions WHERE transaction_number IS NULL;")

echo -e "Total de transacciones: ${GREEN}${TOTAL_TX}${NC}"
echo -e "Sin numerar: ${YELLOW}${TX_WITHOUT_NUMBER}${NC}"
echo ""

if [ "$TX_WITHOUT_NUMBER" -eq 0 ]; then
    echo -e "${GREEN}✅ Todas las transacciones ya tienen número asignado${NC}"
    exit 0
fi

# Ejecutar backfill
echo -e "${BLUE}🔄 Asignando números a transacciones existentes...${NC}"
echo -e "${YELLOW}Ordenando por: created_at ASC (orden cronológico)${NC}"
echo ""

START_TIME=$(date +%s)

psql -h 127.0.0.1 -U cuentassik_user -d "$DB_NAME" << 'EOF'
BEGIN;

-- Asignar números secuenciales por household, ordenados cronológicamente
WITH numbered AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY household_id
      ORDER BY created_at ASC, id ASC
    ) as new_number
  FROM transactions
  WHERE transaction_number IS NULL
)
UPDATE transactions t
SET transaction_number = n.new_number
FROM numbered n
WHERE t.id = n.id;

COMMIT;

-- Verificar resultado
\echo ''
\echo '✅ Backfill completado'
\echo ''
\echo '📊 Resumen por household:'
SELECT
  h.name as household,
  COUNT(*) as total_transacciones,
  MIN(t.transaction_number) as min_numero,
  MAX(t.transaction_number) as max_numero
FROM transactions t
JOIN households h ON t.household_id = h.id
GROUP BY h.id, h.name
ORDER BY h.name;
EOF

END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Backfill completado exitosamente${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "⏱️  Tiempo de ejecución: ${GREEN}${ELAPSED}s${NC}"
echo ""
echo -e "${BLUE}📝 Próximos pasos:${NC}"
echo -e "  1. Verificar que los números son correctos en la aplicación"
echo -e "  2. Si todo es correcto, considerar añadir constraint NOT NULL:"
echo -e "     ${YELLOW}ALTER TABLE transactions ALTER COLUMN transaction_number SET NOT NULL;${NC}"
echo ""
