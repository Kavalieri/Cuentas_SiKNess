-- Migración: 20251013_150000_simplify_adjustments_and_optimize_db.sql
-- Descripción: Simplificar sistema de ajustes y optimizar DB para el sistema de doble flujo

-- =============================================================================
-- FASE 1: SIMPLIFICAR SISTEMA DE AJUSTES
-- El nuevo sistema de doble flujo reemplaza el complejo sistema de ajustes
-- =============================================================================

-- 1. DEPRECAR tablas de ajustes (mantener por compatibilidad temporal)
-- Estas tablas serán eliminadas en futuras migraciones una vez migrado todo a doble flujo

-- Añadir marca de deprecación
COMMENT ON TABLE contribution_adjustments IS 'DEPRECATED: Será reemplazado por sistema de doble flujo (flow_type en transactions)';
COMMENT ON TABLE contribution_adjustment_templates IS 'DEPRECATED: Será reemplazado por sistema de doble flujo (flow_type en transactions)';
COMMENT ON TABLE journal_adjustments IS 'DEPRECATED: Será reemplazado por sistema de doble flujo (flow_type en transactions)';

-- =============================================================================
-- FASE 2: OPTIMIZAR CONSTRAINTS PARA DOBLE FLUJO
-- =============================================================================

-- 2.1 Añadir constraint UNIQUE en household_savings (faltaba)
ALTER TABLE household_savings
ADD CONSTRAINT unique_household_savings_household_id UNIQUE (household_id);

-- 2.2 Mejorar constraint en flow_type para el doble flujo
ALTER TABLE transactions
DROP CONSTRAINT IF EXISTS check_flow_type;

ALTER TABLE transactions
ADD CONSTRAINT check_flow_type
CHECK (flow_type IN ('common', 'direct'));

-- 2.3 Constraint para transaction_pair_id (solo debe existir en flujo directo)
ALTER TABLE transactions
ADD CONSTRAINT check_transaction_pair_consistency
CHECK (
    (flow_type = 'direct' AND transaction_pair_id IS NOT NULL) OR
    (flow_type = 'common' AND transaction_pair_id IS NULL)
);

-- =============================================================================
-- FASE 3: ÍNDICES COMPUESTOS CRÍTICOS
-- =============================================================================

-- 3.1 Índices compuestos en transactions para queries frecuentes
CREATE INDEX IF NOT EXISTS idx_transactions_household_profile
ON transactions (household_id, profile_id)
WHERE profile_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_household_flow
ON transactions (household_id, flow_type);

CREATE INDEX IF NOT EXISTS idx_transactions_household_date
ON transactions (household_id, occurred_at)
WHERE occurred_at IS NOT NULL;

-- 3.2 Índices en contributions
CREATE INDEX IF NOT EXISTS idx_contributions_household_profile
ON contributions (household_id, profile_id);

CREATE INDEX IF NOT EXISTS idx_contributions_period
ON contributions (household_id, period_year, period_month);

-- 3.3 Índice en household_savings para queries frecuentes
CREATE INDEX IF NOT EXISTS idx_household_savings_household
ON household_savings (household_id);

-- =============================================================================
-- FASE 4: MEJORAR TRIGGERS DE ROLES (OPTIMIZACIÓN)
-- =============================================================================

-- 4.1 Optimizar trigger de auto-owner assignment
-- El trigger actual puede ser costoso, vamos a mejorarlo con condiciones más específicas

CREATE OR REPLACE FUNCTION ensure_household_owner()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo ejecutar si es una inserción o si el role cambió a 'member'
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.role = 'member' AND OLD.role = 'owner') THEN
        -- Verificar si hay al menos un owner en el hogar
        IF NOT EXISTS (
            SELECT 1
            FROM household_members
            WHERE household_id = NEW.household_id
            AND role = 'owner'
            AND (TG_OP = 'INSERT' OR id != NEW.id)  -- Excluir el registro actual en UPDATE
        ) THEN
            -- Si no hay owners, promover al miembro más antiguo
            UPDATE household_members
            SET role = 'owner',
                updated_at = NOW()
            WHERE household_id = NEW.household_id
            AND id = (
                SELECT id
                FROM household_members
                WHERE household_id = NEW.household_id
                ORDER BY joined_at ASC
                LIMIT 1
            );
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Recrear trigger con mejor performance
DROP TRIGGER IF EXISTS trigger_ensure_owner ON household_members;
CREATE TRIGGER trigger_ensure_owner
    AFTER INSERT OR UPDATE OF role ON household_members
    FOR EACH ROW
    EXECUTE FUNCTION ensure_household_owner();

-- =============================================================================
-- FASE 5: VALIDACIONES ADICIONALES PARA DOBLE FLUJO
-- =============================================================================

-- 5.1 Constraint para asegurar que gastos directos tienen real_payer_id
ALTER TABLE transactions
ADD CONSTRAINT check_direct_expenses_have_payer
CHECK (
    (flow_type = 'direct' AND type = 'expense' AND real_payer_id IS NOT NULL) OR
    (flow_type != 'direct' OR type != 'expense')
);

-- 5.2 Constraint para asegurar que ingresos directos están vinculados a gastos directos
ALTER TABLE transactions
ADD CONSTRAINT check_direct_income_paired
CHECK (
    (flow_type = 'direct' AND type = 'income' AND transaction_pair_id IS NOT NULL) OR
    (flow_type != 'direct' OR type != 'income')
);

-- =============================================================================
-- COMENTARIOS PARA DOCUMENTAR EL NUEVO SISTEMA
-- =============================================================================

COMMENT ON COLUMN transactions.flow_type IS 'Tipo de flujo: common (cuenta común) o direct (gastos directos de miembros)';
COMMENT ON COLUMN transactions.transaction_pair_id IS 'UUID que vincula gastos directos con sus ingresos automáticos correspondientes';
COMMENT ON COLUMN transactions.real_payer_id IS 'ID del miembro que realmente pagó en gastos directos (de su bolsillo)';

-- =============================================================================
-- FASE 6: VISTA AUXILIAR PARA TRANSACCIONES DE DOBLE FLUJO
-- =============================================================================

CREATE OR REPLACE VIEW v_transaction_pairs AS
SELECT
    t1.id as expense_id,
    t1.amount as expense_amount,
    t1.description as expense_description,
    t1.category_id as expense_category_id,
    t1.real_payer_id,
    t1.occurred_at,
    t2.id as income_id,
    t2.amount as income_amount,
    t2.description as income_description,
    t1.household_id,
    t1.transaction_pair_id
FROM transactions t1
LEFT JOIN transactions t2 ON t1.transaction_pair_id = t2.transaction_pair_id
    AND t1.id != t2.id
WHERE t1.flow_type = 'direct'
AND t1.type = 'expense';

COMMENT ON VIEW v_transaction_pairs IS 'Vista que muestra pares de transacciones del flujo directo (gasto + ingreso automático)';

-- =============================================================================
-- RESUMEN DE LA MIGRACIÓN
-- =============================================================================

-- Esta migración prepara la base de datos para el sistema de doble flujo:
--
-- 1. FLUJO COMÚN (flow_type = 'common'):
--    - Ingresos y gastos que van a/desde la cuenta común
--    - Sin transaction_pair_id
--    - Sin real_payer_id requerido
--
-- 2. FLUJO DIRECTO (flow_type = 'direct'):
--    - Gastos que alguien paga de su bolsillo pero cuentan como comunes
--    - Siempre van en pares: gasto + ingreso automático
--    - Vinculados por transaction_pair_id
--    - Gastos requieren real_payer_id
--
-- 3. OPTIMIZACIONES:
--    - Índices compuestos para queries frecuentes
--    - Constraints para integridad del doble flujo
--    - Trigger optimizado para gestión de owners
--    - Vista auxiliar para consultas de pares
--
-- 4. DEPRECACIONES:
--    - Sistema de ajustes marcado como deprecated
--    - Será eliminado en futuras migraciones
