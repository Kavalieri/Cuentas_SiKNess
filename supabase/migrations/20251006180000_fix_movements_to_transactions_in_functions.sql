-- Migración: Fix funciones que usan "movements" (debe ser "transactions")
-- Fecha: 2025-10-06 18:00:00
-- Problema: Funciones migrate_existing_movements y update_period_totals usan "movements"
-- Solución: Recrear funciones con "transactions"

-- FIX 1: update_period_totals - Cambiar movements → transactions
-- Recrear función limpiamente (sin DROP, CREATE OR REPLACE es suficiente)
CREATE OR REPLACE FUNCTION update_period_totals(p_period_id UUID)
RETURNS monthly_periods
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_period monthly_periods;
  v_income NUMERIC;
  v_expenses NUMERIC;
BEGIN
  -- Calcular totales desde transactions (NO movements)
  SELECT 
    COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)
  INTO v_income, v_expenses
  FROM transactions  -- ⭐ CAMBIO: movements → transactions
  WHERE period_id = p_period_id;
  
  -- Actualizar período
  UPDATE monthly_periods
  SET 
    total_income = v_income,
    total_expenses = v_expenses,
    closing_balance = opening_balance + v_income - v_expenses,
    updated_at = NOW()
  WHERE id = p_period_id
  RETURNING * INTO v_period;
  
  RETURN v_period;
END;
$$;

COMMENT ON FUNCTION update_period_totals IS 'Actualiza totales de un período desde transactions';

-- FIX 2: migrate_existing_movements - Cambiar movements → transactions
-- DROP obligatorio porque cambia la firma de RETURNS
DROP FUNCTION IF EXISTS migrate_existing_movements();

CREATE OR REPLACE FUNCTION migrate_existing_movements()
RETURNS TABLE(household_id UUID, periods_created INTEGER, transactions_migrated INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_household RECORD;
  v_transaction RECORD;
  v_period_id UUID;
  v_periods_count INTEGER := 0;
  v_transactions_count INTEGER := 0;
BEGIN
  -- Por cada hogar
  FOR v_household IN 
    SELECT DISTINCT h.id, h.name
    FROM households h
  LOOP
    -- Por cada transacción sin período del hogar
    FOR v_transaction IN 
      SELECT *
      FROM transactions t  -- ⭐ CAMBIO: movements → transactions
      WHERE t.household_id = v_household.id
        AND t.period_id IS NULL
      ORDER BY t.occurred_at
    LOOP
      -- Obtener o crear período del mes de la transacción
      v_period_id := ensure_monthly_period(
        v_household.id,
        EXTRACT(YEAR FROM v_transaction.occurred_at)::INTEGER,
        EXTRACT(MONTH FROM v_transaction.occurred_at)::INTEGER
      );
      
      -- Asignar transacción al período
      UPDATE transactions  -- ⭐ CAMBIO: movements → transactions
      SET period_id = v_period_id
      WHERE id = v_transaction.id;
      
      v_transactions_count := v_transactions_count + 1;
    END LOOP;
    
    -- Contar períodos creados para este hogar
    SELECT COUNT(*)::INTEGER INTO v_periods_count
    FROM monthly_periods
    WHERE monthly_periods.household_id = v_household.id;
    
    -- Actualizar totales de todos los períodos del hogar
    FOR v_period_id IN 
      SELECT id FROM monthly_periods WHERE monthly_periods.household_id = v_household.id
    LOOP
      PERFORM update_period_totals(v_period_id);
    END LOOP;
    
    RETURN QUERY SELECT v_household.id, v_periods_count, v_transactions_count;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION migrate_existing_movements IS 'Migra transactions sin período asignado (legacy function, ya no debería usarse)';
