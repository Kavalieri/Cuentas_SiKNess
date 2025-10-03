-- Script para limpiar invitaciones huérfanas manualmente
-- Ejecutar en Supabase SQL Editor si la migración no funcionó

-- Ver invitaciones huérfanas
SELECT 
  i.id,
  i.email,
  i.household_id,
  i.status,
  i.expires_at,
  h.id as household_exists
FROM invitations i
LEFT JOIN households h ON i.household_id = h.id
WHERE i.household_id IS NOT NULL
  AND h.id IS NULL;

-- Eliminar invitaciones huérfanas
DELETE FROM invitations
WHERE household_id IS NOT NULL
  AND household_id NOT IN (SELECT id FROM households);
