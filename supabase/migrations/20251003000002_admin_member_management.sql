-- Funciones de administración para gestión de miembros
-- Migration: admin_member_management

-- ============================================================================
-- FUNCIÓN: add_member_to_household (Para Admin Panel)
-- ============================================================================
-- Permite a un system admin agregar cualquier usuario a cualquier household
-- SOLO puede ser ejecutada por system_admins
-- ============================================================================

CREATE OR REPLACE FUNCTION admin_add_member_to_household(
  p_household_id uuid,
  p_user_id uuid,
  p_role text DEFAULT 'member'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_household_name text;
  v_user_email text;
  v_existing_member boolean;
BEGIN
  -- Verificar que el usuario es system admin
  IF NOT is_system_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Solo los administradores del sistema pueden ejecutar esta función';
  END IF;

  -- Validar rol
  IF p_role NOT IN ('owner', 'member') THEN
    RAISE EXCEPTION 'Rol inválido. Debe ser "owner" o "member"';
  END IF;

  -- Verificar que el household existe
  SELECT name INTO v_household_name
  FROM households
  WHERE id = p_household_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Household no encontrado';
  END IF;

  -- Verificar que el usuario existe
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuario no encontrado';
  END IF;

  -- Verificar si ya es miembro
  SELECT EXISTS(
    SELECT 1 FROM household_members
    WHERE household_id = p_household_id
    AND user_id = p_user_id
  ) INTO v_existing_member;

  IF v_existing_member THEN
    RAISE EXCEPTION 'El usuario ya es miembro de este household';
  END IF;

  -- Insertar miembro
  INSERT INTO household_members (household_id, user_id, role)
  VALUES (p_household_id, p_user_id, p_role);

  RAISE NOTICE '[admin_add_member_to_household] Added user % to household % as %', 
    v_user_email, v_household_name, p_role;

  RETURN json_build_object(
    'success', true,
    'household_id', p_household_id,
    'household_name', v_household_name,
    'user_id', p_user_id,
    'user_email', v_user_email,
    'role', p_role
  );
END;
$$;

COMMENT ON FUNCTION admin_add_member_to_household(uuid, uuid, text) IS
  'Permite a system admins agregar miembros a cualquier household. Bypasea RLS.';

GRANT EXECUTE ON FUNCTION admin_add_member_to_household(uuid, uuid, text) TO authenticated;

-- ============================================================================
-- FUNCIÓN: remove_member_from_household (Para Admin Panel)
-- ============================================================================
-- Permite a un system admin remover cualquier usuario de cualquier household
-- SOLO puede ser ejecutada por system_admins
-- Protege contra eliminar el último owner
-- ============================================================================

CREATE OR REPLACE FUNCTION admin_remove_member_from_household(
  p_household_id uuid,
  p_user_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_household_name text;
  v_user_email text;
  v_member_role text;
  v_owner_count int;
BEGIN
  -- Verificar que el usuario es system admin
  IF NOT is_system_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Solo los administradores del sistema pueden ejecutar esta función';
  END IF;

  -- Obtener información del miembro
  SELECT hm.role, h.name, u.email
  INTO v_member_role, v_household_name, v_user_email
  FROM household_members hm
  JOIN households h ON h.id = hm.household_id
  LEFT JOIN auth.users u ON u.id = hm.user_id
  WHERE hm.household_id = p_household_id
  AND hm.user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Miembro no encontrado en este household';
  END IF;

  -- Si es owner, verificar que no es el último
  IF v_member_role = 'owner' THEN
    SELECT COUNT(*)
    INTO v_owner_count
    FROM household_members
    WHERE household_id = p_household_id
    AND role = 'owner';

    IF v_owner_count <= 1 THEN
      RAISE EXCEPTION 'No se puede eliminar al único owner del household';
    END IF;
  END IF;

  -- Eliminar miembro
  DELETE FROM household_members
  WHERE household_id = p_household_id
  AND user_id = p_user_id;

  RAISE NOTICE '[admin_remove_member_from_household] Removed user % from household %', 
    v_user_email, v_household_name;

  RETURN json_build_object(
    'success', true,
    'household_id', p_household_id,
    'household_name', v_household_name,
    'user_id', p_user_id,
    'user_email', v_user_email,
    'removed_role', v_member_role
  );
END;
$$;

COMMENT ON FUNCTION admin_remove_member_from_household(uuid, uuid) IS
  'Permite a system admins remover miembros de cualquier household. Protege contra eliminar último owner.';

GRANT EXECUTE ON FUNCTION admin_remove_member_from_household(uuid, uuid) TO authenticated;
