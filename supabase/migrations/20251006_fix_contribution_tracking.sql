-- =====================================================
-- Fix: Sistema de Tracking Automático de Contribuciones
-- Fecha: 6 Octubre 2025
-- Problema: paid_amount no se actualizaba al registrar pagos
-- =====================================================

-- 1. Función para recalcular paid_amount sumando transacciones
CREATE OR REPLACE FUNCTION recalculate_contribution_paid_amount(p_contribution_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_total numeric;
BEGIN
  -- Sumar TODAS las transacciones income con source_id = contribution_id
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total
  FROM transactions
  WHERE source_id = p_contribution_id
    AND source_type = 'manual'
    AND type = 'income';
  
  -- Actualizar paid_amount
  UPDATE contributions
  SET 
    paid_amount = v_total,
    updated_at = now()
  WHERE id = p_contribution_id;
  
  -- Actualizar estado
  PERFORM update_contribution_status(p_contribution_id);
END;
$$;

-- 2. Trigger que recalcula automáticamente al insertar/actualizar/borrar transacciones
CREATE OR REPLACE FUNCTION trigger_recalculate_contribution()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Si es INSERT o UPDATE con source_id contribution
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    IF NEW.source_type = 'manual' AND NEW.source_id IS NOT NULL THEN
      PERFORM recalculate_contribution_paid_amount(NEW.source_id);
    END IF;
  END IF;
  
  -- Si es DELETE con source_id contribution
  IF (TG_OP = 'DELETE') THEN
    IF OLD.source_type = 'manual' AND OLD.source_id IS NOT NULL THEN
      PERFORM recalculate_contribution_paid_amount(OLD.source_id);
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Aplicar trigger a transactions
DROP TRIGGER IF EXISTS trg_recalculate_contribution_on_transaction ON transactions;
CREATE TRIGGER trg_recalculate_contribution_on_transaction
AFTER INSERT OR UPDATE OR DELETE ON transactions
FOR EACH ROW
EXECUTE FUNCTION trigger_recalculate_contribution();

-- 3. Fix: auto_create_credit_on_overpayment (eliminar referencia a period_id inexistente)
CREATE OR REPLACE FUNCTION auto_create_credit_on_overpayment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_excess NUMERIC;
  v_existing_credit UUID;
BEGIN
  -- Solo ejecutar si el status cambia a 'overpaid'
  IF NEW.status = 'overpaid' AND (OLD.status IS NULL OR OLD.status != 'overpaid') THEN
    v_excess := NEW.paid_amount - NEW.expected_amount;
    
    -- Verificar que realmente hay exceso
    IF v_excess > 0 THEN
      -- Verificar que no exista ya un crédito para esta contribución
      SELECT id INTO v_existing_credit
      FROM member_credits
      WHERE household_id = NEW.household_id
        AND profile_id = NEW.profile_id
        AND source_month = NEW.month
        AND source_year = NEW.year
        AND status = 'active'
      LIMIT 1;
      
      -- Solo crear si no existe
      IF v_existing_credit IS NULL THEN
        PERFORM create_member_credit_from_overpayment(
          NEW.id,
          COALESCE(auth.uid(), NEW.profile_id) -- Fallback a profile_id si auth.uid() es NULL
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- =====================================================
-- COMENTARIOS:
-- 
-- Este fix implementa tracking automático de contribuciones:
-- 
-- 1. recalculate_contribution_paid_amount(): Suma todas las transacciones
--    de tipo income con source_id = contribution_id
-- 
-- 2. trigger_recalculate_contribution(): Se ejecuta automáticamente
--    al INSERT/UPDATE/DELETE de transactions para mantener sincronizado
-- 
-- 3. auto_create_credit_on_overpayment(): Corregido para NO usar
--    contributions.period_id (columna inexistente)
-- 
-- BENEFICIOS:
-- - paid_amount siempre sincronizado con transacciones
-- - Soporte para múltiples pagos parciales
-- - Detecta automáticamente overpayments y crea créditos
-- - Previene duplicados de créditos
-- =====================================================
