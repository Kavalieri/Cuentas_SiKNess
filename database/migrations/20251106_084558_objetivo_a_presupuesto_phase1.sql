-- ============================================
-- Migración: Cambio "Objetivo" → "Presupuesto" (Fase 1)
-- Fecha: 2025-11-06
-- Autor: CuentasSiK Team
-- Issue: #25
-- Descripción: Añade columnas "budget" manteniendo columnas "goal" legacy
--              para transición suave sin breaking changes
-- ============================================

BEGIN;

-- ============================================
-- VERIFICACIÓN PREVIA: Estado actual
-- ============================================

DO $$
DECLARE
  goal_exists BOOLEAN;
  budget_exists BOOLEAN;
BEGIN
  -- Verificar si monthly_contribution_goal existe
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'household_settings'
      AND column_name = 'monthly_contribution_goal'
  ) INTO goal_exists;

  -- Verificar si monthly_budget ya existe (migración previa?)
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'household_settings'
      AND column_name = 'monthly_budget'
  ) INTO budget_exists;

  IF NOT goal_exists THEN
    RAISE EXCEPTION 'Columna monthly_contribution_goal no existe. Schema incorrecto.';
  END IF;

  IF budget_exists THEN
    RAISE NOTICE 'Columna monthly_budget ya existe. Posible re-ejecución de migración.';
  ELSE
    RAISE NOTICE 'Columna monthly_budget no existe. Procederemos con la creación.';
  END IF;
END $$;

-- ============================================
-- TABLA 1: household_settings
-- ============================================

-- Añadir nueva columna (NO eliminar la antigua aún)
ALTER TABLE household_settings
  ADD COLUMN IF NOT EXISTS monthly_budget NUMERIC(10,2);

COMMENT ON COLUMN household_settings.monthly_budget IS
  'Presupuesto mensual del hogar (reemplaza monthly_contribution_goal). Monto total destinado a gastos comunes cada mes.';

-- Copiar datos existentes (solo si no hay datos en monthly_budget)
UPDATE household_settings
  SET monthly_budget = monthly_contribution_goal
  WHERE monthly_budget IS NULL
    AND monthly_contribution_goal IS NOT NULL;

-- Añadir constraint de validación
ALTER TABLE household_settings
  DROP CONSTRAINT IF EXISTS check_monthly_budget_positive;

ALTER TABLE household_settings
  ADD CONSTRAINT check_monthly_budget_positive
  CHECK (monthly_budget IS NULL OR (monthly_budget >= 0 AND monthly_budget <= 10000000));

-- ============================================
-- TABLA 2: monthly_periods
-- ============================================

-- Añadir nueva columna para snapshot
ALTER TABLE monthly_periods
  ADD COLUMN IF NOT EXISTS snapshot_budget NUMERIC(10,2);

COMMENT ON COLUMN monthly_periods.snapshot_budget IS
  'Snapshot del presupuesto mensual al momento de validar/bloquear el período.
   NULL = período en preparing (usa valor actual de household_settings.monthly_budget).
   NOT NULL = período validado/cerrado (usa este valor histórico para cálculos).
   Se guarda automáticamente al ejecutar lock_contributions_period() en fase validation→active.';

-- Copiar snapshots existentes (solo si no hay datos en snapshot_budget)
UPDATE monthly_periods
  SET snapshot_budget = snapshot_contribution_goal
  WHERE snapshot_budget IS NULL
    AND snapshot_contribution_goal IS NOT NULL;

-- ============================================
-- ÍNDICES (Opcional - mejora performance)
-- ============================================

CREATE INDEX IF NOT EXISTS idx_household_settings_budget
  ON household_settings(household_id, monthly_budget)
  WHERE monthly_budget IS NOT NULL;

COMMENT ON INDEX idx_household_settings_budget IS
  'Índice para búsquedas rápidas de hogares con presupuesto configurado';

-- ============================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- ============================================

DO $$
DECLARE
  mismatch_count_settings INT;
  mismatch_count_periods INT;
  settings_total INT;
  periods_total INT;
BEGIN
  -- Verificar household_settings: ambas columnas coinciden
  SELECT COUNT(*)
  INTO mismatch_count_settings
  FROM household_settings
  WHERE COALESCE(monthly_budget, 0) != COALESCE(monthly_contribution_goal, 0);

  SELECT COUNT(*) INTO settings_total FROM household_settings;

  IF mismatch_count_settings > 0 THEN
    RAISE EXCEPTION 'Migración falló: % de % filas en household_settings con datos inconsistentes',
      mismatch_count_settings, settings_total;
  END IF;

  RAISE NOTICE '✅ Verificación OK: household_settings migrada correctamente (% filas)', settings_total;

  -- Verificar monthly_periods: ambas columnas coinciden
  SELECT COUNT(*)
  INTO mismatch_count_periods
  FROM monthly_periods
  WHERE COALESCE(snapshot_budget, 0) != COALESCE(snapshot_contribution_goal, 0);

  SELECT COUNT(*) INTO periods_total FROM monthly_periods;

  IF mismatch_count_periods > 0 THEN
    RAISE EXCEPTION 'Migración falló: % de % períodos con datos inconsistentes',
      mismatch_count_periods, periods_total;
  END IF;

  RAISE NOTICE '✅ Verificación OK: monthly_periods migrada correctamente (% filas)', periods_total;
END $$;

-- ============================================
-- RESUMEN DE DATOS POST-MIGRACIÓN
-- ============================================

SELECT
  'household_settings' as tabla,
  COUNT(*) as total_filas,
  COUNT(monthly_budget) as con_presupuesto_nuevo,
  COUNT(monthly_contribution_goal) as con_objetivo_legacy,
  ROUND(AVG(monthly_budget), 2) as presupuesto_promedio,
  ROUND(MIN(monthly_budget), 2) as presupuesto_minimo,
  ROUND(MAX(monthly_budget), 2) as presupuesto_maximo
FROM household_settings;

SELECT
  'monthly_periods' as tabla,
  phase,
  COUNT(*) as total_periodos,
  COUNT(snapshot_budget) as con_snapshot_nuevo,
  COUNT(snapshot_contribution_goal) as con_snapshot_legacy,
  ROUND(AVG(snapshot_budget), 2) as snapshot_promedio
FROM monthly_periods
GROUP BY phase
ORDER BY
  CASE phase
    WHEN 'preparing' THEN 1
    WHEN 'validation' THEN 2
    WHEN 'active' THEN 3
    WHEN 'closing' THEN 4
    WHEN 'closed' THEN 5
  END;

-- ============================================
-- OWNERSHIP Y PERMISOS (mantener consistencia)
-- ============================================

-- Asegurar que cuentassik_owner es propietario
ALTER TABLE household_settings OWNER TO cuentassik_owner;
ALTER TABLE monthly_periods OWNER TO cuentassik_owner;

-- Asegurar permisos para cuentassik_user
GRANT SELECT, INSERT, UPDATE, DELETE ON household_settings TO cuentassik_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON monthly_periods TO cuentassik_user;

-- ============================================
-- COMMIT
-- ============================================

COMMIT;

-- ============================================
-- NOTA IMPORTANTE
-- ============================================

-- Las columnas legacy (monthly_contribution_goal, snapshot_contribution_goal)
-- NO se eliminan en esta migración para permitir:
--   1. Rollback fácil si hay problemas
--   2. Transición gradual del código
--   3. Backwards compatibility temporal
--
-- Se eliminarán en una migración futura (post-v3.1.0) una vez confirmado:
--   ✅ Todos los entornos migrados
--   ✅ Código actualizado completamente
--   ✅ Testing exhaustivo completado
--   ✅ Sin errores en producción por 30+ días

-- ============================================
-- ROLLBACK MANUAL (solo en caso de emergencia)
-- ============================================

/*
-- SOLO ejecutar si hay problemas críticos inmediatos
-- NO ejecutar si hay datos nuevos en las columnas nuevas

BEGIN;

-- Eliminar nuevas columnas
ALTER TABLE household_settings DROP COLUMN IF EXISTS monthly_budget CASCADE;
ALTER TABLE monthly_periods DROP COLUMN IF EXISTS snapshot_budget CASCADE;

-- Eliminar constraint
ALTER TABLE household_settings DROP CONSTRAINT IF EXISTS check_monthly_budget_positive;

-- Eliminar índices
DROP INDEX IF EXISTS idx_household_settings_budget;

COMMIT;

-- Después del rollback, reiniciar aplicación:
-- pm2 restart cuentassik-dev
-- O en producción:
-- pm2 restart cuentassik-prod
*/
