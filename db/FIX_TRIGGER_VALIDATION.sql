-- ========================================================================
-- FIX: Trigger validate_adjustment_approval usando profile_id correctamente
-- ========================================================================
-- EJECUTAR EN SUPABASE SQL EDITOR inmediatamente
-- ========================================================================

-- Recrear función is_contribution_owner usando get_profile_id_from_auth()
CREATE OR REPLACE FUNCTION is_contribution_owner(p_contribution_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM contributions c
    JOIN household_members hm ON c.household_id = hm.household_id
    WHERE c.id = p_contribution_id
      AND hm.profile_id = get_profile_id_from_auth()  -- ⭐ CAMBIO CRÍTICO
      AND hm.role = 'owner'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION is_contribution_owner IS 
  'Verifica si el usuario autenticado es owner del household de una contribución (usando profile_id)';

-- También actualizar el trigger para usar profile_id en las asignaciones
CREATE OR REPLACE FUNCTION validate_adjustment_approval()
RETURNS TRIGGER AS $$
DECLARE
  v_profile_id UUID;
BEGIN
  -- Si se está aprobando o rechazando, verificar que sea owner
  IF NEW.status IN ('approved', 'rejected') AND OLD.status = 'pending' THEN
    IF NOT is_contribution_owner(NEW.contribution_id) THEN
      RAISE EXCEPTION 'Solo los owners pueden aprobar o rechazar ajustes';
    END IF;
    
    -- Obtener profile_id del usuario autenticado
    v_profile_id := get_profile_id_from_auth();
    
    -- Asignar automáticamente approved_by o rejected_by usando profile_id
    IF NEW.status = 'approved' THEN
      NEW.approved_by = v_profile_id;  -- ⭐ USAR profile_id
      NEW.approved_at = NOW();
    ELSIF NEW.status = 'rejected' THEN
      NEW.rejected_by = v_profile_id;  -- ⭐ USAR profile_id
      NEW.rejected_at = NOW();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION validate_adjustment_approval IS 
  'Valida que solo owners puedan aprobar/rechazar ajustes y asigna approved_by/rejected_by usando profile_id';
