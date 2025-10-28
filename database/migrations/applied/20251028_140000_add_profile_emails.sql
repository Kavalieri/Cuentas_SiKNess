-- =====================================================
-- Migración: Sistema de Email Aliases para Perfiles
-- Fecha: 2025-10-28 14:00:00
-- Descripción: Permite múltiples emails por perfil con
--              gestión de email principal
-- =====================================================

-- 1. Crear tabla de emails secundarios
CREATE TABLE IF NOT EXISTS profile_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false NOT NULL,
  verified BOOLEAN DEFAULT false NOT NULL,
  verified_at TIMESTAMPTZ,
  added_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  added_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Constraints
  CONSTRAINT profile_emails_email_unique UNIQUE (email),
  CONSTRAINT profile_emails_email_valid CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Comentarios de documentación
COMMENT ON TABLE profile_emails IS
  'Emails aliases para perfiles. Permite múltiples emails por usuario con gestión de email principal.';
COMMENT ON COLUMN profile_emails.profile_id IS
  'Referencia al perfil propietario de este email';
COMMENT ON COLUMN profile_emails.email IS
  'Dirección de email. Debe ser única en todo el sistema.';
COMMENT ON COLUMN profile_emails.is_primary IS
  'Indica si este es el email principal del usuario. Solo puede haber uno por perfil.';
COMMENT ON COLUMN profile_emails.verified IS
  'Indica si el email ha sido verificado por el usuario';
COMMENT ON COLUMN profile_emails.verified_at IS
  'Timestamp de cuándo se verificó el email';
COMMENT ON COLUMN profile_emails.added_by IS
  'Referencia al usuario que agregó este email (normalmente el mismo profile_id)';

-- 2. Índices para performance
CREATE INDEX idx_profile_emails_profile_id ON profile_emails(profile_id);
CREATE INDEX idx_profile_emails_email ON profile_emails(email);
CREATE UNIQUE INDEX idx_profile_emails_primary
  ON profile_emails(profile_id)
  WHERE is_primary = true;

-- 3. Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_profile_emails_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_profile_emails_updated_at
  BEFORE UPDATE ON profile_emails
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_emails_updated_at();

-- 4. Función para garantizar UN solo email principal por perfil
CREATE OR REPLACE FUNCTION ensure_single_primary_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Si se está marcando como primary
  IF NEW.is_primary = true THEN
    -- Desmarcar otros emails del mismo perfil
    UPDATE profile_emails
    SET is_primary = false
    WHERE profile_id = NEW.profile_id
      AND id != NEW.id
      AND is_primary = true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ensure_single_primary_email
  BEFORE INSERT OR UPDATE OF is_primary ON profile_emails
  FOR EACH ROW
  WHEN (NEW.is_primary = true)
  EXECUTE FUNCTION ensure_single_primary_email();

-- 5. Función para validar que siempre haya un email principal
CREATE OR REPLACE FUNCTION validate_primary_email_exists()
RETURNS TRIGGER AS $$
DECLARE
  v_primary_count INTEGER;
BEGIN
  -- Después de DELETE o UPDATE que quite el primary
  SELECT COUNT(*) INTO v_primary_count
  FROM profile_emails
  WHERE profile_id = COALESCE(OLD.profile_id, NEW.profile_id)
    AND is_primary = true;

  -- Si no hay ningún primary, promover el más antiguo
  IF v_primary_count = 0 THEN
    UPDATE profile_emails
    SET is_primary = true
    WHERE id = (
      SELECT id
      FROM profile_emails
      WHERE profile_id = COALESCE(OLD.profile_id, NEW.profile_id)
      ORDER BY added_at ASC, id ASC
      LIMIT 1
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_primary_email_exists
  AFTER DELETE OR UPDATE OF is_primary ON profile_emails
  FOR EACH ROW
  EXECUTE FUNCTION validate_primary_email_exists();

-- 6. Migrar emails actuales de profiles a profile_emails
INSERT INTO profile_emails (profile_id, email, is_primary, verified, verified_at, added_at, added_by)
SELECT
  id as profile_id,
  email,
  true as is_primary,
  true as verified,  -- Asumimos que los emails actuales están verificados
  created_at as verified_at,
  created_at as added_at,
  id as added_by  -- El usuario se agregó a sí mismo
FROM profiles
WHERE email IS NOT NULL
  AND email != ''
  AND NOT EXISTS (
    SELECT 1 FROM profile_emails pe WHERE pe.email = profiles.email
  );

-- 7. View helper para obtener email principal fácilmente
CREATE OR REPLACE VIEW v_profile_primary_email AS
SELECT
  p.id as profile_id,
  p.display_name,
  COALESCE(pe.email, p.email) as primary_email,
  pe.verified as email_verified,
  pe.verified_at as email_verified_at
FROM profiles p
LEFT JOIN profile_emails pe ON pe.profile_id = p.id AND pe.is_primary = true;

COMMENT ON VIEW v_profile_primary_email IS
  'Vista helper que retorna el email principal de cada perfil. Fallback a profiles.email si no existe en profile_emails.';

-- 8. Función helper para obtener todos los emails de un perfil
CREATE OR REPLACE FUNCTION get_profile_emails(p_profile_id UUID)
RETURNS TABLE(
  email TEXT,
  is_primary BOOLEAN,
  verified BOOLEAN,
  added_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pe.email,
    pe.is_primary,
    pe.verified,
    pe.added_at
  FROM profile_emails pe
  WHERE pe.profile_id = p_profile_id
  ORDER BY pe.is_primary DESC, pe.added_at ASC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_profile_emails(UUID) IS
  'Retorna todos los emails de un perfil, ordenados por primario primero y luego por antigüedad.';

-- 9. Grants para cuentassik_user
GRANT SELECT, INSERT, UPDATE, DELETE ON profile_emails TO cuentassik_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO cuentassik_user;
GRANT EXECUTE ON FUNCTION get_profile_emails(UUID) TO cuentassik_user;

-- =====================================================
-- ROLLBACK (comentado, descomentar si necesario)
-- =====================================================
-- DROP TRIGGER IF EXISTS trigger_validate_primary_email_exists ON profile_emails;
-- DROP TRIGGER IF EXISTS trigger_ensure_single_primary_email ON profile_emails;
-- DROP TRIGGER IF EXISTS trigger_update_profile_emails_updated_at ON profile_emails;
-- DROP FUNCTION IF EXISTS validate_primary_email_exists();
-- DROP FUNCTION IF EXISTS ensure_single_primary_email();
-- DROP FUNCTION IF EXISTS update_profile_emails_updated_at();
-- DROP FUNCTION IF EXISTS get_profile_emails(UUID);
-- DROP VIEW IF EXISTS v_profile_primary_email;
-- DROP TABLE IF EXISTS profile_emails;
