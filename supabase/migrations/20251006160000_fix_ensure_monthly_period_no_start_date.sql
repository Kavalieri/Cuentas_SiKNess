-- Migración: Redefinir ensure_monthly_period sin start_date/end_date
-- Fecha: 2025-10-06 16:00:00
-- Problema: Función ensure_monthly_period todavía referencia columnas start_date/end_date eliminadas
-- Solución: Recrear función sin esas columnas (solo usa year, month, status, opening/closing_balance)

-- DROP y RECREATE para asegurar que no hay referencias viejas
DROP FUNCTION IF EXISTS ensure_monthly_period(UUID, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION ensure_monthly_period(
  p_household_id UUID,
  p_year INTEGER,
  p_month INTEGER
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_period_id UUID;
  v_previous_period RECORD;
  v_previous_year INTEGER;
  v_previous_month INTEGER;
  v_opening_balance NUMERIC := 0;
  v_status TEXT;
  v_current_year INTEGER;
  v_current_month INTEGER;
BEGIN
  -- Buscar período existente
  SELECT id INTO v_period_id
  FROM monthly_periods
  WHERE household_id = p_household_id
    AND year = p_year
    AND month = p_month;
  
  -- Si existe, retornar su ID
  IF FOUND THEN
    RETURN v_period_id;
  END IF;
  
  -- Calcular mes anterior
  IF p_month = 1 THEN
    v_previous_year := p_year - 1;
    v_previous_month := 12;
  ELSE
    v_previous_year := p_year;
    v_previous_month := p_month - 1;
  END IF;
  
  -- Obtener balance de cierre del mes anterior (si existe)
  SELECT closing_balance INTO v_opening_balance
  FROM monthly_periods
  WHERE household_id = p_household_id
    AND year = v_previous_year
    AND month = v_previous_month;
  
  -- Si no hay mes anterior, opening_balance = 0 (por defecto ya asignado)
  
  -- Determinar estado inicial basado en fecha actual
  SELECT 
    EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
    EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER
  INTO v_current_year, v_current_month;
  
  IF p_year = v_current_year AND p_month = v_current_month THEN
    v_status := 'active';
  ELSIF (p_year < v_current_year) OR (p_year = v_current_year AND p_month < v_current_month) THEN
    v_status := 'active'; -- Meses pasados también activos hasta cierre manual
  ELSE
    v_status := 'future'; -- Meses futuros
  END IF;
  
  -- Crear nuevo período (solo columnas year, month, status, balances)
  INSERT INTO monthly_periods (
    household_id,
    year,
    month,
    status,
    opening_balance,
    closing_balance
  ) VALUES (
    p_household_id,
    p_year,
    p_month,
    v_status,
    COALESCE(v_opening_balance, 0),
    COALESCE(v_opening_balance, 0) -- Inicialmente igual al opening
  ) RETURNING id INTO v_period_id;
  
  RETURN v_period_id;
END;
$$;

COMMENT ON FUNCTION ensure_monthly_period IS 'Obtiene/crea período mensual usando solo year, month (sin start_date/end_date)';
