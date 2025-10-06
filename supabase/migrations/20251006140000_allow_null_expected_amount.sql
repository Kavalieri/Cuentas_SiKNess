-- Migration: Allow NULL in contributions.expected_amount
-- Description: Permite que expected_amount sea NULL para miembros sin ingresos configurados
-- Date: 2025-10-06
-- Fixes: ERROR 23502 - null value in column "expected_amount" violates not-null constraint

BEGIN;

-- ========================================================================
-- 1. ALTER TABLE: Permitir NULL en expected_amount
-- ========================================================================

ALTER TABLE contributions 
  ALTER COLUMN expected_amount DROP NOT NULL;

COMMENT ON COLUMN contributions.expected_amount IS 
'Expected contribution amount for the month.
Can be NULL if member income is not configured yet.
Must be configured before contribution can be marked as paid.';

-- ========================================================================
-- 2. Recalcular contribuciones existentes con la nueva lógica
-- ========================================================================

-- Forzar recálculo de octubre 2025 para todos los hogares
WITH all_households AS (
  SELECT DISTINCT household_id FROM household_members
),
calculations AS (
  SELECT 
    ah.household_id,
    calc.profile_id,
    calc.expected_amount
  FROM all_households ah
  CROSS JOIN LATERAL calculate_monthly_contributions(ah.household_id, 2025, 10) AS calc
)
UPDATE contributions c
SET 
  expected_amount = calc.expected_amount,
  updated_at = NOW()
FROM calculations calc
WHERE c.household_id = calc.household_id
  AND c.profile_id = calc.profile_id
  AND c.year = 2025
  AND c.month = 10;

-- ========================================================================
-- 3. Actualizar función auto_recalculate para manejar NULL
-- ========================================================================

-- La función auto_recalculate_contributions ya maneja NULL correctamente
-- porque usa calculate_monthly_contributions que retorna NULL
-- Solo necesitamos asegurar que el EXCEPTION block no lo silencie

CREATE OR REPLACE FUNCTION auto_recalculate_contributions()
RETURNS TRIGGER AS $$
DECLARE
  v_household_id UUID;
  v_year INT;
  v_month INT;
  v_error_msg TEXT;
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
      calc.expected_amount,  -- Puede ser NULL ahora
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
      expected_amount = EXCLUDED.expected_amount,  -- Actualiza incluso si es NULL
      updated_at = NOW();

  EXCEPTION
    WHEN OTHERS THEN
      -- Log del error para debugging
      v_error_msg := SQLERRM;
      RAISE WARNING 'Auto-recalculate contributions failed for household % (%, %): %', 
        v_household_id, v_year, v_month, v_error_msg;
      
      -- No lanzar excepción para no bloquear el trigger padre
      -- El usuario puede calcular manualmente si es necesario
  END;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

-- ========================================================================
-- NOTAS FINALES
-- ========================================================================

-- expected_amount NULL significa: "Miembro sin configurar ingresos"
-- La UI debe mostrar badge "Sin configurar" en lugar de "Aportado 0€"
-- El cálculo proporcional excluye miembros NULL del total_income
-- Al configurar ingresos, el trigger auto_recalculate actualizará automáticamente
