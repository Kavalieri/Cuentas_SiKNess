-- Migración: 20251013_155118_dual_flow_production_optimization.sql
-- Descripción: Optimizaciones finales para sistema dual-flow en producción

-- =============================================================================
-- FASE 1: ENUMS ESPECÍFICOS DEL SISTEMA DUAL-FLOW
-- =============================================================================

-- 1.1 Enum para tipos de transacción dual-flow (4 tipos principales)
CREATE TYPE transaction_type_dual_flow AS ENUM (
    'gasto',           -- Gasto del fondo común (immediate)
    'gasto_directo',   -- Gasto out-of-pocket (requiere reembolso)
    'ingreso',         -- Ingreso al fondo común  
    'ingreso_directo'  -- Reembolso directo (auto-paired)
);

-- 1.2 Enum para estados del workflow dual-flow
CREATE TYPE dual_flow_status AS ENUM (
    'pending_review',  -- Pendiente de revisión manual
    'approved',        -- Aprobado para procesamiento
    'auto_paired',     -- Emparejado automáticamente
    'rejected',        -- Rechazado por el flujo
    'completed'        -- Procesamiento finalizado
);

-- 1.3 Enum para tipos de flujo de fondos
CREATE TYPE dual_flow_type AS ENUM (
    'personal_to_common',  -- Out-of-pocket → común
    'common_to_personal',  -- Común → personal (reembolso)
    'common_fund'          -- Directamente del fondo común
);

-- =============================================================================
-- FASE 2: TABLA DE TRANSACCIONES DUAL-FLOW
-- =============================================================================

-- 2.1 Crear tabla principal para transacciones dual-flow
CREATE TABLE IF NOT EXISTS dual_flow_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    
    -- Información básica de la transacción
    concepto text NOT NULL,
    categoria text NOT NULL,
    importe decimal(10,2) NOT NULL CHECK (importe > 0),
    fecha date NOT NULL DEFAULT CURRENT_DATE,
    
    -- Sistema dual-flow
    tipo transaction_type_dual_flow NOT NULL,
    estado dual_flow_status NOT NULL DEFAULT 'pending_review',
    tipo_flujo dual_flow_type NOT NULL,
    
    -- Miembros involucrados
    creado_por uuid NOT NULL REFERENCES profiles(id),
    pagado_por uuid REFERENCES profiles(id),
    
    -- Sistema de emparejamiento automático
    transaccion_pareja uuid REFERENCES dual_flow_transactions(id),
    auto_paired boolean DEFAULT false,
    requiere_aprobacion boolean DEFAULT true,
    
    -- Configuración de workflow
    umbral_emparejamiento decimal(5,2) DEFAULT 5.00,
    dias_revision integer DEFAULT 7,
    
    -- Auditoría
    created_at timestamp with time zone DEFAULT NOW(),
    updated_at timestamp with time zone DEFAULT NOW(),
    approved_at timestamp with time zone NULL,
    approved_by uuid REFERENCES profiles(id),
    
    -- Constraints
    CONSTRAINT valid_pairing CHECK (
        (tipo = 'gasto_directo' AND tipo_flujo = 'personal_to_common') OR
        (tipo = 'ingreso_directo' AND tipo_flujo = 'common_to_personal') OR
        (tipo = 'gasto' AND tipo_flujo = 'common_fund') OR
        (tipo = 'ingreso' AND tipo_flujo = 'common_fund')
    ),
    
    CONSTRAINT valid_auto_pairing CHECK (
        (auto_paired = true AND transaccion_pareja IS NOT NULL) OR
        (auto_paired = false)
    )
);

-- =============================================================================
-- FASE 3: ÍNDICES DE RENDIMIENTO OPTIMIZADOS
-- =============================================================================

-- 3.1 Índices principales para consultas frecuentes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dual_flow_household_fecha 
ON dual_flow_transactions(household_id, fecha DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dual_flow_estado_tipo 
ON dual_flow_transactions(estado, tipo);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dual_flow_pairing 
ON dual_flow_transactions(transaccion_pareja, auto_paired) 
WHERE transaccion_pareja IS NOT NULL;

-- 3.2 Índices para workflow y aprobación
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dual_flow_pending_approval 
ON dual_flow_transactions(household_id, estado, created_at) 
WHERE estado = 'pending_review';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dual_flow_auto_pairing_candidates 
ON dual_flow_transactions(household_id, tipo, importe, fecha) 
WHERE auto_paired = false AND estado = 'approved';

-- 3.3 Índice partial para transacciones recientes (90 días)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dual_flow_recent 
ON dual_flow_transactions(household_id, fecha DESC, tipo) 
WHERE fecha >= CURRENT_DATE - INTERVAL '90 days';

-- =============================================================================
-- FASE 4: STORED PROCEDURES PARA AUTO-PAIRING
-- =============================================================================

-- 4.1 Función para encontrar candidatos de emparejamiento
CREATE OR REPLACE FUNCTION find_pairing_candidates(
    p_household_id uuid,
    p_transaction_id uuid,
    p_umbral decimal DEFAULT 5.00
)
RETURNS TABLE(
    candidate_id uuid,
    diferencia_importe decimal,
    diferencia_dias integer,
    score decimal
) AS $$
BEGIN
    RETURN QUERY
    WITH transaction_data AS (
        SELECT tipo, importe, fecha, categoria
        FROM dual_flow_transactions
        WHERE id = p_transaction_id
    ),
    candidates AS (
        SELECT 
            t.id as candidate_id,
            ABS(t.importe - td.importe) as diferencia_importe,
            ABS(EXTRACT(days FROM t.fecha - td.fecha))::integer as diferencia_dias,
            -- Score: menor diferencia de importe y tiempo = mejor score
            (ABS(t.importe - td.importe) * 0.7 + 
             ABS(EXTRACT(days FROM t.fecha - td.fecha)) * 0.3) as score
        FROM dual_flow_transactions t, transaction_data td
        WHERE t.household_id = p_household_id
          AND t.id != p_transaction_id
          AND t.transaccion_pareja IS NULL
          AND t.auto_paired = false
          AND t.estado = 'approved'
          -- Lógica de emparejamiento: gasto_directo ↔ ingreso_directo
          AND ((td.tipo = 'gasto_directo' AND t.tipo = 'ingreso_directo') OR
               (td.tipo = 'ingreso_directo' AND t.tipo = 'gasto_directo'))
          -- Misma categoría (opcional, puede relajarse)
          AND t.categoria = td.categoria
          -- Dentro del umbral de importe
          AND ABS(t.importe - td.importe) <= p_umbral
          -- Dentro de 30 días de diferencia
          AND ABS(EXTRACT(days FROM t.fecha - td.fecha)) <= 30
    )
    SELECT 
        c.candidate_id,
        c.diferencia_importe,
        c.diferencia_dias,
        c.score
    FROM candidates c
    ORDER BY c.score ASC
    LIMIT 5; -- Top 5 candidatos
END;
$$ LANGUAGE plpgsql;

-- 4.2 Función para ejecutar emparejamiento automático
CREATE OR REPLACE FUNCTION execute_auto_pairing(
    p_transaction_id uuid,
    p_candidate_id uuid
)
RETURNS boolean AS $$
DECLARE
    v_pairing_id uuid;
BEGIN
    -- Generar UUID único para el emparejamiento
    v_pairing_id := gen_random_uuid();
    
    -- Actualizar ambas transacciones
    UPDATE dual_flow_transactions 
    SET 
        transaccion_pareja = p_candidate_id,
        auto_paired = true,
        estado = 'auto_paired',
        updated_at = NOW()
    WHERE id = p_transaction_id;
    
    UPDATE dual_flow_transactions 
    SET 
        transaccion_pareja = p_transaction_id,
        auto_paired = true,
        estado = 'auto_paired',
        updated_at = NOW()
    WHERE id = p_candidate_id;
    
    -- Verificar que ambas actualizaciones fueron exitosas
    IF FOUND THEN
        RETURN true;
    ELSE
        RETURN false;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- FASE 5: TRIGGERS PARA INTEGRIDAD Y AUTOMATIZACIÓN
-- =============================================================================

-- 5.1 Trigger para updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_dual_flow_updated_at
    BEFORE UPDATE ON dual_flow_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- 5.2 Trigger para auto-pairing automático al aprobar transacciones
CREATE OR REPLACE FUNCTION trigger_auto_pairing()
RETURNS TRIGGER AS $$
DECLARE
    v_candidate_record RECORD;
BEGIN
    -- Solo ejecutar si la transacción fue aprobada y no está ya emparejada
    IF NEW.estado = 'approved' AND OLD.estado != 'approved' 
       AND NEW.auto_paired = false AND NEW.transaccion_pareja IS NULL
       AND NEW.tipo IN ('gasto_directo', 'ingreso_directo') THEN
        
        -- Buscar el mejor candidato
        SELECT * INTO v_candidate_record
        FROM find_pairing_candidates(NEW.household_id, NEW.id, NEW.umbral_emparejamiento)
        ORDER BY score ASC
        LIMIT 1;
        
        -- Si encontramos un candidato, ejecutar emparejamiento
        IF FOUND THEN
            PERFORM execute_auto_pairing(NEW.id, v_candidate_record.candidate_id);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_dual_flow_auto_pairing
    AFTER UPDATE ON dual_flow_transactions
    FOR EACH ROW
    EXECUTE FUNCTION trigger_auto_pairing();

-- =============================================================================
-- FASE 6: VISTAS OPTIMIZADAS PARA EL DASHBOARD
-- =============================================================================

-- 6.1 Vista para balance dual-flow por hogar
CREATE OR REPLACE VIEW v_dual_flow_balance AS
SELECT 
    household_id,
    
    -- Balance general
    SUM(CASE 
        WHEN tipo_flujo = 'common_fund' AND tipo = 'ingreso' THEN importe
        WHEN tipo_flujo = 'common_fund' AND tipo = 'gasto' THEN -importe
        ELSE 0 
    END) as fondo_comun,
    
    -- Gastos personales pendientes (personal → común)
    SUM(CASE 
        WHEN tipo_flujo = 'personal_to_common' AND estado != 'auto_paired' THEN importe
        ELSE 0 
    END) as gastos_personales_pendientes,
    
    -- Reembolsos pendientes (común → personal)  
    SUM(CASE 
        WHEN tipo_flujo = 'common_to_personal' AND estado != 'auto_paired' THEN importe
        ELSE 0 
    END) as reembolsos_pendientes,
    
    -- Flujos de emparejamiento
    SUM(CASE 
        WHEN tipo_flujo = 'personal_to_common' THEN importe
        ELSE 0 
    END) as total_personal_to_common,
    
    SUM(CASE 
        WHEN tipo_flujo = 'common_to_personal' THEN importe
        ELSE 0 
    END) as total_common_to_personal,
    
    -- Estadísticas
    COUNT(*) as total_transacciones,
    COUNT(*) FILTER (WHERE estado = 'pending_review') as pendientes_revision,
    COUNT(*) FILTER (WHERE auto_paired = true) as auto_emparejadas
    
FROM dual_flow_transactions
WHERE fecha >= CURRENT_DATE - INTERVAL '90 days' -- Últimos 90 días
GROUP BY household_id;

-- 6.2 Vista para workflow transaccional
CREATE OR REPLACE VIEW v_dual_flow_workflow AS
SELECT 
    t.*,
    -- Información del par emparejado
    p.concepto as pareja_concepto,
    p.importe as pareja_importe,
    p.tipo as pareja_tipo,
    
    -- Información de miembros
    creador.display_name as creado_por_nombre,
    pagador.display_name as pagado_por_nombre,
    
    -- Cálculos de tiempo
    EXTRACT(days FROM NOW() - t.created_at)::integer as dias_desde_creacion,
    t.dias_revision - EXTRACT(days FROM NOW() - t.created_at)::integer as dias_restantes_revision
    
FROM dual_flow_transactions t
LEFT JOIN dual_flow_transactions p ON t.transaccion_pareja = p.id
LEFT JOIN profiles creador ON t.creado_por = creador.id
LEFT JOIN profiles pagador ON t.pagado_por = pagador.id
ORDER BY t.created_at DESC;

-- =============================================================================
-- FASE 7: CONFIGURACIÓN DE SISTEMA DUAL-FLOW
-- =============================================================================

-- 7.1 Tabla de configuración por hogar
CREATE TABLE IF NOT EXISTS dual_flow_config (
    household_id uuid PRIMARY KEY REFERENCES households(id) ON DELETE CASCADE,
    
    -- Configuración de emparejamiento
    emparejamiento_automatico boolean DEFAULT true,
    umbral_emparejamiento_default decimal(5,2) DEFAULT 5.00,
    tiempo_revision_default integer DEFAULT 7,
    
    -- Límites y umbrales
    limite_gasto_personal decimal(8,2) DEFAULT 200.00,
    requiere_aprobacion_default boolean DEFAULT false,
    
    -- Liquidación automática
    liquidacion_automatica boolean DEFAULT true,
    dias_liquidacion integer DEFAULT 30,
    
    -- Notificaciones
    notificaciones_activas boolean DEFAULT true,
    notificar_nuevos_gastos boolean DEFAULT true,
    notificar_emparejamientos boolean DEFAULT true,
    notificar_limites boolean DEFAULT true,
    notificar_liquidaciones boolean DEFAULT false,
    
    -- Auditoría
    created_at timestamp with time zone DEFAULT NOW(),
    updated_at timestamp with time zone DEFAULT NOW()
);

-- 7.2 Trigger para configuración automática
CREATE OR REPLACE FUNCTION create_default_dual_flow_config()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO dual_flow_config (household_id)
    VALUES (NEW.id)
    ON CONFLICT (household_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_dual_flow_config
    AFTER INSERT ON households
    FOR EACH ROW
    EXECUTE FUNCTION create_default_dual_flow_config();

-- =============================================================================
-- FASE 8: ESTADÍSTICAS Y MONITOREO
-- =============================================================================

-- 8.1 Vista para métricas del sistema
CREATE OR REPLACE VIEW v_dual_flow_metrics AS
SELECT 
    'system_wide' as scope,
    
    -- Estadísticas generales
    COUNT(*) as total_transacciones,
    COUNT(DISTINCT household_id) as hogares_activos,
    
    -- Por tipo
    COUNT(*) FILTER (WHERE tipo = 'gasto_directo') as gastos_directos,
    COUNT(*) FILTER (WHERE tipo = 'gasto') as gastos_comunes,
    COUNT(*) FILTER (WHERE tipo = 'ingreso_directo') as ingresos_directos,
    COUNT(*) FILTER (WHERE tipo = 'ingreso') as ingresos_comunes,
    
    -- Por estado
    COUNT(*) FILTER (WHERE estado = 'pending_review') as pendientes_revision,
    COUNT(*) FILTER (WHERE estado = 'auto_paired') as auto_emparejadas,
    COUNT(*) FILTER (WHERE estado = 'approved') as aprobadas,
    COUNT(*) FILTER (WHERE estado = 'completed') as completadas,
    
    -- Métricas de rendimiento
    ROUND(
        COUNT(*) FILTER (WHERE auto_paired = true)::decimal / 
        NULLIF(COUNT(*), 0) * 100, 2
    ) as porcentaje_auto_pairing,
    
    -- Promedios
    ROUND(AVG(importe), 2) as importe_promedio,
    ROUND(AVG(EXTRACT(days FROM updated_at - created_at)), 1) as dias_promedio_procesamiento
    
FROM dual_flow_transactions
WHERE fecha >= CURRENT_DATE - INTERVAL '30 days';

-- =============================================================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- =============================================================================

COMMENT ON TABLE dual_flow_transactions IS 'Tabla principal del sistema dual-flow con 4 tipos de transacciones y auto-pairing';
COMMENT ON TABLE dual_flow_config IS 'Configuración personalizable del sistema dual-flow por hogar';

COMMENT ON TYPE transaction_type_dual_flow IS 'Tipos de transacción: gasto (común), gasto_directo (out-of-pocket), ingreso (común), ingreso_directo (reembolso)';
COMMENT ON TYPE dual_flow_status IS 'Estados del workflow: pending_review, approved, auto_paired, rejected, completed';
COMMENT ON TYPE dual_flow_type IS 'Tipos de flujo: personal_to_common, common_to_personal, common_fund';

-- Finalización de la migración
SELECT 'Migración dual-flow completada exitosamente' as status;
