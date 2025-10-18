-- Corrige funciones de triggers en household_members que usaban columnas inexistentes
-- Reemplaza referencias a id/created_at/updated_at por profile_id/joined_at y elimina updated_at

-- ensure_household_owner: garantiza al menos un owner por hogar en inserción o downgrade de rol
CREATE OR REPLACE FUNCTION public.ensure_household_owner() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.role = 'member' AND OLD.role = 'owner') THEN
    -- ¿Queda algún owner (excluyendo el propio NEW en caso de UPDATE)?
    IF NOT EXISTS (
      SELECT 1
      FROM household_members hm
      WHERE hm.household_id = NEW.household_id
        AND hm.role = 'owner'
        AND (TG_OP = 'INSERT' OR hm.profile_id <> NEW.profile_id)
    ) THEN
      -- Promocionar al miembro más antiguo (por joined_at)
      UPDATE household_members hm
      SET role = 'owner',
          is_owner = TRUE
      WHERE hm.household_id = NEW.household_id
        AND hm.profile_id = (
          SELECT profile_id
          FROM household_members
          WHERE household_id = NEW.household_id
          ORDER BY joined_at ASC
          LIMIT 1
        );
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ensure_last_member_is_owner: tras borrar un miembro, si no quedan owners, promociona al más antiguo
CREATE OR REPLACE FUNCTION public.ensure_last_member_is_owner() RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_remaining_members INTEGER;
  v_remaining_owners INTEGER;
  v_last_profile UUID;
  v_last_role TEXT;
BEGIN
  -- Miembros restantes
  SELECT COUNT(*) INTO v_remaining_members
  FROM household_members
  WHERE household_id = OLD.household_id;

  IF v_remaining_members = 0 THEN
    RETURN OLD;
  END IF;

  -- Owners restantes
  SELECT COUNT(*) INTO v_remaining_owners
  FROM household_members
  WHERE household_id = OLD.household_id
    AND role = 'owner';

  IF v_remaining_owners > 0 THEN
    RETURN OLD;
  END IF;

  -- Promocionar al miembro más antiguo por joined_at
  SELECT profile_id, role
  INTO v_last_profile, v_last_role
  FROM household_members
  WHERE household_id = OLD.household_id
  ORDER BY joined_at ASC
  LIMIT 1;

  IF v_last_role IS DISTINCT FROM 'owner' THEN
    UPDATE household_members
    SET role = 'owner',
        is_owner = TRUE
    WHERE household_id = OLD.household_id
      AND profile_id = v_last_profile;
  END IF;

  RETURN OLD;
END;
$$;
