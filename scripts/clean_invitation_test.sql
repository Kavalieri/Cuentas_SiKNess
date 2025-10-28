-- Script para limpiar datos de prueba de invitación
-- Ejecutar con: psql -h 127.0.0.1 -U cuentassik_user -d cuentassik_dev -f scripts/clean_invitation_test.sql

-- 1. Eliminar perfil temporal de fumetas.sik (si existe y no tiene household)
DELETE FROM profiles
WHERE email = 'fumetas.sik@gmail.com'
  AND id NOT IN (SELECT profile_id FROM household_members);

-- 2. Resetear invitación a estado pendiente (eliminar accepted_at y cambiar status)
UPDATE email_invitations
SET status = 'pending',
    accepted_at = NULL,
    accepted_by_profile_id = NULL,
    metadata = COALESCE(metadata, '{}'::jsonb) - 'accepted_from_ip'
WHERE invited_email = 'fumetas.sik@gmail.com'
  AND status != 'pending';

-- 3. Eliminar email de profile_emails si existe
DELETE FROM profile_emails
WHERE email = 'fumetas.sik@gmail.com';

-- Mostrar estado actual
SELECT 'Profiles with fumetas.sik@gmail.com:' as info;
SELECT id, email, display_name, deleted_at, created_at
FROM profiles
WHERE email = 'fumetas.sik@gmail.com';

SELECT 'Profile emails with fumetas.sik@gmail.com:' as info;
SELECT pe.id, pe.email, p.display_name as profile_owner
FROM profile_emails pe
JOIN profiles p ON p.id = pe.profile_id
WHERE pe.email = 'fumetas.sik@gmail.com';

SELECT 'Email invitations for fumetas.sik@gmail.com:' as info;
SELECT ei.id, ei.token, ei.status, ei.invited_email, ei.expires_at,
       p.display_name as inviter
FROM email_invitations ei
JOIN profiles p ON p.id = ei.profile_id
WHERE ei.invited_email = 'fumetas.sik@gmail.com'
ORDER BY ei.created_at DESC;
