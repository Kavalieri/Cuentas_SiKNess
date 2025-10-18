-- 20251015_ensure_default_category.sql
-- Añade la creación automática de la categoría 'Aportación Cuenta Conjunta' al crear un nuevo hogar
-- Compatible con baseline dual-flow

SET ROLE cuentassik_dev_owner;

DROP FUNCTION IF EXISTS public.create_household_with_owner(text, uuid);

CREATE FUNCTION public.create_household_with_owner(p_name text, p_profile_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_household_id UUID;
    v_category_id UUID;
BEGIN
    -- Crear hogar
    INSERT INTO households (name, created_by_profile_id)
    VALUES (p_name, p_profile_id)
    RETURNING id INTO v_household_id;

    -- Crear miembro owner
    INSERT INTO household_members (household_id, profile_id, role, is_owner, joined_at, invited_by_profile_id)
    VALUES (v_household_id, p_profile_id, 'owner', TRUE, NOW(), p_profile_id);

    -- Crear categoría por defecto 'Aportación Cuenta Conjunta'
    v_category_id := gen_random_uuid();
    INSERT INTO categories (id, household_id, name, icon, type, created_by_profile_id, created_at, updated_by_profile_id, updated_at)
    VALUES (
        v_category_id,
        v_household_id,
        'Aportación Cuenta Conjunta',
        '🏦',
        'income',
        p_profile_id,
        NOW(),
        p_profile_id,
        NOW()
    );

    RETURN v_household_id;
END;
$$;

RESET ROLE;
