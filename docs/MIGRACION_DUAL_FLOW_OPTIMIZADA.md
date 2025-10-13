# Migración Dual-Flow Production-Ready

**Archivo**: `20251013_155118_dual_flow_production_optimization.sql`
**Estado**: ✅ Completada en `development/` - Lista para testing
**Objetivo**: Sistema completo de transacciones dual-flow con auto-pairing

---

## 🚀 RESUMEN EJECUTIVO

Esta migración implementa el **sistema dual-flow completo** con arquitectura PostgreSQL avanzada:

- ✅ **4 tipos de transacciones** (gasto, gasto_directo, ingreso, ingreso_directo)
- ✅ **Auto-pairing inteligente** con stored procedures
- ✅ **Workflow automatizado** con triggers y estados
- ✅ **Vistas optimizadas** para dashboard
- ✅ **Configuración por hogar** flexible
- ✅ **Índices de rendimiento** para consultas frecuentes

---

## 📊 COMPONENTES IMPLEMENTADOS

### 🏗️ FASE 1: Tipos de Datos (ENUMs)

```sql
-- Tipos de transacción dual-flow
CREATE TYPE transaction_type_dual_flow AS ENUM (
    'gasto',           -- Gasto del fondo común (immediate)
    'gasto_directo',   -- Gasto out-of-pocket (requiere reembolso)
    'ingreso',         -- Ingreso al fondo común
    'ingreso_directo'  -- Reembolso directo (auto-paired)
);

-- Estados del workflow
CREATE TYPE dual_flow_status AS ENUM (
    'pending_review',  -- Pendiente de revisión manual
    'approved',        -- Aprobado para procesamiento
    'auto_paired',     -- Emparejado automáticamente
    'rejected',        -- Rechazado por el flujo
    'completed'        -- Procesamiento finalizado
);

-- Tipos de flujo de fondos
CREATE TYPE dual_flow_type AS ENUM (
    'personal_to_common',  -- Out-of-pocket → común
    'common_to_personal',  -- Común → personal (reembolso)
    'common_fund'          -- Directamente del fondo común
);
```

### 🗃️ FASE 2: Tabla Principal

**`dual_flow_transactions`**: Tabla central del sistema

**Campos clave**:

- `tipo`: transaction_type_dual_flow (4 tipos)
- `estado`: dual_flow_status (workflow)
- `tipo_flujo`: dual_flow_type (dirección del dinero)
- `transaccion_pareja`: Auto-pairing entre transacciones
- `auto_paired`: Boolean de emparejamiento automático
- `umbral_emparejamiento`: Configuración por transacción
- `dias_revision`: Límite de tiempo para revisión

**Constraints inteligentes**:

- Validación tipo-flujo coherente
- Validación auto-pairing consistente

### ⚡ FASE 3: Índices de Rendimiento

```sql
-- Consultas por hogar y fecha (dashboard)
idx_dual_flow_household_fecha

-- Filtrado por estado y tipo (workflow)
idx_dual_flow_estado_tipo

-- Auto-pairing performance
idx_dual_flow_pairing

-- Transacciones pendientes de aprobación
idx_dual_flow_pending_approval

-- Candidatos para auto-pairing
idx_dual_flow_auto_pairing_candidates

-- Transacciones recientes (90 días)
idx_dual_flow_recent
```

### 🤖 FASE 4: Auto-Pairing Inteligente

#### Stored Procedure: `find_pairing_candidates()`

**Propósito**: Encontrar candidatos para emparejamiento automático

**Algoritmo**:

1. **Tipos complementarios**: `gasto_directo` ↔ `ingreso_directo`
2. **Misma categoría**: Mismo tipo de gasto
3. **Umbral de importe**: Diferencia <= configurado (default: €5)
4. **Ventana temporal**: Máximo 30 días de diferencia
5. **Scoring**: Peso 70% importe + 30% tiempo

**Retorna**: Top 5 candidatos ordenados por score

#### Stored Procedure: `execute_auto_pairing()`

**Propósito**: Ejecutar emparejamiento entre dos transacciones

**Proceso**:

1. Actualizar `transaccion_pareja` en ambas
2. Cambiar `auto_paired = true`
3. Cambiar `estado = 'auto_paired'`
4. Actualizar timestamps

### ⚙️ FASE 5: Triggers Automáticos

#### `trigger_dual_flow_updated_at`

- Actualiza `updated_at` automáticamente en cada UPDATE

#### `trigger_dual_flow_auto_pairing`

- **Disparo**: Cuando transacción cambia a estado `approved`
- **Acción**: Busca candidatos y ejecuta auto-pairing si encuentra match
- **Condiciones**: Solo para `gasto_directo` e `ingreso_directo`

### 📊 FASE 6: Vistas Dashboard

#### Vista: `v_dual_flow_balance`

**Métricas por hogar**:

- `fondo_comun`: Balance del fondo común
- `gastos_personales_pendientes`: Out-of-pocket sin emparejar
- `reembolsos_pendientes`: Reembolsos sin procesar
- `total_personal_to_common` / `total_common_to_personal`: Flujos totales
- Estadísticas de transacciones y auto-pairing

#### Vista: `v_dual_flow_workflow`

**Dashboard transaccional**:

- Datos completos de transacciones con info de pareja
- Nombres de miembros (creador y pagador)
- Cálculos de tiempo (días desde creación, días restantes)
- Ordenado por fecha de creación DESC

### ⚙️ FASE 7: Configuración Flexible

#### Tabla: `dual_flow_config`

**Configuración por hogar**:

- `emparejamiento_automatico`: ON/OFF global
- `umbral_emparejamiento_default`: Límite de diferencia en €
- `tiempo_revision_default`: Días para revisión manual
- `limite_gasto_personal`: Límite de gastos out-of-pocket
- `liquidacion_automatica`: Liquidación periódica automática
- `notificaciones_*`: Configuración granular de alertas

**Auto-configuración**: Trigger que crea config por defecto para hogares nuevos

### 📈 FASE 8: Métricas y Monitoreo

#### Vista: `v_dual_flow_metrics`

**KPIs del sistema**:

- Total transacciones y hogares activos
- Distribución por tipo de transacción
- Distribución por estado de workflow
- **Porcentaje de auto-pairing**: Eficiencia del sistema
- Promedios de importe y tiempo de procesamiento
- Scope: Últimos 30 días

---

## 🔧 USAR LA MIGRACIÓN

### 1. Aplicar en Development

```bash
# VSCode Task
Ctrl+Shift+P → "🔄 Aplicar Migraciones a DEV"

# O manual
cd database/migrations/development
sudo -u postgres psql -d cuentassik_dev -f 20251013_155118_dual_flow_production_optimization.sql
```

### 2. Testing y Validación

```sql
-- Verificar ENUMs
\dT+ transaction_type_dual_flow
\dT+ dual_flow_status
\dT+ dual_flow_type

-- Verificar tabla principal
\d dual_flow_transactions

-- Verificar vistas
\d v_dual_flow_balance
\d v_dual_flow_workflow

-- Testing básico
INSERT INTO dual_flow_transactions (...)  -- Test data
SELECT * FROM find_pairing_candidates(...);  -- Test auto-pairing
```

### 3. Promoción a Tested

```bash
# Cuando funcione correctamente
Ctrl+Shift+P → "⬆️ Promover Migración (dev → tested)"
```

### 4. Deploy a Production

```bash
# Aplicar en producción
Ctrl+Shift+P → "🚀 Desplegar a PRODUCCIÓN"
```

---

## 📝 INTEGRACIÓN CON APLICACIÓN

### Conexión desde Next.js

```typescript
// lib/dualFlow.ts
import { query } from '@/lib/supabaseServer';

// Obtener balance dual-flow
export async function getDualFlowBalance(householdId: string) {
  const result = await query(
    `
    SELECT * FROM v_dual_flow_balance
    WHERE household_id = $1
  `,
    [householdId],
  );

  return result.rows[0];
}

// Crear transacción dual-flow
export async function createDualFlowTransaction(data: DualFlowTransaction) {
  const result = await query(
    `
    INSERT INTO dual_flow_transactions
    (household_id, concepto, categoria, importe, tipo, tipo_flujo, creado_por)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id
  `,
    [
      data.household_id,
      data.concepto,
      data.categoria,
      data.importe,
      data.tipo,
      data.tipo_flujo,
      data.creado_por,
    ],
  );

  return result.rows[0];
}

// Buscar candidatos para pairing
export async function findPairingCandidates(
  householdId: string,
  transactionId: string,
  umbral: number = 5.0,
) {
  const result = await query(
    `
    SELECT * FROM find_pairing_candidates($1, $2, $3)
  `,
    [householdId, transactionId, umbral],
  );

  return result.rows;
}
```

### Tipos TypeScript

```typescript
// types/dualFlow.ts
export type TransactionTypeDualFlow = 'gasto' | 'gasto_directo' | 'ingreso' | 'ingreso_directo';

export type DualFlowStatus =
  | 'pending_review'
  | 'approved'
  | 'auto_paired'
  | 'rejected'
  | 'completed';

export type DualFlowType = 'personal_to_common' | 'common_to_personal' | 'common_fund';

export interface DualFlowTransaction {
  id: string;
  household_id: string;
  concepto: string;
  categoria: string;
  importe: number;
  fecha: string;
  tipo: TransactionTypeDualFlow;
  estado: DualFlowStatus;
  tipo_flujo: DualFlowType;
  creado_por: string;
  pagado_por?: string;
  transaccion_pareja?: string;
  auto_paired: boolean;
  // ... más campos
}
```

---

## 🎯 SIGUIENTES PASOS

### TODO #9: Refinamiento UX y Testing

1. **Testing completo del auto-pairing**:

   - Crear transacciones de prueba
   - Verificar emparejamiento automático
   - Testing de edge cases

2. **Integración con UI dual-flow**:

   - Conectar `/app/dual-flow/` con nuevas tablas
   - Usar vistas optimizadas en dashboard
   - Implementar workflow real con stored procedures

3. **Validaciones y feedback**:
   - Mensajes de error específicos
   - Validación de constraints en frontend
   - Loading states y optimistic updates

### TODO #10: Integración Sistema Existente

1. **Migración gradual**: Plan para migrar datos existentes
2. **Autenticación compartida**: Usar mismo sistema de usuarios
3. **Navegación fluida**: Enlaces entre sistemas

---

## 🔍 NOTAS TÉCNICAS

### Performance Considerations

- **CONCURRENTLY indexes**: No bloquean la tabla durante creación
- **Partial indexes**: Solo índices donde son necesarios (WHERE clauses)
- **Materialized views**: Considerar para métricas si el volumen crece

### Security Considerations

- **Row Level Security**: Filtrado automático por `household_id`
- **Function permissions**: Solo usuarios autorizados ejecutan stored procedures
- **Audit trail**: Campos `created_at`, `updated_at`, `approved_by`

### Monitoring

- **pg_stat_user_tables**: Monitorear uso de tablas
- **pg_stat_user_indexes**: Eficiencia de índices
- **Vista v_dual_flow_metrics**: KPIs del negocio

---

**✅ MIGRACIÓN COMPLETA Y LISTA PARA TESTING**

**Siguiente acción**: Aplicar en DEV y conectar con UI dual-flow existente.
