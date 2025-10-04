-- Revertir la lógica de adjustments_paid_amount
-- El cálculo ya está correcto en expected_amount y paid_amount
-- No necesitamos redundancia

BEGIN;

-- ============================================================================
-- PASO 1: Restaurar función original del trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION update_contribution_adjustments_total()
RETURNS TRIGGER AS $$
DECLARE
  v_contribution_id UUID;
  v_adjustments_total NUMERIC;
  v_contribution RECORD;
  v_base_amount NUMERIC;
BEGIN
  v_contribution_id := COALESCE(NEW.contribution_id, OLD.contribution_id);
  
  -- Calcular suma de todos los ajustes (positivos y negativos)
  SELECT COALESCE(SUM(amount), 0)
  INTO v_adjustments_total
  FROM contribution_adjustments
  WHERE contribution_id = v_contribution_id;
  
  -- Obtener datos actuales de la contribución
  SELECT * INTO v_contribution
  FROM contributions
  WHERE id = v_contribution_id;
  
  -- El base_amount original es expected_amount - adjustments_total anterior
  v_base_amount := v_contribution.expected_amount - COALESCE(v_contribution.adjustments_total, 0);
  
  -- Actualizar contribución
  -- expected_amount = base + adjustments_total
  UPDATE contributions
  SET 
    adjustments_total = v_adjustments_total,
    expected_amount = v_base_amount + v_adjustments_total,
    updated_at = NOW()
  WHERE id = v_contribution_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_contribution_adjustments_total IS 
  'Actualiza adjustments_total y recalcula expected_amount automáticamente';

-- Recrear trigger
DROP TRIGGER IF EXISTS trigger_update_adjustments_total ON contribution_adjustments;
CREATE TRIGGER trigger_update_adjustments_total
  AFTER INSERT OR UPDATE OR DELETE ON contribution_adjustments
  FOR EACH ROW
  EXECUTE FUNCTION update_contribution_adjustments_total();

-- ============================================================================
-- PASO 2: Eliminar función y trigger innecesarios
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_update_contribution_status ON contributions;
DROP FUNCTION IF EXISTS update_contribution_status_on_payment();
DROP FUNCTION IF EXISTS recalculate_contribution_status(UUID);

-- ============================================================================
-- PASO 3: Eliminar columna adjustments_paid_amount
-- ============================================================================

ALTER TABLE contributions DROP COLUMN IF EXISTS adjustments_paid_amount;

COMMIT;

-- Reportar cambios
DO $$
BEGIN
  RAISE NOTICE '✓ Sistema simplificado';
  RAISE NOTICE '  - Columna adjustments_paid_amount eliminada';
  RAISE NOTICE '  - Funciones redundantes eliminadas';
  RAISE NOTICE '  - Trigger restaurado a versión simple';
  RAISE NOTICE '  ';
  RAISE NOTICE 'Lógica correcta:';
  RAISE NOTICE '  - expected_amount = base + adjustments_total';
  RAISE NOTICE '  - pending = expected_amount - paid_amount';
END;
$$;
