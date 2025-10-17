-- Ajuste función get_member_income: desempate por created_at DESC
-- Contexto: en Perfil ya usamos ORDER BY effective_from DESC, created_at DESC a nivel de query.
-- Unificamos la lógica en la función para que cualquier consumidor (incluida get_household_members_optimized)
-- obtenga el "ingreso vigente más reciente" determinísticamente.

SET ROLE cuentassik_dev_owner;

CREATE OR REPLACE FUNCTION public.get_member_income(
  p_household_id uuid,
  p_profile_id uuid,
  p_date date DEFAULT CURRENT_DATE
) RETURNS numeric
    LANGUAGE plpgsql
    SECURITY DEFINER
AS $$
DECLARE
  v_income NUMERIC;
  v_exists BOOLEAN;
BEGIN
  -- Verificar si existe al menos un registro de income para este miembro
  SELECT EXISTS (
    SELECT 1
    FROM member_incomes
    WHERE household_id = p_household_id
      AND profile_id = p_profile_id
  ) INTO v_exists;

  -- Si NO existe ningún registro, retornar NULL (sin configurar)
  IF NOT v_exists THEN
    RETURN NULL;
  END IF;

  -- Si existe, buscar el income vigente en la fecha, desempate por created_at DESC
  SELECT monthly_income
  INTO v_income
  FROM member_incomes
  WHERE household_id = p_household_id
    AND profile_id = p_profile_id
    AND effective_from <= p_date
  ORDER BY effective_from DESC, created_at DESC
  LIMIT 1;

  -- Retornar el income encontrado (puede ser 0, que es válido)
  -- Si no hay income vigente en la fecha pero SÍ hay registros, retornar 0
  RETURN COALESCE(v_income, 0);
END;
$$;

RESET ROLE;
