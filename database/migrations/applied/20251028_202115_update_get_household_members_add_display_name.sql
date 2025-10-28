-- Migración: Actualizar get_household_members_optimized para incluir display_name
-- Fecha: 2025-10-28
-- Descripción: Añade display_name al resultado de la función RPC get_household_members_optimized

-- Drop y recrear la función con el nuevo campo
DROP FUNCTION IF EXISTS get_household_members_optimized(uuid);

CREATE OR REPLACE FUNCTION get_household_members_optimized(p_household_id uuid)
RETURNS TABLE(
  profile_id uuid,
  email text,
  display_name text,
  role text,
  joined_at timestamp with time zone,
  current_income numeric
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    hm.profile_id,
    p.email,
    p.display_name,
    hm.role,
    hm.joined_at,
    COALESCE(
      (SELECT get_member_income(p_household_id, hm.profile_id)),
      0
    ) as current_income
  FROM household_members hm
  INNER JOIN profiles p
    ON p.id = hm.profile_id
  WHERE hm.household_id = p_household_id
  ORDER BY
    CASE WHEN hm.role = 'owner' THEN 0 ELSE 1 END,
    hm.joined_at ASC;
END;
$$;

COMMENT ON FUNCTION get_household_members_optimized(uuid) IS
'RPC optimizada que devuelve todos los miembros de un hogar con su email, display_name, rol e ingreso actual. Ordena owners primero, luego por antigüedad.';

-- Grant execute permission to cuentassik_user
GRANT EXECUTE ON FUNCTION get_household_members_optimized(uuid) TO cuentassik_user;
