-- Funciones de wipe con protección de admins permanentes del sistema
-- Estas funciones permiten limpiar datos sin eliminar la tabla system_admins

-- ============================================================================
-- FUNCIÓN: wipe_system_data
-- ============================================================================
-- Limpia TODOS los datos del sistema EXCEPTO:
-- - auth.users (gestión de Supabase Auth)
-- - system_admins (administradores permanentes protegidos)
--
-- SOLO puede ser ejecutada por system_admins
-- ============================================================================

CREATE OR REPLACE FUNCTION wipe_system_data()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_counts json;
  movements_count int;
  contributions_count int;
  categories_count int;
  members_count int;
  households_count int;
BEGIN
  -- Verificar que el usuario es system admin
  IF NOT is_system_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Solo los administradores del sistema pueden ejecutar esta función';
  END IF;

  -- Eliminar movimientos (cascada elimina contribution_adjustments)
  DELETE FROM movements;
  GET DIAGNOSTICS movements_count = ROW_COUNT;

  -- Eliminar contribuciones
  DELETE FROM contributions;
  GET DIAGNOSTICS contributions_count = ROW_COUNT;

  -- Eliminar member_incomes
  DELETE FROM member_incomes;

  -- Eliminar household_settings
  DELETE FROM household_settings;

  -- Eliminar categorías
  DELETE FROM categories;
  GET DIAGNOSTICS categories_count = ROW_COUNT;

  -- Eliminar miembros de hogares
  DELETE FROM household_members;
  GET DIAGNOSTICS members_count = ROW_COUNT;

  -- Eliminar hogares
  DELETE FROM households;
  GET DIAGNOSTICS households_count = ROW_COUNT;

  -- NOTA: NO eliminamos system_admins ni auth.users
  -- Esto protege a los administradores permanentes del sistema

  -- Construir objeto JSON con contadores
  deleted_counts := json_build_object(
    'movements', movements_count,
    'contributions', contributions_count,
    'categories', categories_count,
    'household_members', members_count,
    'households', households_count,
    'system_admins_protected', true
  );

  RETURN deleted_counts;
END;
$$;

-- Comentario de la función
COMMENT ON FUNCTION wipe_system_data() IS 
  'Limpia todos los datos del sistema excepto system_admins y auth.users. Solo para system admins.';


-- ============================================================================
-- FUNCIÓN: restore_to_stock
-- ============================================================================
-- Limpia TODOS los datos + Restaura categorías por defecto
-- Ideal para desarrollo/testing
--
-- SOLO puede ser ejecutada por system_admins
-- ============================================================================

CREATE OR REPLACE FUNCTION restore_to_stock()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  wipe_result json;
BEGIN
  -- Verificar que el usuario es system admin
  IF NOT is_system_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Solo los administradores del sistema pueden ejecutar esta función';
  END IF;

  -- Ejecutar wipe completo
  wipe_result := wipe_system_data();

  -- NOTA: NO reseeding automático de categorías por defecto
  -- Esto debe hacerse manualmente después del restore o mediante seed.sql
  -- Razón: Las categorías dependen de household_id, que no existe tras wipe

  RETURN json_build_object(
    'wipe_result', wipe_result,
    'note', 'Sistema restaurado. Ejecuta seed.sql manualmente para categorías por defecto'
  );
END;
$$;

-- Comentario de la función
COMMENT ON FUNCTION restore_to_stock() IS 
  'Limpia todos los datos del sistema y requiere seed manual posterior. Solo para system admins.';


-- ============================================================================
-- PERMISOS
-- ============================================================================

-- Las funciones son SECURITY DEFINER, ejecutan con permisos del owner
-- La verificación de permisos está dentro de cada función con is_system_admin()
