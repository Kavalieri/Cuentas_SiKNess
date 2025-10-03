-- Migración: Sistema de limpieza de invitaciones
-- Fecha: 2025-10-03
-- Descripción: 
--   1. Eliminar invitaciones canceladas (son errores, no necesitan registro)
--   2. Agregar constraint ON DELETE CASCADE para evitar invitaciones huérfanas
--   3. Función automática para borrar invitaciones expiradas

-- =======================
-- 1. LIMPIAR INVITACIONES CANCELADAS
-- =======================

-- Eliminar todas las invitaciones canceladas (son errores del usuario)
DELETE FROM invitations
WHERE status = 'cancelled';

-- =======================
-- 2. CONSTRAINT ON DELETE CASCADE
-- =======================

-- Agregar constraint para que cuando se borre un household, se borren sus invitaciones
ALTER TABLE invitations
DROP CONSTRAINT IF EXISTS invitations_household_id_fkey;

ALTER TABLE invitations
ADD CONSTRAINT invitations_household_id_fkey
FOREIGN KEY (household_id)
REFERENCES households(id)
ON DELETE CASCADE;

-- =======================
-- 3. FUNCIÓN PARA BORRAR INVITACIONES EXPIRADAS
-- =======================

-- Función que borra invitaciones expiradas (más de 7 días)
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Borrar invitaciones pendientes que han expirado
  DELETE FROM invitations
  WHERE status = 'pending'
    AND expires_at < NOW();
    
  -- Log para Supabase
  RAISE NOTICE 'Invitaciones expiradas eliminadas';
END;
$$;

-- Comentario
COMMENT ON FUNCTION cleanup_expired_invitations() IS 
'Elimina invitaciones pendientes que han expirado. Debe ejecutarse periódicamente (ej: cron job).';

-- =======================
-- 4. LIMPIAR INVITACIONES HUÉRFANAS EXISTENTES
-- =======================

-- Eliminar invitaciones que apuntan a households inexistentes
DELETE FROM invitations
WHERE household_id IS NOT NULL
  AND household_id NOT IN (SELECT id FROM households);

-- =======================
-- 5. ÍNDICE PARA PERFORMANCE
-- =======================

-- Índice para mejorar queries de invitaciones expiradas
CREATE INDEX IF NOT EXISTS idx_invitations_expires_at 
ON invitations(expires_at) 
WHERE status = 'pending';

-- Índice para queries por household_id
CREATE INDEX IF NOT EXISTS idx_invitations_household_id 
ON invitations(household_id) 
WHERE household_id IS NOT NULL;
