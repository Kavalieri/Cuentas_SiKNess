-- ========================================================================
-- CORRECCIÓN: created_by debe referenciar profiles.id
-- ========================================================================
-- Fecha: 2025-10-05
-- 
-- PROBLEMA: 
-- created_by apunta a auth.users(id), pero el resto del sistema usa profiles.id
--
-- SOLUCIÓN:
-- Cambiar FK para que created_by apunte a profiles.id
-- ========================================================================

-- 1. Eliminar la FK actual
ALTER TABLE contribution_adjustments
  DROP CONSTRAINT IF EXISTS contribution_adjustments_created_by_fkey;

-- 2. Actualizar la columna para usar profile_id
-- (Migrar datos existentes: auth_user_id → profile_id)
UPDATE contribution_adjustments ca
SET created_by = p.id
FROM profiles p
WHERE ca.created_by = p.auth_user_id;

-- 3. Recrear FK apuntando a profiles.id
ALTER TABLE contribution_adjustments
  ADD CONSTRAINT contribution_adjustments_created_by_fkey 
    FOREIGN KEY (created_by) 
    REFERENCES profiles(id);

-- 4. Actualizar comentario
COMMENT ON COLUMN contribution_adjustments.created_by IS 
  'Profile ID del miembro que creó el ajuste';

-- 5. Hacer lo mismo con approved_by y rejected_by
ALTER TABLE contribution_adjustments
  DROP CONSTRAINT IF EXISTS contribution_adjustments_approved_by_fkey;

ALTER TABLE contribution_adjustments
  DROP CONSTRAINT IF EXISTS contribution_adjustments_rejected_by_fkey;

-- Migrar datos existentes de approved_by
UPDATE contribution_adjustments ca
SET approved_by = p.id
FROM profiles p
WHERE ca.approved_by = p.auth_user_id
  AND ca.approved_by IS NOT NULL;

-- Migrar datos existentes de rejected_by
UPDATE contribution_adjustments ca
SET rejected_by = p.id
FROM profiles p
WHERE ca.rejected_by = p.auth_user_id
  AND ca.rejected_by IS NOT NULL;

-- Recrear FKs apuntando a profiles.id
ALTER TABLE contribution_adjustments
  ADD CONSTRAINT contribution_adjustments_approved_by_fkey 
    FOREIGN KEY (approved_by) 
    REFERENCES profiles(id);

ALTER TABLE contribution_adjustments
  ADD CONSTRAINT contribution_adjustments_rejected_by_fkey 
    FOREIGN KEY (rejected_by) 
    REFERENCES profiles(id);

-- 6. Actualizar comentarios
COMMENT ON COLUMN contribution_adjustments.approved_by IS 
  'Profile ID del owner que aprobó el ajuste';

COMMENT ON COLUMN contribution_adjustments.rejected_by IS 
  'Profile ID del owner que rechazó el ajuste';
