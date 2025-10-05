-- ========================================================================
-- FIX: Políticas RLS de contribution_adjustments con profile_id
-- ========================================================================
-- Las políticas actuales usan auth.uid() pero los campos approved_by/rejected_by
-- apuntan a profiles.id, no auth.users.id
-- ========================================================================

BEGIN;

-- Función helper para obtener profile_id desde auth.uid()
CREATE OR REPLACE FUNCTION get_profile_id_from_auth()
RETURNS UUID AS $$
  SELECT id FROM profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

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
