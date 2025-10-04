-- Rastrear ajustes ya saldados (con movimiento vinculado)
-- Los ajustes con movement_id representan gastos/ingresos ya realizados
-- y deben contarse como parte del monto pagado de la contribución

BEGIN;

-- ============================================================================
-- PASO 1: Agregar columna para rastrear ajustes saldados
-- ============================================================================

ALTER TABLE contributions 
  ADD COLUMN IF NOT EXISTS adjustments_paid_amount NUMERIC(10,2) DEFAULT 0;

COMMENT ON COLUMN contributions.adjustments_paid_amount IS 
  'Suma de ajustes que tienen movimiento vinculado (ya saldados)';

-- ============================================================================
-- PASO 2: Calcular valores iniciales
-- ============================================================================

-- Para cada contribución, sumar los ajustes que tienen movement_id
UPDATE contributions c
SET adjustments_paid_amount = COALESCE(
  (
    SELECT SUM(ABS(ca.amount))
    FROM contribution_adjustments ca
    WHERE ca.contribution_id = c.id
    AND ca.movement_id IS NOT NULL
  ),
  0
);

-- ============================================================================
-- PASO 3: Actualizar trigger para mantener adjustments_paid_amount
-- ============================================================================

CREATE OR REPLACE FUNCTION update_contribution_adjustments_total()
RETURNS TRIGGER AS $$
DECLARE
  v_contribution_id UUID;
  v_adjustments_total NUMERIC;
  v_adjustments_paid NUMERIC;
  v_contribution RECORD;
BEGIN
  v_contribution_id := COALESCE(NEW.contribution_id, OLD.contribution_id);
  
  -- Calcular suma de todos los ajustes (positivos y negativos)
  SELECT COALESCE(SUM(amount), 0)
  INTO v_adjustments_total
  FROM contribution_adjustments
  WHERE contribution_id = v_contribution_id;
  
  -- Calcular suma de ajustes con movimiento vinculado (en valor absoluto)
  -- Estos representan gastos/ingresos ya realizados
  SELECT COALESCE(SUM(ABS(amount)), 0)
  INTO v_adjustments_paid
  FROM contribution_adjustments
  WHERE contribution_id = v_contribution_id
  AND movement_id IS NOT NULL;
  
  -- Obtener datos actuales de la contribución
  SELECT * INTO v_contribution
  FROM contributions
  WHERE id = v_contribution_id;
  
  -- Calcular nuevo expected_amount
  -- expected_amount = base + adjustments_total
  -- Necesitamos recalcular desde la base original
  DECLARE
    v_base_amount NUMERIC;
  BEGIN
    -- El base_amount original es expected_amount - adjustments_total anterior
    v_base_amount := v_contribution.expected_amount - COALESCE(v_contribution.adjustments_total, 0);
    
    -- Actualizar contribución
    UPDATE contributions
    SET 
      adjustments_total = v_adjustments_total,
      adjustments_paid_amount = v_adjustments_paid,
      expected_amount = v_base_amount + v_adjustments_total,
      updated_at = NOW()
    WHERE id = v_contribution_id;
  END;
  
  -- Recalcular status basado en total pagado
  DECLARE
    v_total_paid NUMERIC;
    v_expected NUMERIC;
    v_new_status VARCHAR(20);
  BEGIN
    SELECT 
      paid_amount + adjustments_paid_amount,
      expected_amount
    INTO v_total_paid, v_expected
    FROM contributions
    WHERE id = v_contribution_id;
    
    -- Determinar nuevo status
    IF v_total_paid >= v_expected THEN
      IF v_total_paid > v_expected THEN
        v_new_status := 'overpaid';
      ELSE
        v_new_status := 'paid';
      END IF;
    ELSIF v_total_paid > 0 THEN
      v_new_status := 'partial';
    ELSE
      v_new_status := 'pending';
    END IF;
    
    -- Actualizar status
    UPDATE contributions
    SET status = v_new_status
    WHERE id = v_contribution_id;
  END;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_contribution_adjustments_total IS 
  'Actualiza adjustments_total y adjustments_paid_amount, recalcula expected_amount y status';

-- Recrear trigger
DROP TRIGGER IF EXISTS trigger_update_adjustments_total ON contribution_adjustments;
CREATE TRIGGER trigger_update_adjustments_total
  AFTER INSERT OR UPDATE OR DELETE ON contribution_adjustments
  FOR EACH ROW
  EXECUTE FUNCTION update_contribution_adjustments_total();

-- ============================================================================
-- PASO 4: Actualizar función para recalcular status al registrar pagos
-- ============================================================================

-- Crear función auxiliar para recalcular status
CREATE OR REPLACE FUNCTION recalculate_contribution_status(p_contribution_id UUID)
RETURNS VOID AS $$
DECLARE
  v_total_paid NUMERIC;
  v_expected NUMERIC;
  v_new_status VARCHAR(20);
BEGIN
  SELECT 
    paid_amount + adjustments_paid_amount,
    expected_amount
  INTO v_total_paid, v_expected
  FROM contributions
  WHERE id = p_contribution_id;
  
  -- Determinar nuevo status
  IF v_total_paid >= v_expected THEN
    IF v_total_paid > v_expected THEN
      v_new_status := 'overpaid';
    ELSE
      v_new_status := 'paid';
    END IF;
  ELSIF v_total_paid > 0 THEN
    v_new_status := 'partial';
  ELSE
    v_new_status := 'pending';
  END IF;
  
  -- Actualizar status
  UPDATE contributions
  SET 
    status = v_new_status,
    updated_at = NOW()
  WHERE id = p_contribution_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION recalculate_contribution_status IS 
  'Recalcula el status de una contribución basado en paid_amount + adjustments_paid_amount';

-- ============================================================================
-- PASO 5: Crear trigger para actualizar status al cambiar paid_amount
-- ============================================================================

CREATE OR REPLACE FUNCTION update_contribution_status_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo recalcular si paid_amount cambió
  IF (TG_OP = 'UPDATE' AND NEW.paid_amount != OLD.paid_amount) OR TG_OP = 'INSERT' THEN
    PERFORM recalculate_contribution_status(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_contribution_status ON contributions;
CREATE TRIGGER trigger_update_contribution_status
  AFTER INSERT OR UPDATE OF paid_amount ON contributions
  FOR EACH ROW
  EXECUTE FUNCTION update_contribution_status_on_payment();

-- ============================================================================
-- PASO 6: Recalcular status de todas las contribuciones existentes
-- ============================================================================

-- Recalcular status para todas las contribuciones
DO $$
DECLARE
  v_contribution RECORD;
BEGIN
  FOR v_contribution IN 
    SELECT id FROM contributions
  LOOP
    PERFORM recalculate_contribution_status(v_contribution.id);
  END LOOP;
END;
$$;

COMMIT;

-- Reportar cambios
DO $$
DECLARE
  v_total_contributions INTEGER;
  v_with_settled_adjustments INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_contributions FROM contributions;
  
  SELECT COUNT(DISTINCT contribution_id) 
  INTO v_with_settled_adjustments
  FROM contribution_adjustments
  WHERE movement_id IS NOT NULL;
  
  RAISE NOTICE '✓ Sistema de ajustes saldados implementado';
  RAISE NOTICE '  - % contribuciones totales', v_total_contributions;
  RAISE NOTICE '  - % contribuciones con ajustes saldados', v_with_settled_adjustments;
  RAISE NOTICE '  - Nueva columna: adjustments_paid_amount';
  RAISE NOTICE '  - Status recalculado automáticamente';
END;
$$;
