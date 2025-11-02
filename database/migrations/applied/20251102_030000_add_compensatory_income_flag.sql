-- Migración: Añadir flag para identificar ingresos compensatorios automáticos
-- Fecha: 2025-11-02
-- Issue: #26 - Edición de gastos directos
-- Descripción: Añade campo is_compensatory_income para distinguir ingresos compensatorios
--              de ingresos directos manuales, permitiendo ocultar botones de edición en UI.

-- COMO cuentassik_owner
SET ROLE cuentassik_owner;

-- 1. Añadir columna is_compensatory_income
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS is_compensatory_income BOOLEAN DEFAULT FALSE NOT NULL;

COMMENT ON COLUMN transactions.is_compensatory_income IS 
  'TRUE si es un ingreso compensatorio creado automáticamente al registrar un gasto directo. Estos ingresos NO deben editarse directamente, solo desde el gasto asociado.';

-- 2. Marcar ingresos compensatorios existentes
-- Criterios: tipo income_direct + flujo direct + tiene transaction_pair_id + descripción empieza con "Equilibrio:"
UPDATE transactions
SET is_compensatory_income = TRUE
WHERE type = 'income_direct'
  AND flow_type = 'direct'
  AND transaction_pair_id IS NOT NULL
  AND description LIKE 'Equilibrio:%'
  AND is_compensatory_income = FALSE;

-- 3. Crear índice parcial para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_transactions_compensatory_income
  ON transactions(household_id, is_compensatory_income)
  WHERE is_compensatory_income = TRUE;

COMMENT ON INDEX idx_transactions_compensatory_income IS
  'Índice parcial para filtrar ingresos compensatorios en queries de UI';

-- 4. Otorgar permisos a cuentassik_user
GRANT SELECT, INSERT, UPDATE, DELETE ON transactions TO cuentassik_user;

RESET ROLE;

-- Verificación de cambios
DO $$
DECLARE
  total_compensatory INTEGER;
  indexed_count INTEGER;
BEGIN
  -- Contar ingresos compensatorios marcados
  SELECT COUNT(*) INTO total_compensatory
  FROM transactions
  WHERE is_compensatory_income = TRUE;

  RAISE NOTICE 'Ingresos compensatorios marcados: %', total_compensatory;

  -- Verificar índice creado
  SELECT COUNT(*) INTO indexed_count
  FROM pg_indexes
  WHERE indexname = 'idx_transactions_compensatory_income';

  IF indexed_count > 0 THEN
    RAISE NOTICE '✅ Índice idx_transactions_compensatory_income creado exitosamente';
  ELSE
    RAISE WARNING '⚠️ Índice idx_transactions_compensatory_income NO fue creado';
  END IF;
END $$;
