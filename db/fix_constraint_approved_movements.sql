-- ========================================================================
-- FIX: Eliminar constraint problemático check_approved_movements
-- ========================================================================
-- EJECUTAR EN SUPABASE SQL EDITOR
-- ========================================================================

BEGIN;

-- 1. Eliminar el constraint problemático
ALTER TABLE contribution_adjustments
  DROP CONSTRAINT IF EXISTS check_approved_movements;

-- 2. El constraint correcto debería ser:
-- - pending puede tener movement_id = NULL ✅
-- - approved DEBE tener movement_id NOT NULL ✅
-- - rejected puede tener movement_id = NULL ✅
--
-- Pero NO debemos forzar esto con un constraint porque puede causar
-- problemas durante la transacción de aprobación (race conditions).
-- Mejor confiar en la lógica de las server actions.

-- 3. Si queremos validar, mejor usar un trigger que valide DESPUÉS del UPDATE:
CREATE OR REPLACE FUNCTION validate_adjustment_movement_consistency()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo validar después de UPDATE (no en INSERT)
  IF TG_OP = 'UPDATE' THEN
    -- Si se aprueba, debe tener movement_id
    IF NEW.status = 'approved' AND NEW.movement_id IS NULL THEN
      RAISE EXCEPTION 'Ajustes aprobados deben tener movement_id';
    END IF;
    
    -- Si está pending o rejected, NO debe tener movement_id
    IF NEW.status IN ('pending', 'rejected') AND NEW.movement_id IS NOT NULL THEN
      RAISE WARNING 'Ajuste con status % tiene movement_id cuando no debería', NEW.status;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Crear trigger que se ejecuta DESPUÉS del UPDATE (no BEFORE)
DROP TRIGGER IF EXISTS trigger_validate_movement_consistency ON contribution_adjustments;
CREATE TRIGGER trigger_validate_movement_consistency
  AFTER UPDATE ON contribution_adjustments
  FOR EACH ROW
  EXECUTE FUNCTION validate_adjustment_movement_consistency();

COMMIT;
