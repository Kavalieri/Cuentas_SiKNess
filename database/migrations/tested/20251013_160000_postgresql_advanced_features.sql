-- Migración: 20251013_160000_postgresql_advanced_features.sql
-- Descripción: Aprovechar capacidades avanzadas de PostgreSQL para el sistema de doble flujo

-- =============================================================================
-- FASE 1: TIPOS ENUMERADOS (ENUMS) PARA MAYOR CONSISTENCIA
-- =============================================================================

-- 1.1 Crear enum para flow_type (más eficiente que TEXT con CHECK)
CREATE TYPE flow_type_enum AS ENUM ('common', 'direct');

-- 1.2 Crear enum para transaction_type
CREATE TYPE transaction_type_enum AS ENUM ('income', 'expense');

-- 1.3 Crear enum para status de períodos de contribución
CREATE TYPE period_status_enum AS ENUM ('SETUP', 'LOCKED', 'CLOSED');

-- 1.4 Crear enum para status de invitaciones
CREATE TYPE invitation_status_enum AS ENUM ('pending', 'accepted', 'expired', 'cancelled');

-- 1.5 Crear enum para roles de household_members
CREATE TYPE household_role_enum AS ENUM ('owner', 'member');

-- =============================================================================
-- FASE 2: VISTAS MATERIALIZADAS PARA PERFORMANCE CRÍTICA
-- =============================================================================

-- 2.1 Vista materializada para balances por hogar (cálculo intensivo)
CREATE MATERIALIZED VIEW mv_household_balances AS
SELECT
    h.id as household_id,
    h.name as household_name,

    -- Balance total del hogar
    COALESCE(SUM(
        CASE
            WHEN t.type = 'income' THEN t.amount
            WHEN t.type = 'expense' THEN -t.amount
            ELSE 0
        END
    ), 0) as total_balance,

    -- Ingresos totales (flujo común + directo)
    COALESCE(SUM(
        CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END
    ), 0) as total_income,

    -- Gastos totales (flujo común + directo)
    COALESCE(SUM(
        CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END
    ), 0) as total_expenses,

    -- Balance flujo común únicamente
    COALESCE(SUM(
        CASE
            WHEN t.flow_type = 'common' AND t.type = 'income' THEN t.amount
            WHEN t.flow_type = 'common' AND t.type = 'expense' THEN -t.amount
            ELSE 0
        END
    ), 0) as common_flow_balance,

    -- Gastos directos (de bolsillo de miembros)
    COALESCE(SUM(
        CASE
            WHEN t.flow_type = 'direct' AND t.type = 'expense' THEN t.amount
            ELSE 0
        END
    ), 0) as direct_expenses_total,

    -- Número de transacciones
    COUNT(t.id) as transaction_count,

    -- Última actualización
    NOW() as last_updated

FROM households h
LEFT JOIN transactions t ON h.id = t.household_id
WHERE h.deleted_at IS NULL
GROUP BY h.id, h.name;

-- Índice único para refresh eficiente
CREATE UNIQUE INDEX idx_mv_household_balances_household_id
ON mv_household_balances (household_id);

-- 2.2 Vista materializada para contribuciones pendientes por miembro
CREATE MATERIALIZED VIEW mv_member_pending_contributions AS
SELECT
    hm.household_id,
    hm.profile_id,
    p.email,

    -- Contribución esperada mes actual
    COALESCE(c.expected_amount, 0) as expected_contribution,

    -- Cantidad ya pagada
    COALESCE(c.paid_amount, 0) as paid_contribution,

    -- Cantidad pendiente
    COALESCE(c.expected_amount, 0) - COALESCE(c.paid_amount, 0) as pending_amount,

    -- Gastos directos que reducen su contribución
    COALESCE(SUM(
        CASE
            WHEN t.flow_type = 'direct'
            AND t.type = 'expense'
            AND t.real_payer_id = hm.profile_id
            AND EXTRACT(YEAR FROM t.occurred_at) = EXTRACT(YEAR FROM CURRENT_DATE)
            AND EXTRACT(MONTH FROM t.occurred_at) = EXTRACT(MONTH FROM CURRENT_DATE)
            THEN t.amount
            ELSE 0
        END
    ), 0) as direct_expenses_current_month,

    -- Contribución neta pendiente (después de gastos directos)
    GREATEST(
        COALESCE(c.expected_amount, 0) - COALESCE(c.paid_amount, 0) - COALESCE(SUM(
            CASE
                WHEN t.flow_type = 'direct'
                AND t.type = 'expense'
                AND t.real_payer_id = hm.profile_id
                AND EXTRACT(YEAR FROM t.occurred_at) = EXTRACT(YEAR FROM CURRENT_DATE)
                AND EXTRACT(MONTH FROM t.occurred_at) = EXTRACT(MONTH FROM CURRENT_DATE)
                THEN t.amount
                ELSE 0
            END
        ), 0),
        0
    ) as net_pending_amount,

    NOW() as last_updated

FROM household_members hm
JOIN profiles p ON hm.profile_id = p.id
LEFT JOIN contributions c ON hm.household_id = c.household_id
    AND hm.profile_id = c.profile_id
    AND c.year = EXTRACT(YEAR FROM CURRENT_DATE)
    AND c.month = EXTRACT(MONTH FROM CURRENT_DATE)
LEFT JOIN transactions t ON hm.household_id = t.household_id
WHERE hm.role = 'member' OR hm.role = 'owner'  -- Todos los miembros activos
GROUP BY hm.household_id, hm.profile_id, p.email, c.expected_amount, c.paid_amount;

-- Índice único para refresh eficiente
CREATE UNIQUE INDEX idx_mv_member_pending_contributions_unique
ON mv_member_pending_contributions (household_id, profile_id);

-- =============================================================================
-- FASE 3: FUNCIONES STORED PROCEDURES PARA LÓGICA COMPLEJA
-- =============================================================================

-- 3.1 Función para crear transacción de doble flujo automáticamente
CREATE OR REPLACE FUNCTION create_direct_expense_pair(
    p_household_id UUID,
    p_category_id UUID,
    p_amount NUMERIC,
    p_description TEXT,
    p_real_payer_id UUID,
    p_occurred_at DATE,
    p_created_by_email TEXT
) RETURNS UUID AS $$
DECLARE
    v_pair_id UUID;
    v_expense_id UUID;
    v_income_id UUID;
BEGIN
    -- Generar UUID único para el par
    v_pair_id := gen_random_uuid();

    -- Crear la transacción de gasto directo
    INSERT INTO transactions (
        household_id, category_id, type, amount, currency, description,
        occurred_at, flow_type, transaction_pair_id, real_payer_id,
        created_by_email, performed_by_email, performed_at,
        profile_id, paid_by
    ) VALUES (
        p_household_id, p_category_id, 'expense', p_amount, 'EUR', p_description,
        p_occurred_at, 'direct', v_pair_id, p_real_payer_id,
        p_created_by_email, p_created_by_email, p_occurred_at,
        p_real_payer_id, p_real_payer_id
    ) RETURNING id INTO v_expense_id;

    -- Crear la transacción de ingreso automático correspondiente
    INSERT INTO transactions (
        household_id, type, amount, currency,
        description, occurred_at, flow_type, transaction_pair_id,
        created_by_email, performed_by_email, performed_at,
        profile_id
    ) VALUES (
        p_household_id, 'income', p_amount, 'EUR',
        'Ingreso automático por gasto directo: ' || p_description,
        p_occurred_at, 'direct', v_pair_id,
        'system@cuentassik.com', p_created_by_email, p_occurred_at,
        p_real_payer_id
    ) RETURNING id INTO v_income_id;

    RETURN v_pair_id;
END;
$$ LANGUAGE plpgsql;

-- 3.2 Función para calcular contribución neta de un miembro
CREATE OR REPLACE FUNCTION calculate_member_net_contribution(
    p_household_id UUID,
    p_profile_id UUID,
    p_year INTEGER,
    p_month INTEGER
) RETURNS NUMERIC AS $$
DECLARE
    v_expected_amount NUMERIC;
    v_paid_amount NUMERIC;
    v_direct_expenses NUMERIC;
    v_net_contribution NUMERIC;
BEGIN
    -- Obtener contribución esperada y pagada
    SELECT
        COALESCE(expected_amount, 0),
        COALESCE(paid_amount, 0)
    INTO v_expected_amount, v_paid_amount
    FROM contributions
    WHERE household_id = p_household_id
    AND profile_id = p_profile_id
    AND year = p_year
    AND month = p_month;

    -- Si no hay registro, contribución esperada es 0
    v_expected_amount := COALESCE(v_expected_amount, 0);
    v_paid_amount := COALESCE(v_paid_amount, 0);

    -- Calcular gastos directos del mes
    SELECT COALESCE(SUM(amount), 0)
    INTO v_direct_expenses
    FROM transactions
    WHERE household_id = p_household_id
    AND real_payer_id = p_profile_id
    AND flow_type = 'direct'
    AND type = 'expense'
    AND EXTRACT(YEAR FROM occurred_at) = p_year
    AND EXTRACT(MONTH FROM occurred_at) = p_month;

    -- Calcular contribución neta pendiente
    v_net_contribution := GREATEST(
        v_expected_amount - v_paid_amount - v_direct_expenses,
        0
    );

    RETURN v_net_contribution;
END;
$$ LANGUAGE plpgsql;

-- 3.3 Función para refrescar vistas materializadas críticas
CREATE OR REPLACE FUNCTION refresh_critical_matviews()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_household_balances;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_member_pending_contributions;
    REFRESH MATERIALIZED VIEW CONCURRENTLY household_stats;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- FASE 4: TRIGGERS PARA MANTENER VISTAS MATERIALIZADAS ACTUALIZADAS
-- =============================================================================

-- 4.1 Función trigger para refrescar automáticamente tras cambios en transacciones
CREATE OR REPLACE FUNCTION trigger_refresh_transaction_matviews()
RETURNS TRIGGER AS $$
BEGIN
    -- Refrescar de forma asíncrona (mejor performance)
    PERFORM refresh_critical_matviews();
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 4.2 Trigger en transactions para mantener vistas actualizadas
CREATE TRIGGER trigger_transaction_changes_refresh_matviews
    AFTER INSERT OR UPDATE OR DELETE ON transactions
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_refresh_transaction_matviews();

-- 4.3 Trigger similar para contributions
CREATE TRIGGER trigger_contribution_changes_refresh_matviews
    AFTER INSERT OR UPDATE OR DELETE ON contributions
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_refresh_transaction_matviews();

-- =============================================================================
-- FASE 5: SECUENCIAS PERSONALIZADAS PARA IDENTIFICADORES ÚNICOS
-- =============================================================================

-- 5.1 Secuencia para números de referencia de transacciones pares
CREATE SEQUENCE IF NOT EXISTS seq_transaction_pair_ref START 1000;

-- 5.2 Función para generar referencias legibles de pares de transacciones
CREATE OR REPLACE FUNCTION generate_pair_reference(p_household_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_household_code TEXT;
    v_sequence_num INTEGER;
BEGIN
    -- Obtener código corto del hogar (primeras 8 letras del nombre)
    SELECT UPPER(LEFT(REGEXP_REPLACE(name, '[^a-zA-Z]', '', 'g'), 4))
    INTO v_household_code
    FROM households
    WHERE id = p_household_id;

    -- Obtener siguiente número de secuencia
    v_sequence_num := nextval('seq_transaction_pair_ref');

    -- Generar referencia: HOGAR-YYYY-SEQUENCE
    RETURN COALESCE(v_household_code, 'HOUS') || '-' ||
           EXTRACT(YEAR FROM CURRENT_DATE) || '-' ||
           LPAD(v_sequence_num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- FASE 6: ÍNDICES ESPECIALIZADOS PARA CONSULTAS COMPLEJAS
-- =============================================================================

-- 6.1 Índice parcial para transacciones de doble flujo pendientes de procesamiento
CREATE INDEX IF NOT EXISTS idx_transactions_direct_pending
ON transactions (household_id, real_payer_id, occurred_at)
WHERE flow_type = 'direct' AND type = 'expense';

-- 6.2 Índice para búsquedas por rangos de fecha en transacciones
CREATE INDEX IF NOT EXISTS idx_transactions_date_range
ON transactions USING btree (household_id, occurred_at DESC, amount)
WHERE occurred_at IS NOT NULL;

-- 6.3 Índice para contribuciones por período
CREATE INDEX IF NOT EXISTS idx_contributions_period_status
ON contributions (household_id, year, month, status)
WHERE status IS NOT NULL;

-- =============================================================================
-- COMENTARIOS DE DOCUMENTACIÓN
-- =============================================================================

COMMENT ON TYPE flow_type_enum IS 'Tipo de flujo: common (cuenta común) o direct (gastos directos de miembros)';
COMMENT ON TYPE transaction_type_enum IS 'Tipo de transacción: income (ingreso) o expense (gasto)';
COMMENT ON TYPE period_status_enum IS 'Estado del período de contribución: SETUP, LOCKED, CLOSED';

COMMENT ON MATERIALIZED VIEW mv_household_balances IS 'Balance agregado por hogar - REFRESH cada cambio en transacciones';
COMMENT ON MATERIALIZED VIEW mv_member_pending_contributions IS 'Contribuciones pendientes por miembro considerando gastos directos';

COMMENT ON FUNCTION create_direct_expense_pair IS 'Crea automáticamente el par gasto directo + ingreso automático';
COMMENT ON FUNCTION calculate_member_net_contribution IS 'Calcula contribución neta pendiente considerando gastos directos';
COMMENT ON FUNCTION refresh_critical_matviews IS 'Refresca todas las vistas materializadas críticas';

-- =============================================================================
-- RESUMEN DE MEJORAS POSTGRESQL AVANZADAS
-- =============================================================================

-- Esta migración añade:
--
-- 1. ENUMS para mayor consistencia y performance vs TEXT + CHECK
-- 2. VISTAS MATERIALIZADAS para cálculos intensivos (balances, contribuciones)
-- 3. STORED PROCEDURES para lógica compleja (creación pares, cálculos)
-- 4. TRIGGERS automáticos para mantener vistas actualizadas
-- 5. SECUENCIAS para referencias únicas legibles
-- 6. ÍNDICES especializados para consultas específicas
--
-- Beneficios:
-- - Performance: Cálculos pre-computados en vistas materializadas
-- - Consistencia: Enums + constraints + triggers
-- - Mantenibilidad: Lógica compleja en stored procedures
-- - Escalabilidad: Índices optimizados para consultas frecuentes
-- - Integridad: Triggers automáticos para mantener coherencia
