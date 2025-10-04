-- Arreglar constraint UNIQUE y agregar cálculo automático de contribuciones
-- Fixes: "there is no unique or exclusion constraint matching the ON CONFLICT specification"
-- Feature: Auto-calculate contributions cuando cambian ingresos o meta

BEGIN;

-- ============================================================================
-- PASO 1: Actualizar constraint UNIQUE de contributions
-- ============================================================================

-- Eliminar constraint antiguo con user_id (si existe)
ALTER TABLE contributions DROP CONSTRAINT IF EXISTS contributions_household_user_month_key;

-- Agregar nuevo constraint con profile_id
ALTER TABLE contributions ADD CONSTRAINT contributions_household_profile_month_key 
  UNIQUE (household_id, profile_id, year, month);

COMMENT ON CONSTRAINT contributions_household_profile_month_key ON contributions 
  IS 'Una contribución única por hogar, miembro, año y mes';

-- ============================================================================
-- PASO 2: Función para recalcular contribuciones automáticamente
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_recalculate_contributions()
RETURNS TRIGGER AS $$
DECLARE
  v_household_id UUID;
  v_year INT;
  v_month INT;
BEGIN
  -- Determinar household_id según la tabla que disparó el trigger
  IF TG_TABLE_NAME = 'member_incomes' THEN
    v_household_id := COALESCE(NEW.household_id, OLD.household_id);
  ELSIF TG_TABLE_NAME = 'household_settings' THEN
    v_household_id := COALESCE(NEW.household_id, OLD.household_id);
  END IF;

  -- Obtener mes/año actual
  v_year := EXTRACT(YEAR FROM CURRENT_DATE);
  v_month := EXTRACT(MONTH FROM CURRENT_DATE);

  -- Intentar calcular contribuciones para el mes actual
  BEGIN
    -- Insertar/actualizar contribuciones usando la función de cálculo
    INSERT INTO contributions (household_id, profile_id, year, month, expected_amount, paid_amount, status)
    SELECT 
      v_household_id,
      calc.profile_id,
      v_year,
      v_month,
      calc.expected_amount,
      COALESCE(c.paid_amount, 0),
      COALESCE(c.status, 'pending')
    FROM calculate_monthly_contributions(v_household_id, v_year, v_month) AS calc
    LEFT JOIN contributions c 
      ON c.household_id = v_household_id 
      AND c.profile_id = calc.profile_id
      AND c.year = v_year 
      AND c.month = v_month
    ON CONFLICT (household_id, profile_id, year, month) 
    DO UPDATE SET
      expected_amount = EXCLUDED.expected_amount,
      updated_at = NOW();

  EXCEPTION
    WHEN OTHERS THEN
      -- Silenciar errores (ej: configuración incompleta)
      -- El usuario puede calcular manualmente si es necesario
      RAISE NOTICE 'Auto-recalculate contributions skipped: %', SQLERRM;
  END;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION auto_recalculate_contributions 
  IS 'Recalcula automáticamente las contribuciones del mes actual cuando cambian ingresos o meta';

-- ============================================================================
-- PASO 3: Triggers para auto-recalcular
-- ============================================================================

-- Trigger en member_incomes (cuando cambian ingresos de miembros)
DROP TRIGGER IF EXISTS trigger_auto_recalc_on_income_change ON member_incomes;
CREATE TRIGGER trigger_auto_recalc_on_income_change
  AFTER INSERT OR UPDATE OR DELETE ON member_incomes
  FOR EACH ROW
  EXECUTE FUNCTION auto_recalculate_contributions();

-- Trigger en household_settings (cuando cambia la meta del hogar)
DROP TRIGGER IF EXISTS trigger_auto_recalc_on_goal_change ON household_settings;
CREATE TRIGGER trigger_auto_recalc_on_goal_change
  AFTER INSERT OR UPDATE OF monthly_contribution_goal ON household_settings
  FOR EACH ROW
  EXECUTE FUNCTION auto_recalculate_contributions();

COMMENT ON TRIGGER trigger_auto_recalc_on_income_change ON member_incomes 
  IS 'Recalcula contribuciones cuando cambian los ingresos';

COMMENT ON TRIGGER trigger_auto_recalc_on_goal_change ON household_settings 
  IS 'Recalcula contribuciones cuando cambia la meta mensual';

COMMIT;
