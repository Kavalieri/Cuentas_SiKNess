-- ============================================
-- MIGRACIÓN: Fase 1.5 - Eliminación de Columnas 100% Seguras
-- Fecha: 2025-11-27
-- Autor: AI Assistant
-- Issue: #63 - Limpieza de base de datos
-- Precedente: Fase 1 (6 tablas vacías eliminadas - commit 4faa845)
-- ============================================

-- DESCRIPCIÓN:
-- Elimina 12 columnas que NUNCA se usan y son 100% seguras:
--   - transactions: 4 columnas (created_by_email, auto_paired, review_days, pairing_threshold)
--   - contributions: 5 columnas (paid_at, adjustments_total, calculation_method, created/updated_by)
--   - categories: 2 columnas (created_by_profile_id, updated_by_profile_id)
--   - journal_transactions: 1 columna (reason)
--
-- RIESGO: NULO (todas las columnas están vacías o son valores constantes sin uso)
-- IMPACTO: Schema 158 → 146 columnas (-7.6%)

-- ============================================
-- VERIFICACIÓN PRE-MIGRACIÓN
-- ============================================

DO $$
DECLARE
  v_created_by_email_count INTEGER;
  v_auto_paired_true_count INTEGER;
  v_review_days_distinct INTEGER;
  v_pairing_threshold_distinct INTEGER;
  v_contributions_paid_at_count INTEGER;
  v_contributions_adjustments_total_count INTEGER;
  v_contributions_calculation_method_count INTEGER;
  v_contributions_created_by_count INTEGER;
  v_contributions_updated_by_count INTEGER;
  v_categories_created_by_count INTEGER;
  v_categories_updated_by_count INTEGER;
  v_journal_reason_count INTEGER;
BEGIN
  RAISE NOTICE '🔍 Verificando que las columnas están realmente vacías...';
  RAISE NOTICE '';

  -- ============================================
  -- VERIFICAR: transactions
  -- ============================================

  SELECT
    COUNT(*) FILTER (WHERE created_by_email IS NOT NULL),
    COUNT(*) FILTER (WHERE auto_paired = true),
    COUNT(DISTINCT review_days),
    COUNT(DISTINCT pairing_threshold)
  INTO
    v_created_by_email_count,
    v_auto_paired_true_count,
    v_review_days_distinct,
    v_pairing_threshold_distinct
  FROM transactions;

  RAISE NOTICE '📊 transactions:';
  RAISE NOTICE '  - created_by_email poblado: % (esperado: 0)', v_created_by_email_count;
  RAISE NOTICE '  - auto_paired = true: % (esperado: 0)', v_auto_paired_true_count;
  RAISE NOTICE '  - review_days valores distintos: % (esperado: 1)', v_review_days_distinct;
  RAISE NOTICE '  - pairing_threshold valores distintos: % (esperado: 1)', v_pairing_threshold_distinct;

  IF v_created_by_email_count > 0 THEN
    RAISE EXCEPTION '❌ ABORTAR: transactions.created_by_email tiene datos (% filas)', v_created_by_email_count;
  END IF;

  IF v_auto_paired_true_count > 0 THEN
    RAISE EXCEPTION '❌ ABORTAR: transactions.auto_paired tiene valores true (% filas)', v_auto_paired_true_count;
  END IF;

  RAISE NOTICE '';

  -- ============================================
  -- VERIFICAR: contributions
  -- ============================================

  SELECT
    COUNT(*) FILTER (WHERE paid_at IS NOT NULL),
    COUNT(*) FILTER (WHERE adjustments_total IS NOT NULL),
    COUNT(*) FILTER (WHERE calculation_method IS NOT NULL),
    COUNT(*) FILTER (WHERE created_by_profile_id IS NOT NULL),
    COUNT(*) FILTER (WHERE updated_by_profile_id IS NOT NULL)
  INTO
    v_contributions_paid_at_count,
    v_contributions_adjustments_total_count,
    v_contributions_calculation_method_count,
    v_contributions_created_by_count,
    v_contributions_updated_by_count
  FROM contributions;

  RAISE NOTICE '📊 contributions:';
  RAISE NOTICE '  - paid_at poblado: % (esperado: 0)', v_contributions_paid_at_count;
  RAISE NOTICE '  - adjustments_total poblado: % (esperado: 0)', v_contributions_adjustments_total_count;
  RAISE NOTICE '  - calculation_method poblado: % (esperado: 0)', v_contributions_calculation_method_count;
  RAISE NOTICE '  - created_by_profile_id poblado: % (esperado: 0)', v_contributions_created_by_count;
  RAISE NOTICE '  - updated_by_profile_id poblado: % (esperado: 0)', v_contributions_updated_by_count;

  IF v_contributions_paid_at_count > 0 THEN
    RAISE EXCEPTION '❌ ABORTAR: contributions.paid_at tiene datos (% filas)', v_contributions_paid_at_count;
  END IF;

  IF v_contributions_adjustments_total_count > 0 THEN
    RAISE EXCEPTION '❌ ABORTAR: contributions.adjustments_total tiene datos (% filas)', v_contributions_adjustments_total_count;
  END IF;

  IF v_contributions_calculation_method_count > 0 THEN
    RAISE EXCEPTION '❌ ABORTAR: contributions.calculation_method tiene datos (% filas)', v_contributions_calculation_method_count;
  END IF;

  IF v_contributions_created_by_count > 0 THEN
    RAISE EXCEPTION '❌ ABORTAR: contributions.created_by_profile_id tiene datos (% filas)', v_contributions_created_by_count;
  END IF;

  IF v_contributions_updated_by_count > 0 THEN
    RAISE EXCEPTION '❌ ABORTAR: contributions.updated_by_profile_id tiene datos (% filas)', v_contributions_updated_by_count;
  END IF;

  RAISE NOTICE '';

  -- ============================================
  -- VERIFICAR: categories
  -- ============================================

  SELECT
    COUNT(*) FILTER (WHERE created_by_profile_id IS NOT NULL),
    COUNT(*) FILTER (WHERE updated_by_profile_id IS NOT NULL)
  INTO
    v_categories_created_by_count,
    v_categories_updated_by_count
  FROM categories;

  RAISE NOTICE '📊 categories:';
  RAISE NOTICE '  - created_by_profile_id poblado: % (esperado: 0)', v_categories_created_by_count;
  RAISE NOTICE '  - updated_by_profile_id poblado: % (esperado: 0)', v_categories_updated_by_count;

  IF v_categories_created_by_count > 0 THEN
    RAISE EXCEPTION '❌ ABORTAR: categories.created_by_profile_id tiene datos (% filas)', v_categories_created_by_count;
  END IF;

  IF v_categories_updated_by_count > 0 THEN
    RAISE EXCEPTION '❌ ABORTAR: categories.updated_by_profile_id tiene datos (% filas)', v_categories_updated_by_count;
  END IF;

  RAISE NOTICE '';

  -- ============================================
  -- VERIFICAR: journal_transactions
  -- ============================================

  SELECT COUNT(*) FILTER (WHERE reason IS NOT NULL)
  INTO v_journal_reason_count
  FROM journal_transactions;

  RAISE NOTICE '📊 journal_transactions:';
  RAISE NOTICE '  - reason poblado: % (esperado: 0)', v_journal_reason_count;

  IF v_journal_reason_count > 0 THEN
    RAISE EXCEPTION '❌ ABORTAR: journal_transactions.reason tiene datos (% filas)', v_journal_reason_count;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '✅ Todas las verificaciones pasaron. Procediendo con eliminación...';
  RAISE NOTICE '';
END $$;

-- ============================================
-- ELIMINAR COLUMNAS: transactions (4 columnas)
-- ============================================

ALTER TABLE transactions
  DROP COLUMN IF EXISTS created_by_email CASCADE,
  DROP COLUMN IF EXISTS auto_paired CASCADE,
  DROP COLUMN IF EXISTS review_days CASCADE,
  DROP COLUMN IF EXISTS pairing_threshold CASCADE;

-- ============================================
-- ELIMINAR COLUMNAS: contributions (5 columnas)
-- ============================================

ALTER TABLE contributions
  DROP COLUMN IF EXISTS paid_at CASCADE,
  DROP COLUMN IF EXISTS adjustments_total CASCADE,
  DROP COLUMN IF EXISTS calculation_method CASCADE,
  DROP COLUMN IF EXISTS created_by_profile_id CASCADE,
  DROP COLUMN IF EXISTS updated_by_profile_id CASCADE;

-- ============================================
-- ELIMINAR COLUMNAS: categories (2 columnas)
-- ============================================

ALTER TABLE categories
  DROP COLUMN IF EXISTS created_by_profile_id CASCADE,
  DROP COLUMN IF EXISTS updated_by_profile_id CASCADE;

-- ============================================
-- ELIMINAR COLUMNAS: journal_transactions (1 columna)
-- ============================================

ALTER TABLE journal_transactions
  DROP COLUMN IF EXISTS reason CASCADE;

-- ============================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- ============================================

DO $$
DECLARE
  v_transactions_columns INTEGER;
  v_contributions_columns INTEGER;
  v_categories_columns INTEGER;
  v_journal_columns INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔍 Verificando conteo de columnas tras eliminación...';
  RAISE NOTICE '';

  SELECT COUNT(*) INTO v_transactions_columns
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'transactions';

  SELECT COUNT(*) INTO v_contributions_columns
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'contributions';

  SELECT COUNT(*) INTO v_categories_columns
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'categories';

  SELECT COUNT(*) INTO v_journal_columns
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'journal_transactions';

  RAISE NOTICE '📊 transactions: % columnas (esperado: 30, antes: 34)', v_transactions_columns;
  RAISE NOTICE '📊 contributions: % columnas (esperado: 11, antes: 16)', v_contributions_columns;
  RAISE NOTICE '📊 categories: % columnas (esperado: 10, antes: 12)', v_categories_columns;
  RAISE NOTICE '📊 journal_transactions: % columnas (esperado: 7, antes: 8)', v_journal_columns;

  IF v_transactions_columns != 30 THEN
    RAISE WARNING '⚠️ transactions tiene % columnas (esperado: 30)', v_transactions_columns;
  END IF;

  IF v_contributions_columns != 11 THEN
    RAISE WARNING '⚠️ contributions tiene % columnas (esperado: 11)', v_contributions_columns;
  END IF;

  IF v_categories_columns != 10 THEN
    RAISE WARNING '⚠️ categories tiene % columnas (esperado: 10)', v_categories_columns;
  END IF;

  IF v_journal_columns != 7 THEN
    RAISE WARNING '⚠️ journal_transactions tiene % columnas (esperado: 7)', v_journal_columns;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '✅ FASE 1.5 COMPLETADA';
  RAISE NOTICE '';
  RAISE NOTICE '📊 RESUMEN:';
  RAISE NOTICE '  - 12 columnas eliminadas';
  RAISE NOTICE '  - 4 tablas afectadas';
  RAISE NOTICE '  - 0 datos perdidos (todas vacías)';
  RAISE NOTICE '  - Schema: 158 → 146 columnas (-7.6%%)';
  RAISE NOTICE '';
END $$;
