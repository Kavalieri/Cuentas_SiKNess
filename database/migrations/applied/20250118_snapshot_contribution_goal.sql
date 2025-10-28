-- =====================================================
-- MIGRACIÓN: Snapshot de objetivo de contribución
-- =====================================================
-- Fecha: 2025-01-18
-- Autor: Sistema CuentasSiK
-- Descripción: Añade columna snapshot_contribution_goal a monthly_periods
--              para preservar el objetivo histórico al momento de bloquear
--              un período, evitando que cambios futuros afecten al histórico.
--
-- Problema resuelto:
--   Cambiar household_settings.monthly_contribution_goal afectaba TODOS
--   los períodos (incluso bloqueados/cerrados). Ahora cada período
--   bloqueado guarda un snapshot del objetivo al momento de lockeo.
--
-- Comportamiento:
--   - snapshot_contribution_goal = NULL → período en "preparing" (usa valor actual)
--   - snapshot_contribution_goal = [valor] → período bloqueado (usa snapshot histórico)
--
-- =====================================================

BEGIN;

-- =====================================================
-- PASO 1: Añadir columna snapshot_contribution_goal
-- =====================================================

ALTER TABLE monthly_periods
ADD COLUMN IF NOT EXISTS snapshot_contribution_goal NUMERIC(10,2) DEFAULT NULL;

-- Comentario explicativo
COMMENT ON COLUMN monthly_periods.snapshot_contribution_goal IS
  'Snapshot del objetivo de contribución al momento de bloquear el período.
   NULL = período en preparing (usa valor actual de household_settings).
   NOT NULL = período bloqueado/cerrado (usa este valor histórico).
   Se guarda automáticamente al ejecutar lockPeriod() o lock_contributions_period().';

-- =====================================================
-- PASO 2: Poblar períodos existentes bloqueados
-- =====================================================
-- NOTA: Poblamos con valor ACTUAL porque no podemos recuperar el histórico real.
--       Si el usuario recuerda valores históricos, puede corregirlos manualmente.

UPDATE monthly_periods mp
SET snapshot_contribution_goal = hs.monthly_contribution_goal
FROM household_settings hs
WHERE mp.household_id = hs.household_id
  AND mp.phase IN ('validation', 'active', 'closing', 'closed')
  AND mp.snapshot_contribution_goal IS NULL;

-- Log de períodos actualizados (para auditoría)
DO $$
DECLARE
  v_updated_count INT;
BEGIN
  SELECT COUNT(*) INTO v_updated_count
  FROM monthly_periods
  WHERE snapshot_contribution_goal IS NOT NULL
    AND phase IN ('validation', 'active', 'closing', 'closed');

  RAISE NOTICE 'Períodos bloqueados poblados con snapshot: %', v_updated_count;
END $$;

-- =====================================================
-- PASO 3: Validaciones post-migración
-- =====================================================

-- Verificar que todos los períodos bloqueados tienen snapshot
DO $$
DECLARE
  v_missing_snapshot INT;
BEGIN
  SELECT COUNT(*) INTO v_missing_snapshot
  FROM monthly_periods
  WHERE phase IN ('validation', 'active', 'closing', 'closed')
    AND snapshot_contribution_goal IS NULL;

  IF v_missing_snapshot > 0 THEN
    RAISE WARNING 'Atención: % períodos bloqueados sin snapshot (posible falta de household_settings)', v_missing_snapshot;
  ELSE
    RAISE NOTICE 'Validación OK: Todos los períodos bloqueados tienen snapshot';
  END IF;
END $$;

-- =====================================================
-- PASO 4: Registrar migración
-- =====================================================

-- Insertar en tabla de control (si existe)
INSERT INTO _migrations (migration_name, description, applied_at)
VALUES (
  '20250118_snapshot_contribution_goal.sql',
  'Añade snapshot de objetivo de contribución al bloquear períodos para preservar integridad histórica',
  NOW()
)
ON CONFLICT (migration_name) DO NOTHING;

COMMIT;

-- =====================================================
-- NOTAS DE IMPLEMENTACIÓN
-- =====================================================
--
-- Después de aplicar esta migración:
--
-- 1. Modificar lockPeriod() en app/sickness/periodo/actions.ts
--    para guardar snapshot antes de bloquear.
--
-- 2. Actualizar queries de lectura en 6 lugares:
--    - lib/contributions/periods.ts
--    - app/api/periods/checklist/route.ts
--    - app/api/periods/contributions/route.ts
--    - app/sickness/credito-deuda/actions.ts (2x)
--    Patrón: COALESCE(mp.snapshot_contribution_goal, hs.monthly_contribution_goal)
--
-- 3. Testing:
--    - Crear período → verificar snapshot = NULL
--    - Bloquear → verificar snapshot guardado
--    - Cambiar objetivo global → verificar período bloqueado usa snapshot
--
-- 4. Corrección manual de períodos históricos (si conoces los valores reales):
--    UPDATE monthly_periods
--    SET snapshot_contribution_goal = 1200
--    WHERE year = 2024 AND month IN (10, 11, 12)
--      AND household_id = 'tu_household_id';
--
-- =====================================================
