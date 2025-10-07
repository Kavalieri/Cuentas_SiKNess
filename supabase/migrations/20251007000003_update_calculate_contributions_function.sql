-- Migración: Agregar soporte para calculation_type en función de cálculo de contribuciones
-- Fecha: 2025-10-07
-- Propósito: Modificar calculate_monthly_contributions() para soportar equal/proportional/custom

-- PASO 1: DROP función existente (cambio en return type)
DROP FUNCTION IF EXISTS calculate_monthly_contributions(UUID, INTEGER, INTEGER);

-- PASO 2: Recrear función con soporte para calculation_type

CREATE OR REPLACE FUNCTION calculate_monthly_contributions(
  p_household_id UUID,
  p_year INTEGER,
  p_month INTEGER
)
RETURNS TABLE(
  profile_id UUID,
  expected_amount NUMERIC,
  income_percentage NUMERIC,
  calculation_method TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_goal NUMERIC;
  v_calculation_type TEXT;
  v_total_income NUMERIC;
  v_reference_date DATE;
  v_member_count INTEGER;
BEGIN
  -- Fecha de referencia: primer día del mes
  v_reference_date := MAKE_DATE(p_year, p_month, 1);
  
  -- Obtener meta de contribución Y tipo de cálculo
  SELECT monthly_contribution_goal, calculation_type
  INTO v_goal, v_calculation_type
  FROM household_settings
  WHERE household_id = p_household_id;
  
  IF v_goal IS NULL THEN
    RAISE EXCEPTION 'Household settings not configured';
  END IF;
  
  -- Por defecto, usar proporcional si no está configurado
  IF v_calculation_type IS NULL THEN
    v_calculation_type := 'proportional';
  END IF;
  
  -- Obtener número de miembros
  SELECT COUNT(*)
  INTO v_member_count
  FROM household_members hm
  WHERE hm.household_id = p_household_id;
  
  IF v_member_count = 0 THEN
    RAISE EXCEPTION 'No members in household';
  END IF;
  
  -- BRANCH: Tipo de cálculo
  IF v_calculation_type = 'equal' THEN
    -- ========================================
    -- EQUAL: División en partes iguales
    -- ========================================
    RETURN QUERY
    SELECT 
      hm.profile_id,
      ROUND(v_goal / v_member_count, 2) AS expected_amount,
      ROUND(100.0 / v_member_count, 2) AS income_percentage,
      'equal'::TEXT AS calculation_method
    FROM household_members hm
    WHERE hm.household_id = p_household_id;
    
  ELSIF v_calculation_type = 'proportional' THEN
    -- ========================================
    -- PROPORTIONAL: Según ingresos
    -- ========================================
    
    -- Calcular ingreso total del hogar
    SELECT SUM(get_member_income(p_household_id, hm.profile_id, v_reference_date))
    INTO v_total_income
    FROM household_members hm
    WHERE hm.household_id = p_household_id;
    
    IF v_total_income IS NULL OR v_total_income = 0 THEN
      RAISE EXCEPTION 'No incomes configured for household members. Configure incomes first or switch to equal calculation.';
    END IF;
    
    -- Retornar contribución proporcional por miembro
    RETURN QUERY
    SELECT 
      hm.profile_id,
      ROUND(
        (get_member_income(p_household_id, hm.profile_id, v_reference_date) / v_total_income) * v_goal,
        2
      ) AS expected_amount,
      ROUND(
        (get_member_income(p_household_id, hm.profile_id, v_reference_date) / v_total_income) * 100,
        2
      ) AS income_percentage,
      'proportional'::TEXT AS calculation_method
    FROM household_members hm
    WHERE hm.household_id = p_household_id;
    
  ELSIF v_calculation_type = 'custom' THEN
    -- ========================================
    -- CUSTOM: Usuario edita manualmente
    -- ========================================
    -- Crear contribuciones con expected_amount = 0 (usuario editará después)
    RETURN QUERY
    SELECT 
      hm.profile_id,
      0::NUMERIC AS expected_amount,
      0::NUMERIC AS income_percentage,
      'custom'::TEXT AS calculation_method
    FROM household_members hm
    WHERE hm.household_id = p_household_id;
    
  ELSE
    RAISE EXCEPTION 'Invalid calculation_type: %. Must be equal, proportional, or custom', v_calculation_type;
  END IF;
END;
$$;

COMMENT ON FUNCTION calculate_monthly_contributions IS 
'Calcula contribuciones mensuales según calculation_type:
- equal: División en partes iguales (goal / members)
- proportional: Proporcional a ingresos (requiere member_incomes configurado)
- custom: Usuario edita manualmente (expected_amount = 0 inicialmente)';

-- PASO 2: Agregar índice para optimizar consultas por calculation_type
CREATE INDEX IF NOT EXISTS idx_household_settings_calculation_type 
ON household_settings(calculation_type);

COMMENT ON INDEX idx_household_settings_calculation_type IS 
'Optimiza consultas filtradas por tipo de cálculo de contribuciones';

-- PASO 3: Agregar columna calculation_method a contributions si no existe
-- Para rastrear qué método se usó para calcular cada contribución
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'contributions' 
    AND column_name = 'calculation_method'
  ) THEN
    ALTER TABLE contributions ADD COLUMN calculation_method TEXT;
    COMMENT ON COLUMN contributions.calculation_method IS 
      'Método usado para calcular esta contribución: equal, proportional, custom';
  END IF;
END $$;
