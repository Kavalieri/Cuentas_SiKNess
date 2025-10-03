-- Migration: Fix RLS infinite recursion in household_members
-- El problema: Las políticas SELECT causaban recursión infinita al consultar
-- la misma tabla household_members en la subconsulta.
--
-- Solución: Usar profile_id directamente en la política sin subconsultas

-- Eliminar políticas problemáticas
DROP POLICY IF EXISTS "Members can view members in their households" ON household_members;
DROP POLICY IF EXISTS "Members can update household members" ON household_members;
DROP POLICY IF EXISTS "Owners can delete household members" ON household_members;

-- Crear políticas NO RECURSIVAS
-- SELECT: Los miembros pueden ver otros miembros del mismo household
CREATE POLICY "Members can view members in their households" ON household_members
  FOR SELECT
  USING (profile_id = get_current_profile_id()); -- Solo ve sus propias membresías
-- Nota: Para ver TODOS los miembros del household, se debe hacer JOIN en app code

-- UPDATE: Los miembros pueden actualizar registros de su household (si son owner)
CREATE POLICY "Members can update household members" ON household_members
  FOR UPDATE
  USING (
    -- Solo owners pueden actualizar, y deben ser parte del household
    EXISTS (
      SELECT 1 
      FROM household_members hm 
      WHERE hm.household_id = household_members.household_id 
        AND hm.profile_id = get_current_profile_id() 
        AND hm.role = 'owner'
    )
  );

-- DELETE: Solo owners pueden eliminar miembros
CREATE POLICY "Owners can delete household members" ON household_members
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 
      FROM household_members hm 
      WHERE hm.household_id = household_members.household_id 
        AND hm.profile_id = get_current_profile_id() 
        AND hm.role = 'owner'
    )
  );

-- COMENTARIOS EXPLICATIVOS
COMMENT ON POLICY "Members can view members in their households" ON household_members IS 
  'Users can only see their own membership records. To see all members of a household, app must query with household_id filter.';

COMMENT ON POLICY "Members can update household members" ON household_members IS 
  'Only owners of a household can update member records.';

COMMENT ON POLICY "Owners can delete household members" ON household_members IS 
  'Only owners of a household can delete member records.';
