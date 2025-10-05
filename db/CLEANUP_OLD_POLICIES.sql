-- ========================================================================
-- LIMPIEZA: Eliminar políticas duplicadas y desactualizadas
-- ========================================================================
-- EJECUTAR EN SUPABASE SQL EDITOR después de confirmar que el sistema funciona
-- ========================================================================

-- Eliminar política antigua de INSERT (mantener solo "Members can create pending adjustments")
DROP POLICY IF EXISTS "Members can create adjustments" ON contribution_adjustments;

-- Recrear política de SELECT con la función correcta
DROP POLICY IF EXISTS "Members can view adjustments in their household" ON contribution_adjustments;

CREATE POLICY "Members can view adjustments in their household"
  ON contribution_adjustments
  FOR SELECT
  USING (
    contribution_id IN (
      SELECT c.id 
      FROM contributions c
      JOIN household_members hm ON c.household_id = hm.household_id
      WHERE hm.profile_id = get_profile_id_from_auth()
    )
  );

-- Verificación final
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'contribution_adjustments'
ORDER BY cmd, policyname;
