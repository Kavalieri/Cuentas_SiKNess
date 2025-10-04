-- ========================================================================
-- CORRECCIÓN URGENTE: created_by debe referenciar profiles.id
-- ========================================================================
-- EJECUTAR ESTE SCRIPT EN SUPABASE SQL EDITOR
-- ========================================================================

BEGIN;

-- 1. Eliminar las FK actuales
ALTER TABLE contribution_adjustments
  DROP CONSTRAINT IF EXISTS contribution_adjustments_created_by_fkey;

ALTER TABLE contribution_adjustments
  DROP CONSTRAINT IF EXISTS contribution_adjustments_approved_by_fkey;

ALTER TABLE contribution_adjustments
  DROP CONSTRAINT IF EXISTS contribution_adjustments_rejected_by_fkey;

-- 2. Actualizar datos existentes (migrar auth_user_id → profile_id)
UPDATE contribution_adjustments ca
SET created_by = p.id
FROM profiles p
WHERE ca.created_by = p.auth_user_id;

UPDATE contribution_adjustments ca
SET approved_by = p.id
FROM profiles p
WHERE ca.approved_by = p.auth_user_id
  AND ca.approved_by IS NOT NULL;

UPDATE contribution_adjustments ca
SET rejected_by = p.id
FROM profiles p
WHERE ca.rejected_by = p.auth_user_id
  AND ca.rejected_by IS NOT NULL;

-- 3. Recrear FKs apuntando a profiles.id
ALTER TABLE contribution_adjustments
  ADD CONSTRAINT contribution_adjustments_created_by_fkey 
    FOREIGN KEY (created_by) 
    REFERENCES profiles(id);

ALTER TABLE contribution_adjustments
  ADD CONSTRAINT contribution_adjustments_approved_by_fkey 
    FOREIGN KEY (approved_by) 
    REFERENCES profiles(id);

ALTER TABLE contribution_adjustments
  ADD CONSTRAINT contribution_adjustments_rejected_by_fkey 
    FOREIGN KEY (rejected_by) 
    REFERENCES profiles(id);

-- 4. Actualizar comentarios
COMMENT ON COLUMN contribution_adjustments.created_by IS 
  'Profile ID del miembro que creó el ajuste';

COMMENT ON COLUMN contribution_adjustments.approved_by IS 
  'Profile ID del owner que aprobó el ajuste';

COMMENT ON COLUMN contribution_adjustments.rejected_by IS 
  'Profile ID del owner que rechazó el ajuste';

COMMIT;
