-- =============================================================================
-- SEED COMPLETA ACTUALIZADA - CuentasSiK DEV
-- =============================================================================
-- Datos de prueba completos para desarrollo y testing
-- Incluye: Admin + pareja ejemplo con transacciones y configuraciones
--
-- USAR: sudo -u postgres psql -d cuentassik_dev -f database/seeds/complete_seed_updated.sql
-- =============================================================================

-- Limpiar datos existentes (manteniendo estructura)
TRUNCATE TABLE
    user_settings,
    user_active_household,
    member_incomes,
    member_credits,
    household_savings,
    household_settings,
    contribution_adjustments,
    contributions,
    contribution_periods,
    contribution_adjustment_templates,
    journal_adjustments,
    journal_transactions,
    journal_invitations,
    journal_roles,
    dual_flow_transactions,
    dual_flow_config,
    monthly_periods,
    transactions,
    categories,
    invitations,
    household_members,
    households,
    profiles
RESTART IDENTITY CASCADE;

-- No tocar system_admins (ya tiene datos de producción)

-- =============================================================================
-- 1. PERFILES - Admin + Pareja de Ejemplo
-- =============================================================================

INSERT INTO profiles (id, auth_user_id, email, display_name, created_at, updated_at) VALUES
-- Admin (preservar ID real del sistema)
('5a27b943-84fb-453d-83fb-bf850883e767', '5a27b943-84fb-453d-83fb-bf850883e767', 'caballeropomes@gmail.com', 'Oscar Caballero Pomés', NOW() - INTERVAL '30 days', NOW()),

-- Pareja de ejemplo para testing
('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'maria.lopez@example.com', 'María López', NOW() - INTERVAL '25 days', NOW()),
('22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'juan.garcia@example.com', 'Juan García', NOW() - INTERVAL '20 days', NOW()),

-- Usuario adicional para pruebas de invitaciones
('33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'ana.martinez@example.com', 'Ana Martínez', NOW() - INTERVAL '15 days', NOW());

-- =============================================================================
-- 2. HOGARES - Admin + Hogar de Ejemplo
-- =============================================================================

INSERT INTO households (id, name, created_by, created_at, updated_at) VALUES
-- Hogar del admin (preservar ID real)
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Casa Test', '5a27b943-84fb-453d-83fb-bf850883e767', NOW() - INTERVAL '30 days', NOW()),

-- Hogar de ejemplo para testing completo
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Hogar López-García', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '20 days', NOW()),

-- Hogar individual para pruebas
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Casa Ana', '33333333-3333-3333-3333-333333333333', NOW() - INTERVAL '15 days', NOW());

-- =============================================================================
-- 3. MIEMBROS DE HOGAR
-- =============================================================================

INSERT INTO household_members (profile_id, household_id, role, joined_at) VALUES
-- Admin en su hogar
('5a27b943-84fb-453d-83fb-bf850883e767', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'owner', NOW() - INTERVAL '30 days'),

-- Pareja López-García
('11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'owner', NOW() - INTERVAL '20 days'),
('22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'member', NOW() - INTERVAL '18 days'),

-- Ana en su hogar individual
('33333333-3333-3333-3333-333333333333', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'owner', NOW() - INTERVAL '15 days');

-- =============================================================================
-- 4. CONFIGURACIONES DE HOGARES
-- =============================================================================

INSERT INTO household_settings (household_id, contribution_method, created_at, updated_at) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'equal', NOW() - INTERVAL '30 days', NOW()),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'proportional', NOW() - INTERVAL '20 days', NOW()),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'equal', NOW() - INTERVAL '15 days', NOW());

-- =============================================================================
-- 5. INGRESOS DE MIEMBROS
-- =============================================================================

INSERT INTO member_incomes (profile_id, household_id, amount, effective_from, created_at, updated_at) VALUES
-- Hogar admin (ingresos simbólicos)
('5a27b943-84fb-453d-83fb-bf850883e767', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 5000.00, '2024-01-01', NOW() - INTERVAL '30 days', NOW()),

-- Pareja López-García (ingresos realistas)
('11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 3500.00, '2024-01-01', NOW() - INTERVAL '20 days', NOW()),
('22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 2800.00, '2024-01-01', NOW() - INTERVAL '18 days', NOW()),

-- Ana (ingreso individual)
('33333333-3333-3333-3333-333333333333', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 2200.00, '2024-01-01', NOW() - INTERVAL '15 days', NOW());

-- =============================================================================
-- 6. CATEGORÍAS POR HOGAR
-- =============================================================================

INSERT INTO categories (household_id, name, color, budget_limit, created_at, updated_at) VALUES
-- Categorías Admin
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Alimentación', '#22c55e', 800.00, NOW() - INTERVAL '30 days', NOW()),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Transporte', '#3b82f6', 300.00, NOW() - INTERVAL '30 days', NOW()),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Entretenimiento', '#f59e0b', 200.00, NOW() - INTERVAL '30 days', NOW()),

-- Categorías López-García (más completas)
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Supermercado', '#22c55e', 600.00, NOW() - INTERVAL '20 days', NOW()),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Restaurantes', '#10b981', 400.00, NOW() - INTERVAL '20 days', NOW()),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Transporte Público', '#3b82f6', 150.00, NOW() - INTERVAL '20 days', NOW()),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Gasolina', '#1d4ed8', 200.00, NOW() - INTERVAL '20 days', NOW()),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Hogar', '#6366f1', 300.00, NOW() - INTERVAL '20 days', NOW()),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Salud', '#ef4444', 200.00, NOW() - INTERVAL '20 days', NOW()),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Entretenimiento', '#f59e0b', 250.00, NOW() - INTERVAL '20 days', NOW()),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Ropa', '#ec4899', 150.00, NOW() - INTERVAL '20 days', NOW()),

-- Categorías Ana
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Alimentación', '#22c55e', 400.00, NOW() - INTERVAL '15 days', NOW()),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Transporte', '#3b82f6', 100.00, NOW() - INTERVAL '15 days', NOW()),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Hogar', '#6366f1', 200.00, NOW() - INTERVAL '15 days', NOW());

-- =============================================================================
-- 7. PERÍODOS MENSUALES
-- =============================================================================

INSERT INTO monthly_periods (household_id, month, year, status, total_expenses, total_contributions, created_at, updated_at) VALUES
-- Admin - período actual
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', EXTRACT(MONTH FROM CURRENT_DATE), EXTRACT(YEAR FROM CURRENT_DATE), 'open', 0.00, 0.00, NOW() - INTERVAL '5 days', NOW()),

-- López-García - períodos con datos
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', EXTRACT(MONTH FROM CURRENT_DATE), EXTRACT(YEAR FROM CURRENT_DATE), 'open', 1250.75, 1250.75, NOW() - INTERVAL '10 days', NOW()),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', EXTRACT(MONTH FROM CURRENT_DATE - INTERVAL '1 month'), EXTRACT(YEAR FROM CURRENT_DATE - INTERVAL '1 month'), 'closed', 1450.30, 1450.30, NOW() - INTERVAL '35 days', NOW() - INTERVAL '5 days'),

-- Ana - período actual
('cccccccc-cccc-cccc-cccc-cccccccccccc', EXTRACT(MONTH FROM CURRENT_DATE), EXTRACT(YEAR FROM CURRENT_DATE), 'open', 320.50, 320.50, NOW() - INTERVAL '8 days', NOW());

-- =============================================================================
-- 8. TRANSACCIONES DE EJEMPLO
-- =============================================================================

INSERT INTO transactions (household_id, category_id, member_id, amount, description, occurred_at, created_at, updated_at) VALUES
-- Transacciones Admin (pocas para testing limpio)
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 1, '5a27b943-84fb-453d-83fb-bf850883e767', 45.80, 'Compra supermercado', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 2, '5a27b943-84fb-453d-83fb-bf850883e767', 12.50, 'Metro', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),

-- Transacciones López-García (realistas para testing completo)
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 4, '11111111-1111-1111-1111-111111111111', 89.45, 'Compra semanal Mercadona', NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 5, '22222222-2222-2222-2222-222222222222', 42.80, 'Cena restaurante italiano', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 6, '11111111-1111-1111-1111-111111111111', 28.90, 'Abono mensual metro', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 7, '22222222-2222-2222-2222-222222222222', 65.00, 'Gasolina', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 8, '11111111-1111-1111-1111-111111111111', 125.30, 'Productos limpieza y hogar', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 9, '22222222-2222-2222-2222-222222222222', 78.50, 'Farmacia y medicinas', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 10, '11111111-1111-1111-1111-111111111111', 55.00, 'Cine y palomitas', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 4, '22222222-2222-2222-2222-222222222222', 67.20, 'Compra verduras y fruta', NOW(), NOW(), NOW()),

-- Transacciones Ana
('cccccccc-cccc-cccc-cccc-cccccccccccc', 12, '33333333-3333-3333-3333-333333333333', 35.60, 'Compra supermercado', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 13, '33333333-3333-3333-3333-333333333333', 15.90, 'Autobús', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 14, '33333333-3333-3333-3333-333333333333', 45.80, 'Productos hogar', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day');

-- =============================================================================
-- 9. CONTRIBUCIONES CALCULADAS
-- =============================================================================

INSERT INTO contributions (household_id, member_id, period_month, period_year, amount, created_at, updated_at) VALUES
-- López-García - mes actual (proporcional por ingresos)
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', EXTRACT(MONTH FROM CURRENT_DATE), EXTRACT(YEAR FROM CURRENT_DATE), 694.83, NOW() - INTERVAL '5 days', NOW()),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', EXTRACT(MONTH FROM CURRENT_DATE), EXTRACT(YEAR FROM CURRENT_DATE), 555.92, NOW() - INTERVAL '5 days', NOW()),

-- Ana - mes actual
('cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', EXTRACT(MONTH FROM CURRENT_DATE), EXTRACT(YEAR FROM CURRENT_DATE), 320.50, NOW() - INTERVAL '3 days', NOW());

-- =============================================================================
-- 10. CONFIGURACIÓN DUAL-FLOW
-- =============================================================================

INSERT INTO dual_flow_config (household_id, enabled, auto_categorize, notification_threshold, contribution_day, created_at, updated_at) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true, true, 100.00, 1, NOW() - INTERVAL '25 days', NOW()),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true, false, 50.00, 15, NOW() - INTERVAL '18 days', NOW()),
('cccccccc-cccc-cccc-cccc-cccccccccccc', false, true, 75.00, 5, NOW() - INTERVAL '12 days', NOW());

-- =============================================================================
-- 11. CRÉDITOS DE MIEMBROS (SALDOS)
-- =============================================================================

INSERT INTO member_credits (profile_id, household_id, amount, last_updated) VALUES
-- Admin - saldo neutro
('5a27b943-84fb-453d-83fb-bf850883e767', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 0.00, NOW()),

-- López-García - María debe un poco, Juan tiene crédito
('11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', -25.50, NOW() - INTERVAL '1 day'),
('22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 25.50, NOW() - INTERVAL '1 day'),

-- Ana - saldo neutro
('33333333-3333-3333-3333-333333333333', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 0.00, NOW());

-- =============================================================================
-- 12. CONFIGURACIÓN DE USUARIOS
-- =============================================================================

INSERT INTO user_settings (profile_id, theme, privacy_mode, notification_email, created_at, updated_at) VALUES
('5a27b943-84fb-453d-83fb-bf850883e767', 'dark', false, true, NOW() - INTERVAL '30 days', NOW()),
('11111111-1111-1111-1111-111111111111', 'light', false, true, NOW() - INTERVAL '20 days', NOW()),
('22222222-2222-2222-2222-222222222222', 'system', true, false, NOW() - INTERVAL '18 days', NOW()),
('33333333-3333-3333-3333-333333333333', 'light', false, true, NOW() - INTERVAL '15 days', NOW());

-- =============================================================================
-- 13. HOGARES ACTIVOS
-- =============================================================================

INSERT INTO user_active_household (profile_id, household_id, updated_at) VALUES
('5a27b943-84fb-453d-83fb-bf850883e767', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', NOW()),
('11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', NOW()),
('22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', NOW()),
('33333333-3333-3333-3333-333333333333', 'cccccccc-cccc-cccc-cccc-cccccccccccc', NOW());

-- =============================================================================
-- VERIFICACIÓN FINAL
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ SEED COMPLETA APLICADA EXITOSAMENTE';
    RAISE NOTICE '👤 Perfiles: %', (SELECT COUNT(*) FROM profiles);
    RAISE NOTICE '🏠 Hogares: %', (SELECT COUNT(*) FROM households);
    RAISE NOTICE '👥 Miembros: %', (SELECT COUNT(*) FROM household_members);
    RAISE NOTICE '📂 Categorías: %', (SELECT COUNT(*) FROM categories);
    RAISE NOTICE '💳 Transacciones: %', (SELECT COUNT(*) FROM transactions);
    RAISE NOTICE '';
    RAISE NOTICE '🎯 USUARIOS DISPONIBLES PARA TESTING:';
    RAISE NOTICE '  🔑 Admin: caballeropomes@gmail.com (Casa Test)';
    RAISE NOTICE '  👫 María: maria.lopez@example.com (Hogar López-García)';
    RAISE NOTICE '  👨 Juan: juan.garcia@example.com (Hogar López-García)';
    RAISE NOTICE '  👩 Ana: ana.martinez@example.com (Casa Ana)';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 LISTO PARA TESTING COMPLETO DEL DUAL-FLOW';
END $$;
