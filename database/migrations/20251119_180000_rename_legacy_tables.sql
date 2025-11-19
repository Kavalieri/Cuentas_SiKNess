-- ============================================
-- Descripción: Renombrar tablas legacy a _legacy_* (preservar datos)
-- Fecha: 2025-11-19
-- Autor: AI Assistant
-- Issue: #60 (Phase 4 - Refactorizar Backend)
-- ============================================

-- CONTEXTO:
-- Phase 3 (Issue #59) marcó las tablas como deprecadas.
-- Phase 4 las renombra para evitar uso accidental pero preservar datos.

-- ESTRATEGIA:
-- 1. Renombrar tablas con prefijo _legacy_
-- 2. Preservar TODOS los datos (rollback si es necesario)
-- 3. NO eliminar (eliminación definitiva en v4.0.0 tras 6 meses)

BEGIN;

-- ==================================================
-- 1. RENOMBRAR PERSONAL_LOANS → _LEGACY_PERSONAL_LOANS
-- ==================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'personal_loans'
  ) THEN
    ALTER TABLE personal_loans RENAME TO _legacy_personal_loans;
    RAISE NOTICE '✅ Tabla personal_loans renombrada a _legacy_personal_loans';
  ELSE
    RAISE NOTICE '⏭️  Tabla personal_loans ya no existe o fue renombrada previamente';
  END IF;
END $$;

-- ==================================================
-- 2. RENOMBRAR REFUND_CLAIMS → _LEGACY_REFUND_CLAIMS
-- ==================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'refund_claims'
  ) THEN
    ALTER TABLE refund_claims RENAME TO _legacy_refund_claims;
    RAISE NOTICE '✅ Tabla refund_claims renombrada a _legacy_refund_claims';
  ELSE
    RAISE NOTICE '⏭️  Tabla refund_claims ya no existe o fue renombrada previamente';
  END IF;
END $$;

-- ==================================================
-- 3. RENOMBRAR MEMBER_CREDITS → _LEGACY_MEMBER_CREDITS
-- ==================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'member_credits'
  ) THEN
    ALTER TABLE member_credits RENAME TO _legacy_member_credits;
    RAISE NOTICE '✅ Tabla member_credits renombrada a _legacy_member_credits';
  ELSE
    RAISE NOTICE '⏭️  Tabla member_credits ya no existe o fue renombrada previamente';
  END IF;
END $$;

-- ==================================================
-- 4. ACTUALIZAR COMENTARIOS DE TABLAS RENOMBRADAS
-- ==================================================

-- Actualizar comentario de _legacy_personal_loans
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = '_legacy_personal_loans'
  ) THEN
    COMMENT ON TABLE _legacy_personal_loans IS 
    '⚠️ LEGACY TABLE (Phase 4 - Issue #60 - 19 Nov 2025)
    Datos migrados a transactions con categoría "Préstamo Personal".
    Tabla renombrada y preservada para rollback.
    ELIMINAR EN: v4.0.0 (tras 6 meses de estabilidad del nuevo sistema)
    
    ROLLBACK: Si es necesario, renombrar de vuelta:
    ALTER TABLE _legacy_personal_loans RENAME TO personal_loans;';
  END IF;
END $$;

-- Actualizar comentario de _legacy_refund_claims
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = '_legacy_refund_claims'
  ) THEN
    COMMENT ON TABLE _legacy_refund_claims IS 
    '⚠️ LEGACY TABLE (Phase 4 - Issue #60 - 19 Nov 2025)
    Reemplazado por sistema integrado de transacciones (expense_direct).
    ELIMINAR EN: v4.0.0
    
    ROLLBACK: ALTER TABLE _legacy_refund_claims RENAME TO refund_claims;';
  END IF;
END $$;

-- Actualizar comentario de _legacy_member_credits
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = '_legacy_member_credits'
  ) THEN
    COMMENT ON TABLE _legacy_member_credits IS 
    '⚠️ LEGACY TABLE (Phase 4 - Issue #60 - 19 Nov 2025)
    Balance ahora calculado dinámicamente por API /api/periods/contributions.
    ELIMINAR EN: v4.0.0
    
    ROLLBACK: ALTER TABLE _legacy_member_credits RENAME TO member_credits;';
  END IF;
END $$;

-- ==================================================
-- 5. VERIFICACIÓN Y RESUMEN
-- ==================================================

-- Mostrar estado final de tablas legacy
SELECT 
  'VERIFICACIÓN RENOMBRADO' as status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '_legacy_personal_loans')
    THEN '✅ _legacy_personal_loans'
    ELSE '❌ No renombrada'
  END as personal_loans_status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '_legacy_refund_claims')
    THEN '✅ _legacy_refund_claims'
    ELSE '❌ No renombrada'
  END as refund_claims_status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '_legacy_member_credits')
    THEN '✅ _legacy_member_credits'
    ELSE '❌ No renombrada'
  END as member_credits_status;

-- Confirmar que tablas originales ya no existen
SELECT 
  'VERIFICACIÓN ORIGINAL' as status,
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'personal_loans')
    THEN '✅ personal_loans eliminada'
    ELSE '⚠️  Aún existe'
  END as personal_loans_check,
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'refund_claims')
    THEN '✅ refund_claims eliminada'
    ELSE '⚠️  Aún existe'
  END as refund_claims_check,
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'member_credits')
    THEN '✅ member_credits eliminada'
    ELSE '⚠️  Aún existe'
  END as member_credits_check;

COMMIT;
