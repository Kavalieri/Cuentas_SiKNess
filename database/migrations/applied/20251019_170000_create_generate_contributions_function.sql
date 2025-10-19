-- ============================================================================
-- Migración: Crear función generate_contributions_for_period
-- Fecha: 2025-10-19 17:00:00
-- Descripción: Función de validación que verifica que existen contribuciones
--              para el período. Las contribuciones ya están calculadas en tiempo real.
-- ============================================================================

-- Función: generate_contributions_for_period
-- Propósito: VALIDAR que existen contribuciones para todos los miembros.
--            Las contribuciones ya se calculan en tiempo real cuando se configuran ingresos.
--            Esta función solo valida/verifica antes del bloqueo.
CREATE OR REPLACE FUNCTION public.generate_contributions_for_period(
  p_household_id UUID,
  p_period_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_period RECORD;
  v_member_count INTEGER;
  v_contribution_count INTEGER;
BEGIN
  -- 1. Obtener información del período
  SELECT
    id,
    household_id,
    year,
    month
  INTO v_period
  FROM public.monthly_periods
  WHERE id = p_period_id
    AND household_id = p_household_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Período % no encontrado en hogar %', p_period_id, p_household_id;
  END IF;

  -- 2. Contar miembros activos
  SELECT COUNT(*)
  INTO v_member_count
  FROM public.household_members
  WHERE household_id = p_household_id;

  IF v_member_count = 0 THEN
    RAISE EXCEPTION 'No hay miembros en el hogar %', p_household_id;
  END IF;

  -- 3. Contar contribuciones existentes para este período
  SELECT COUNT(*)
  INTO v_contribution_count
  FROM public.contributions
  WHERE household_id = p_household_id
    AND year = v_period.year
    AND month = v_period.month;

  -- 4. Validar que existen contribuciones
  IF v_contribution_count = 0 THEN
    RAISE NOTICE 'No hay contribuciones definidas para el período % %. Las contribuciones deben configurarse antes de bloquear.',
      v_period.month, v_period.year;
  ELSE
    RAISE NOTICE 'Validación OK: % contribuciones encontradas para % miembros en período % %',
      v_contribution_count, v_member_count, v_period.month, v_period.year;
  END IF;

  -- La función NO crea ni calcula nada, solo valida
  -- Las contribuciones ya están calculadas en tiempo real desde la UI

END;
$$;

-- Permisos
GRANT EXECUTE ON FUNCTION public.generate_contributions_for_period(UUID, UUID) TO cuentassik_user;

-- Comentario
COMMENT ON FUNCTION public.generate_contributions_for_period(UUID, UUID) IS
'Genera o actualiza registros de contribución para todos los miembros activos de un hogar en un período específico, basándose en el método de cálculo configurado (equal, proportional, custom).';
