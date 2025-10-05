-- ========================================================================
-- FIX CRÍTICO: Solo ajustes APPROVED deben afectar cálculo de contribución
-- ========================================================================
-- EJECUTAR EN SUPABASE SQL EDITOR
-- ========================================================================

BEGIN;

-- Actualizar función del trigger para filtrar por status='approved'
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
  'Actualiza adjustments_total solo con ajustes APPROVED y recalcula expected_amount automáticamente';

COMMIT;
