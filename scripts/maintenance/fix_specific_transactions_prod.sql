-- =========================================================================
-- SCRIPT: Corrección manual de transacciones específicas (Issue #16) - PROD
-- =========================================================================
-- Fecha: 2025-11-02
-- Propósito: Actualizar 3 gastos específicos identificados en la revisión:
--   1. "Alquiler restante" → subcategoría Alquiler (partial match)
--   2. "Comuinidad ago, sep, oct" → subcategoría Comunidad (partial match + typo)
--   3. "Vivienda" (€350) → subcategoría Alquiler (descripción genérica)
--   4. "Bazar Ana Manta" → reclasificar de Salud a Menaje
-- =========================================================================

\set ON_ERROR_STOP on

-- Variables para los IDs en PROD
\set cat_vivienda 'a98773a7-a0ae-49a0-84de-519ec4548c79'
\set cat_menaje '00cf0984-4823-468d-a2b6-0930aa14815d'
\set sub_alquiler '7bd3b108-7294-4858-85cb-9b6615e3bda4'
\set sub_comunidad '267ed16a-d1ca-4007-bf87-3cc9e799425e'

BEGIN;

-- =========================================================================
-- ACTUALIZACIÓN 1: "Alquiler restante" → subcategoría Alquiler
-- =========================================================================
UPDATE transactions
SET
  subcategory_id = :'sub_alquiler',
  updated_at = CURRENT_TIMESTAMP
WHERE description = 'Alquiler restante'
  AND category_id = :'cat_vivienda'
  AND type IN ('expense', 'expense_direct')
  AND subcategory_id IS NULL;

-- =========================================================================
-- ACTUALIZACIÓN 2: "Comuinidad ago, sep, oct" → subcategoría Comunidad
-- =========================================================================
UPDATE transactions
SET
  subcategory_id = :'sub_comunidad',
  updated_at = CURRENT_TIMESTAMP
WHERE description = 'Comuinidad ago, sep, oct'
  AND category_id = :'cat_vivienda'
  AND type IN ('expense', 'expense_direct')
  AND subcategory_id IS NULL;

-- =========================================================================
-- ACTUALIZACIÓN 3: "Vivienda" (€350) → subcategoría Alquiler
-- =========================================================================
UPDATE transactions
SET
  subcategory_id = :'sub_alquiler',
  updated_at = CURRENT_TIMESTAMP
WHERE description = 'Vivienda'
  AND amount = 350
  AND category_id = :'cat_vivienda'
  AND type IN ('expense', 'expense_direct')
  AND subcategory_id IS NULL;

-- =========================================================================
-- ACTUALIZACIÓN 4: "Bazar Ana Manta" → reclasificar a Menaje
-- =========================================================================
UPDATE transactions
SET
  category_id = :'cat_menaje',
  subcategory_id = NULL,  -- Menaje no tiene subcategorías
  updated_at = CURRENT_TIMESTAMP
WHERE description = 'Bazar Ana "Manta"'
  AND type IN ('expense', 'expense_direct');

-- =========================================================================
-- REPORTE: Verificar actualizaciones
-- =========================================================================
\echo ''
\echo '✅ TRANSACCIONES ACTUALIZADAS:'
\echo ''

SELECT
  t.description,
  c.name as categoria,
  COALESCE(s.name, '(sin subcategoría)') as subcategoria,
  t.amount,
  t.occurred_at::date
FROM transactions t
JOIN categories c ON t.category_id = c.id
LEFT JOIN subcategories s ON t.subcategory_id = s.id
WHERE t.description IN (
  'Alquiler restante',
  'Comuinidad ago, sep, oct',
  'Vivienda',
  'Bazar Ana "Manta"'
)
  AND t.type IN ('expense', 'expense_direct')
ORDER BY t.occurred_at DESC;

COMMIT;

\echo ''
\echo '✅ Script completado exitosamente en PROD'
