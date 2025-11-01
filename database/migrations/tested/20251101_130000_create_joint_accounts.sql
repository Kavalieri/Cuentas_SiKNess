-- ============================================
-- MIGRACIÓN: Crear entidad "Cuenta Común"
-- Issue #19 - Sistema de Cuenta Común
-- Fecha: 1 Nov 2025
-- Tipo: ESTRUCTURA (oficial - workflow de migraciones)
-- Owner: cuentassik_owner (unificado v2.1.0)
-- ============================================

-- Ejecutar como: sudo -u postgres psql -d cuentassik_dev
-- Dentro de psql: SET ROLE cuentassik_owner;
-- Luego: \i database/migrations/development/20251101_130000_create_joint_accounts.sql

-- 1. Crear tabla joint_accounts
CREATE TABLE joint_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  display_name VARCHAR(100) NOT NULL DEFAULT 'Cuenta Común',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(household_id)
);

COMMENT ON TABLE joint_accounts IS
  'Cuenta conjunta/común de cada hogar. Miembro virtual permanente del sistema.';

COMMENT ON COLUMN joint_accounts.household_id IS
  'Hogar al que pertenece esta cuenta común (uno por hogar).';

COMMENT ON COLUMN joint_accounts.display_name IS
  'Nombre visible de la cuenta común. Default: "Cuenta Común".';

-- 2. Insertar Cuenta Común en TODOS los hogares existentes
INSERT INTO joint_accounts (household_id, display_name)
SELECT id, 'Cuenta Común'
FROM households
ON CONFLICT (household_id) DO NOTHING;

-- 3. Función helper para obtener UUID de Cuenta Común
CREATE OR REPLACE FUNCTION get_joint_account_id(p_household_id UUID)
RETURNS UUID
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_joint_account_id UUID;
BEGIN
  SELECT id INTO v_joint_account_id
  FROM joint_accounts
  WHERE household_id = p_household_id;

  IF v_joint_account_id IS NULL THEN
    RAISE EXCEPTION 'No joint account found for household %', p_household_id;
  END IF;

  RETURN v_joint_account_id;
END;
$$;

COMMENT ON FUNCTION get_joint_account_id IS
  'Obtiene el UUID de la Cuenta Común de un hogar. Lanza excepción si no existe.';

-- 4. Trigger para auto-crear Cuenta Común en nuevos hogares
CREATE OR REPLACE FUNCTION create_joint_account_for_household()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO joint_accounts (household_id, display_name)
  VALUES (NEW.id, 'Cuenta Común');

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_create_joint_account
AFTER INSERT ON households
FOR EACH ROW
EXECUTE FUNCTION create_joint_account_for_household();

COMMENT ON TRIGGER trigger_create_joint_account ON households IS
  'Auto-crea Cuenta Común cuando se crea un nuevo hogar.';

-- 5. Grants para cuentassik_user
GRANT SELECT, INSERT, UPDATE, DELETE ON joint_accounts TO cuentassik_user;
GRANT EXECUTE ON FUNCTION get_joint_account_id TO cuentassik_user;

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Verificar que todos los hogares tienen Cuenta Común
DO $$
DECLARE
  missing_count INTEGER;
  total_households INTEGER;
  total_joint_accounts INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_households FROM households;
  SELECT COUNT(*) INTO total_joint_accounts FROM joint_accounts;

  SELECT COUNT(*) INTO missing_count
  FROM households h
  LEFT JOIN joint_accounts ja ON h.id = ja.household_id
  WHERE ja.id IS NULL;

  IF missing_count > 0 THEN
    RAISE EXCEPTION '% hogares sin Cuenta Común', missing_count;
  END IF;

  RAISE NOTICE '✅ Verificación exitosa:';
  RAISE NOTICE '   - Total hogares: %', total_households;
  RAISE NOTICE '   - Total cuentas comunes: %', total_joint_accounts;
  RAISE NOTICE '   - Hogares sin cuenta común: %', missing_count;
END $$;
