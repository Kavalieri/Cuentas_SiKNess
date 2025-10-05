-- ========================================================================
-- FIX COMPLETO: RLS + Trigger para contribution_adjustments
-- ========================================================================
-- EJECUTAR EN SUPABASE SQL EDITOR: Dashboard → SQL Editor → Pegar y Run
-- ========================================================================
-- Este script corrige 2 problemas críticos:
-- 1. Trigger que filtra solo ajustes approved
-- 2. Políticas RLS que usan profile_id correctamente
-- ========================================================================

BEGIN;

-- ========================================================================
-- PARTE 1: Función helper para obtener profile_id desde auth.uid()
-- ========================================================================

CREATE OR REPLACE FUNCTION get_profile_id_from_auth()
RETURNS UUID AS $$
  SELECT id FROM profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_profile_id_from_auth IS 
  'Obtiene el profile_id del usuario autenticado actual';

-- ========================================================================
-- PARTE 2: Actualizar trigger para filtrar solo approved
-- ========================================================================

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

-- ========================================================================
-- PARTE 3: Políticas RLS con get_profile_id_from_auth()
-- ========================================================================

-- Recrear política de UPDATE para owners
DROP POLICY IF EXISTS "Owners can approve/reject adjustments" ON contribution_adjustments;

CREATE POLICY "Owners can approve/reject adjustments"
  ON contribution_adjustments
  FOR UPDATE
  USING (
    contribution_id IN (
      SELECT c.id 
      FROM contributions c
      JOIN household_members hm ON c.household_id = hm.household_id
      WHERE hm.profile_id = get_profile_id_from_auth() 
        AND hm.role = 'owner'
    )
  )
  WITH CHECK (
    contribution_id IN (
      SELECT c.id 
      FROM contributions c
      JOIN household_members hm ON c.household_id = hm.household_id
      WHERE hm.profile_id = get_profile_id_from_auth() 
        AND hm.role = 'owner'
    )
  );

-- Recrear política de INSERT para members
DROP POLICY IF EXISTS "Members can create pending adjustments" ON contribution_adjustments;

CREATE POLICY "Members can create pending adjustments"
  ON contribution_adjustments
  FOR INSERT
  WITH CHECK (
    contribution_id IN (
      SELECT c.id 
      FROM contributions c
      JOIN household_members hm ON c.household_id = hm.household_id
      WHERE hm.profile_id = get_profile_id_from_auth()
    )
    AND status = 'pending'
  );

-- Recrear política de DELETE para owners
DROP POLICY IF EXISTS "Owners can delete pending adjustments" ON contribution_adjustments;

CREATE POLICY "Owners can delete pending adjustments"
  ON contribution_adjustments
  FOR DELETE
  USING (
    status = 'pending'
    AND contribution_id IN (
      SELECT c.id 
      FROM contributions c
      JOIN household_members hm ON c.household_id = hm.household_id
      WHERE hm.profile_id = get_profile_id_from_auth() 
        AND hm.role = 'owner'
    )
  );

COMMIT;

-- ========================================================================
-- VERIFICACIÓN POST-EJECUCIÓN:
-- Ejecuta esto para confirmar que todo funciona:
-- 
-- SELECT 
--   ca.id,
--   ca.status,
--   ca.amount,
--   ca.reason,
--   c.profile_id,
--   c.expected_amount,
--   c.adjustments_total
-- FROM contribution_adjustments ca
-- JOIN contributions c ON ca.contribution_id = c.id
-- WHERE c.household_id = 'TU_HOUSEHOLD_ID'
-- ORDER BY ca.created_at DESC;
-- ========================================================================
