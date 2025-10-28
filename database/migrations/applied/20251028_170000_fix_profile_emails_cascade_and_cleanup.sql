-- ============================================
-- Migración: Fix CASCADE DELETE en profile_emails + Limpieza
-- Fecha: 2025-10-28 17:00:00
-- Descripción:
--   1. Añade ON DELETE CASCADE a profile_emails.profile_id FK
--   2. Elimina emails huérfanos de perfiles soft-deleted
--   3. Asegura que cuando se borra un perfil (soft delete),
--      sus emails secundarios también se eliminan automáticamente
-- ============================================

BEGIN;

-- 1. Eliminar emails huérfanos de perfiles con deleted_at IS NOT NULL
DELETE FROM profile_emails
WHERE profile_id IN (
  SELECT id FROM profiles WHERE deleted_at IS NOT NULL
);

-- 2. Modificar la FK para añadir ON DELETE CASCADE
-- Primero eliminamos la constraint existente
ALTER TABLE profile_emails
DROP CONSTRAINT IF EXISTS profile_emails_profile_id_fkey;

-- Recreamos la constraint con CASCADE
ALTER TABLE profile_emails
ADD CONSTRAINT profile_emails_profile_id_fkey
  FOREIGN KEY (profile_id)
  REFERENCES profiles(id)
  ON DELETE CASCADE;

-- 3. Comentario explicativo
COMMENT ON CONSTRAINT profile_emails_profile_id_fkey ON profile_emails IS
  'FK con CASCADE: cuando se elimina un perfil (incluso soft delete manual), sus emails secundarios se eliminan automáticamente';

COMMIT;

-- Verificación post-migración:
-- SELECT pe.email, p.deleted_at
-- FROM profile_emails pe
-- LEFT JOIN profiles p ON p.id = pe.profile_id
-- WHERE p.deleted_at IS NOT NULL;
-- (debe retornar 0 filas)
