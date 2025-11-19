-- ============================================
-- Descripción: Deprecar tablas legacy del sistema de balance
-- Fecha: 2025-11-19
-- Autor: AI Assistant
-- Issue: #59 (Phase 3 - Migración de Datos)
-- ============================================

-- CONTEXTO:
-- Las tablas personal_loans, refund_claims y member_credits fueron parte del diseño original
-- pero NUNCA se poblaron (0 registros en DEV y PROD).
-- El sistema actual usa exclusivamente la tabla 'transactions' con categorías especiales.

-- ESTADO VERIFICADO:
-- - personal_loans: 0 registros (DEV y PROD)
-- - refund_claims: 0 registros (DEV y PROD)
-- - member_credits: 0 registros (DEV y PROD)

-- ESTRATEGIA:
-- 1. Añadir comentarios SQL explicando deprecación
-- 2. Mantener tablas por ahora (para rollback si es necesario)
-- 3. Phase 4 (Issue #60) eliminará las tablas definitivamente

BEGIN;

-- ==================================================
-- 1. PERSONAL_LOANS - DEPRECADA
-- ==================================================

COMMENT ON TABLE personal_loans IS
'DEPRECADA (Phase 3 - Issue #59)
Reemplazada por: transactions con category "Préstamo Personal"
Estado: 0 registros históricos
Eliminar en: Phase 4 (Issue #60)

NUEVO SISTEMA:
- Préstamo: transaction(type=expense, category="Préstamo Personal", flow_type=common)
- Devolución: transaction(type=income, category="Pago Préstamo", flow_type=common)
- Balance: Calculado dinámicamente por API /api/periods/contributions';

-- ==================================================
-- 2. REFUND_CLAIMS - DEPRECADA
-- ==================================================

COMMENT ON TABLE refund_claims IS
'DEPRECADA (Phase 3 - Issue #59)
Reemplazada por: Sistema de gastos directos (expense_direct)
Estado: 0 registros históricos
Eliminar en: Phase 4 (Issue #60)

NUEVO SISTEMA:
- Gasto directo: transaction(type=expense_direct, flow_type=direct)
- Se descuenta automáticamente de la contribución esperada
- No requiere claim separado (forma parte del flujo dual)';

-- ==================================================
-- 3. MEMBER_CREDITS - DEPRECADA
-- ==================================================

COMMENT ON TABLE member_credits IS
'DEPRECADA (Phase 3 - Issue #59)
Reemplazada por: Cálculo dinámico desde transactions
Estado: 0 registros históricos
Eliminar en: Phase 4 (Issue #60)

NUEVO SISTEMA:
- Balance: API /api/periods/contributions calcula en tiempo real
- Fórmula: expected - (directExpenses + commonIncome)
- Source of truth: tabla transactions únicamente
- No se persiste balance (siempre calculado fresh)';

-- ==================================================
-- 4. VERIFICACIÓN FINAL
-- ==================================================

-- Confirmar que las tablas están vacías
DO $$
DECLARE
  v_personal_loans_count INTEGER;
  v_refund_claims_count INTEGER;
  v_member_credits_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_personal_loans_count FROM personal_loans;
  SELECT COUNT(*) INTO v_refund_claims_count FROM refund_claims;
  SELECT COUNT(*) INTO v_member_credits_count FROM member_credits;

  IF v_personal_loans_count > 0 THEN
    RAISE EXCEPTION 'personal_loans no está vacía (% registros). Revisar migración.', v_personal_loans_count;
  END IF;

  IF v_refund_claims_count > 0 THEN
    RAISE EXCEPTION 'refund_claims no está vacía (% registros). Revisar migración.', v_refund_claims_count;
  END IF;

  IF v_member_credits_count > 0 THEN
    RAISE EXCEPTION 'member_credits no está vacía (% registros). Revisar migración.', v_member_credits_count;
  END IF;

  RAISE NOTICE '✅ Verificación exitosa: Todas las tablas legacy están vacías';
  RAISE NOTICE '✅ Tablas marcadas como DEPRECADAS';
  RAISE NOTICE '📋 Phase 4 (Issue #60) eliminará estas tablas definitivamente';
END $$;

-- ==================================================
-- 5. RESUMEN DE REEMPLAZO
-- ==================================================

-- Mostrar mapeo legacy → nuevo sistema
SELECT
  'SISTEMA LEGACY' as sistema,
  'personal_loans' as tabla_legacy,
  'transactions + categories(is_system=true)' as reemplazo_nuevo,
  '0 registros' as estado,
  'Issue #58' as implementado_en
UNION ALL
SELECT
  'SISTEMA LEGACY',
  'refund_claims',
  'transactions(expense_direct, flow_type=direct)',
  '0 registros',
  'Sistema existente'
UNION ALL
SELECT
  'SISTEMA LEGACY',
  'member_credits',
  'API /api/periods/contributions (cálculo dinámico)',
  '0 registros',
  'Sistema existente';

COMMIT;
