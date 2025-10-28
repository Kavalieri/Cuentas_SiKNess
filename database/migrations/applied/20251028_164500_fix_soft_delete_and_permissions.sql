-- Migration: Fix soft delete validation and grant email_invitations permissions
-- Description:
--   1. Otorga permisos SELECT, INSERT, UPDATE, DELETE sobre email_invitations a cuentassik_user
--   2. Documenta que las validaciones de duplicados en código deben filtrar deleted_at IS NULL
--
-- PROBLEMA RESUELTO:
--   - Error "permission denied for table email_invitations" (código 42501)
--   - Perfiles eliminados (deleted_at NOT NULL) siguen bloqueando re-invitaciones
--
-- NOTA: Las validaciones de duplicados se corrigen en email-actions.ts para filtrar deleted_at IS NULL

-- 1. Otorgar permisos sobre email_invitations al rol de aplicación
GRANT SELECT, INSERT, UPDATE, DELETE ON email_invitations TO cuentassik_user;

-- 2. Comentario explicativo
COMMENT ON TABLE email_invitations IS 'Invitaciones para compartir acceso a perfil mediante email secundario. Permisos: cuentassik_user tiene SELECT, INSERT, UPDATE, DELETE';

-- Registrar migración
INSERT INTO _migrations (migration_name, description)
VALUES (
    '20251028_164500_fix_soft_delete_and_permissions.sql',
    'Otorga permisos sobre email_invitations y documenta que validaciones de código deben filtrar deleted_at IS NULL'
)
ON CONFLICT (migration_name) DO NOTHING;
