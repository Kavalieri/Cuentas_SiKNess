-- Issue #17: Corregir paid_by en gastos comunes
--
-- PROBLEMA: Algunos gastos comunes tienen paid_by con UUID cuando debería ser NULL
-- EJEMPLO: Mercadona (b9102649-3744-4c54-b527-8b9aeb6bbf4d)
--
-- REGLA:
-- - Gastos comunes (flow_type='common') pagados desde cuenta común → paid_by = NULL
-- - Solo cuando un miembro específico paga un gasto común → paid_by = UUID

-- 1. Ver todos los gastos comunes con paid_by no NULL
SELECT
  t.id,
  t.description,
  t.flow_type,
  t.type,
  t.amount,
  t.occurred_at,
  p.display_name as registrado_por,
  pb.display_name as paid_by_name,
  CASE
    WHEN t.paid_by IS NULL THEN '✅ NULL (Correcto)'
    ELSE '❌ Tiene UUID (puede ser incorrecto)'
  END as status
FROM transactions t
LEFT JOIN profiles p ON t.profile_id = p.id
LEFT JOIN profiles pb ON t.paid_by = pb.id
WHERE t.flow_type = 'common'
  AND t.type IN ('expense', 'income')
  AND t.paid_by IS NOT NULL
ORDER BY t.occurred_at DESC;

-- 2. VERIFICACIÓN: ¿Cuántos hay?
SELECT
  COUNT(*) as total_con_paid_by,
  COUNT(DISTINCT t.paid_by) as miembros_unicos
FROM transactions t
WHERE t.flow_type = 'common'
  AND t.type IN ('expense', 'income')
  AND t.paid_by IS NOT NULL;

-- 3. CORRECCIÓN (solo ejecutar después de revisar)
-- UPDATE transactions
-- SET paid_by = NULL
-- WHERE flow_type = 'common'
--   AND type IN ('expense', 'income')
--   AND paid_by IS NOT NULL
--   -- Y ADEMÁS verificar que realmente deberían ser cuenta común
--   -- (no todos los gastos comunes con paid_by están mal)
-- ;
