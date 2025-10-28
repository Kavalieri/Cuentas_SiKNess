-- Migration: Create email_invitations table for shared profile access
-- Description: Permite a usuarios generar invitaciones para compartir su perfil con otros emails.
--              El email invitado puede aceptar la invitación y se añade como alias secundario del perfil invitador.

-- Crear tabla email_invitations
CREATE TABLE IF NOT EXISTS email_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    invited_email TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    accepted_by_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Comentarios de columnas
COMMENT ON TABLE email_invitations IS 'Invitaciones para compartir acceso a perfil mediante email secundario';
COMMENT ON COLUMN email_invitations.profile_id IS 'Perfil que genera la invitación (el que comparte su cuenta)';
COMMENT ON COLUMN email_invitations.invited_email IS 'Email invitado a ser alias del perfil';
COMMENT ON COLUMN email_invitations.token IS 'Token único para validar la invitación (UUID)';
COMMENT ON COLUMN email_invitations.expires_at IS 'Fecha de expiración de la invitación (default: 7 días)';
COMMENT ON COLUMN email_invitations.accepted_at IS 'Timestamp cuando se aceptó la invitación';
COMMENT ON COLUMN email_invitations.accepted_by_profile_id IS 'Perfil temporal que aceptó (antes de merge). NULL si aún no aceptada o si perfil fue eliminado';
COMMENT ON COLUMN email_invitations.status IS 'Estado: pending (activa), accepted (aceptada), expired (vencida), cancelled (cancelada por invitador)';
COMMENT ON COLUMN email_invitations.metadata IS 'Datos adicionales: IP, user agent, etc.';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_email_invitations_profile_id ON email_invitations(profile_id);
CREATE INDEX IF NOT EXISTS idx_email_invitations_token ON email_invitations(token);
CREATE INDEX IF NOT EXISTS idx_email_invitations_invited_email ON email_invitations(invited_email);
CREATE INDEX IF NOT EXISTS idx_email_invitations_status ON email_invitations(status);
CREATE INDEX IF NOT EXISTS idx_email_invitations_expires_at ON email_invitations(expires_at) WHERE status = 'pending';

-- Constraint: un email solo puede tener una invitación pendiente por perfil
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_invitations_unique_pending
ON email_invitations(profile_id, invited_email)
WHERE status = 'pending';

-- Registrar migración
INSERT INTO _migrations (migration_name, description)
VALUES (
    '20251028_154704_create_email_invitations.sql',
    'Crea tabla email_invitations para sistema de invitaciones de email compartido'
)
ON CONFLICT (migration_name) DO NOTHING;
