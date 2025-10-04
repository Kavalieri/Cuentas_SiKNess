-- ===========================================================================
-- FIX: Actualizar funciones de wipe para usar 'transactions' y 'profile_id'
-- ===========================================================================
-- Las funciones antiguas usaban 'movements' (renombrado a 'transactions')
-- y 'user_id' (ahora es 'profile_id' en household_members)

-- =============================
-- 1. WIPE HOUSEHOLD DATA (actualizado)
-- =============================

CREATE OR REPLACE FUNCTION wipe_household_data(p_household_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_auth_user_id uuid;
  v_profile_id uuid;
  v_role text;
  v_deleted_transactions int;
  v_deleted_categories int;
  v_deleted_contributions int;
  v_deleted_adjustments int;
  v_deleted_incomes int;
  v_deleted_settings int;
BEGIN
  -- Obtener el auth user ID
  v_auth_user_id := auth.uid();
  
  IF v_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  -- Obtener el profile_id del usuario autenticado
  SELECT id INTO v_profile_id
  FROM profiles
  WHERE auth_user_id = v_auth_user_id;

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Perfil no encontrado';
  END IF;

  -- Verificar que el usuario es owner del household
  SELECT role INTO v_role
  FROM household_members
  WHERE household_id = p_household_id
    AND profile_id = v_profile_id;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'No perteneces a este household';
  END IF;

  IF v_role != 'owner' THEN
    RAISE EXCEPTION 'Solo el owner puede ejecutar wipe';
  END IF;

  -- Eliminar datos en orden de dependencias
  -- 1. Adjustments (depende de contributions)
  DELETE FROM contribution_adjustments 
  WHERE contribution_id IN (
    SELECT id FROM contributions WHERE household_id = p_household_id
  );
  GET DIAGNOSTICS v_deleted_adjustments = ROW_COUNT;

  -- 2. Contributions
  DELETE FROM contributions 
  WHERE household_id = p_household_id;
  GET DIAGNOSTICS v_deleted_contributions = ROW_COUNT;

  -- 3. Member incomes
  DELETE FROM member_incomes 
  WHERE household_id = p_household_id;
  GET DIAGNOSTICS v_deleted_incomes = ROW_COUNT;

  -- 4. Household settings
  DELETE FROM household_settings 
  WHERE household_id = p_household_id;
  GET DIAGNOSTICS v_deleted_settings = ROW_COUNT;

  -- 5. Transactions (anteriormente movements)
  DELETE FROM transactions 
  WHERE household_id = p_household_id;
  GET DIAGNOSTICS v_deleted_transactions = ROW_COUNT;

  -- 6. Categories (las recrearemos después)
  DELETE FROM categories 
  WHERE household_id = p_household_id;
  GET DIAGNOSTICS v_deleted_categories = ROW_COUNT;

  -- 7. Recrear categorías por defecto
  PERFORM create_default_categories(p_household_id);

  -- Retornar resumen de lo eliminado
  RETURN json_build_object(
    'success', true,
    'message', 'Datos limpiados correctamente',
    'deleted', json_build_object(
      'transactions', v_deleted_transactions,
      'categories', v_deleted_categories,
      'contributions', v_deleted_contributions,
      'adjustments', v_deleted_adjustments,
      'incomes', v_deleted_incomes,
      'settings', v_deleted_settings
    )
  );
END;
$$;

COMMENT ON FUNCTION wipe_household_data(uuid) IS 
'Limpia todos los datos del household excepto miembros. Solo para owners. Uso: testing.';

-- =============================
-- 2. WIPE SYSTEM DATA (actualizado)
-- =============================

CREATE OR REPLACE FUNCTION wipe_system_data()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_transactions int;
  v_deleted_categories int;
  v_deleted_contributions int;
  v_deleted_adjustments int;
  v_deleted_incomes int;
  v_deleted_settings int;
  v_deleted_invitations int;
  v_deleted_user_settings int;
  v_deleted_members int;
  v_deleted_households int;
  v_deleted_profiles int;
BEGIN
  -- Verificar que el usuario es system admin
  IF NOT EXISTS (
    SELECT 1 FROM system_admins 
    WHERE user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Solo los administradores del sistema pueden ejecutar esta acción';
  END IF;

  -- Eliminar datos en orden de dependencias
  DELETE FROM contribution_adjustments;
  GET DIAGNOSTICS v_deleted_adjustments = ROW_COUNT;

  DELETE FROM contributions;
  GET DIAGNOSTICS v_deleted_contributions = ROW_COUNT;

  DELETE FROM member_incomes;
  GET DIAGNOSTICS v_deleted_incomes = ROW_COUNT;

  DELETE FROM household_settings;
  GET DIAGNOSTICS v_deleted_settings = ROW_COUNT;

  DELETE FROM transactions;
  GET DIAGNOSTICS v_deleted_transactions = ROW_COUNT;

  DELETE FROM categories;
  GET DIAGNOSTICS v_deleted_categories = ROW_COUNT;

  DELETE FROM invitations;
  GET DIAGNOSTICS v_deleted_invitations = ROW_COUNT;

  DELETE FROM user_settings;
  GET DIAGNOSTICS v_deleted_user_settings = ROW_COUNT;

  DELETE FROM household_members;
  GET DIAGNOSTICS v_deleted_members = ROW_COUNT;

  DELETE FROM households;
  GET DIAGNOSTICS v_deleted_households = ROW_COUNT;

  -- Eliminar profiles NO protegidos (no system admins)
  DELETE FROM profiles 
  WHERE auth_user_id NOT IN (
    SELECT user_id FROM system_admins
  );
  GET DIAGNOSTICS v_deleted_profiles = ROW_COUNT;

  -- Retornar resumen
  RETURN json_build_object(
    'success', true,
    'message', 'Sistema limpiado correctamente',
    'deleted', json_build_object(
      'transactions', v_deleted_transactions,
      'categories', v_deleted_categories,
      'contributions', v_deleted_contributions,
      'adjustments', v_deleted_adjustments,
      'incomes', v_deleted_incomes,
      'settings', v_deleted_settings,
      'invitations', v_deleted_invitations,
      'user_settings', v_deleted_user_settings,
      'members', v_deleted_members,
      'households', v_deleted_households,
      'profiles', v_deleted_profiles
    )
  );
END;
$$;

COMMENT ON FUNCTION wipe_system_data() IS 
'Limpia TODOS los datos excepto system_admins y auth.users. Solo para system admins.';

-- =============================
-- 3. RESTORE TO STOCK (actualizado)
-- =============================

CREATE OR REPLACE FUNCTION restore_to_stock()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  wipe_result json;
  v_deleted_auth_users int := 0;
BEGIN
  -- Verificar que el usuario es system admin
  IF NOT EXISTS (
    SELECT 1 FROM system_admins 
    WHERE user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Solo los administradores del sistema pueden ejecutar esta acción';
  END IF;

  -- Limpiar todos los datos del sistema
  wipe_result := wipe_system_data();

  -- Eliminar usuarios de auth NO protegidos
  DELETE FROM auth.users
  WHERE id NOT IN (
    SELECT user_id FROM system_admins
  );
  GET DIAGNOSTICS v_deleted_auth_users = ROW_COUNT;

  -- Retornar resultado combinado
  RETURN json_build_object(
    'success', true,
    'message', 'Sistema restaurado a stock',
    'wipe_result', wipe_result,
    'deleted_auth_users', v_deleted_auth_users,
    'note', 'Ejecuta seed.sql manualmente para recrear datos de prueba'
  );
END;
$$;

COMMENT ON FUNCTION restore_to_stock() IS 
'Limpia TODO el sistema incluyendo auth.users. Solo para system admins. Requiere seed manual después.';
