-- ========================================================================
-- RESET Y FIX COMPLETO: Limpiar datos incorrectos y aplicar trigger correcto
-- ========================================================================
-- EJECUTAR EN SUPABASE SQL EDITOR:
-- Dashboard → SQL Editor → New query → Pegar este contenido → Run
-- ========================================================================
-- Este script:
-- 1. Actualiza el trigger para filtrar solo approved
-- 2. Resetea adjustments_total a 0 en todas las contribuciones
-- 3. Fuerza recalculo ejecutando el trigger actualizado
-- ========================================================================

BEGIN;

-- PASO 1: Actualizar función del trigger con filtro status='approved'
CREATE OR REPLACE FUNCTION update_contribution_adjustments_total()
RETURNS TRIGGER AS $$
DECLARE
  v_contribution_id UUID;
  v_adjustments_total NUMERIC;
  v_contribution RECORD;
  v_base_amount NUMERIC;
BEGIN
  v_contribution_id := COALESCE(NEW.contribution_id, OLD.contribution_id);
  
  -- CRÍTICO: Solo sumar ajustes con status='approved'
  SELECT COALESCE(SUM(amount), 0)
  INTO v_adjustments_total
  FROM contribution_adjustments
  WHERE contribution_id = v_contribution_id
    AND status = 'approved';  -- ⭐ FILTRO AÑADIDO
  
  -- Obtener datos actuales de la contribución
  SELECT * INTO v_contribution
  FROM contributions
  WHERE id = v_contribution_id;
  
  -- El base_amount original es expected_amount - adjustments_total anterior
  v_base_amount := v_contribution.expected_amount - COALESCE(v_contribution.adjustments_total, 0);
  
  -- Actualizar contribución
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
  'Actualiza adjustments_total solo con ajustes APPROVED y recalcula expected_amount automáticamente';

-- PASO 2: Resetear adjustments_total en todas las contribuciones
-- Esto prepara el terreno para el recalculo limpio
UPDATE contributions
SET 
  adjustments_total = 0,
  expected_amount = expected_amount - COALESCE(adjustments_total, 0),
  updated_at = NOW()
WHERE adjustments_total IS NOT NULL AND adjustments_total != 0;

-- PASO 3: Forzar recalculo de todas las contribuciones que tienen ajustes
-- Esto ejecutará el trigger actualizado con el filtro correcto
DO $$
DECLARE
  contribution_record RECORD;
BEGIN
  FOR contribution_record IN 
    SELECT DISTINCT contribution_id 
    FROM contribution_adjustments
  LOOP
    -- Simular un UPDATE para disparar el trigger
    UPDATE contributions
    SET updated_at = NOW()
    WHERE id = contribution_record.contribution_id;
  END LOOP;
END $$;

COMMIT;

-- ========================================================================
-- VERIFICACIÓN POST-EJECUCIÓN:
-- 
-- SELECT c.id, c.profile_id, c.expected_amount, c.adjustments_total,
--        (SELECT COUNT(*) FROM contribution_adjustments ca 
--         WHERE ca.contribution_id = c.id AND ca.status = 'approved') as approved_count,
--        (SELECT COUNT(*) FROM contribution_adjustments ca 
--         WHERE ca.contribution_id = c.id AND ca.status = 'pending') as pending_count
-- FROM contributions c
-- WHERE c.household_id = 'TU_HOUSEHOLD_ID'
--   AND c.year = 2025 AND c.month = 1;
-- 
-- Debe mostrar:
-- - adjustments_total = suma solo de approved (pending no cuenta)
-- - Si pending_count > 0 pero approved_count = 0 → adjustments_total debe ser 0
-- ========================================================================
