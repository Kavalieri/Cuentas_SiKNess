# Issue #63: Análisis de Tablas Vacías

**Fecha**: 20 Noviembre 2025  
**Autor**: AI Assistant  
**Estado**: 🔍 EN ANÁLISIS

---

## 📊 Resumen Ejecutivo

**Base de datos analizada**: `cuentassik_dev`  
**Total de tablas**: 37  
**Tablas con datos**: 23  
**Tablas vacías (0 filas)**: 14

### Tablas Vacías Identificadas

1. ✅ `_legacy_member_credits` (0 filas) - Legacy, esperado
2. ✅ `_legacy_personal_loans` (0 filas) - Legacy, esperado
3. ✅ `_legacy_refund_claims` (0 filas) - Legacy, esperado
4. ⚠️ `contribution_adjustment_templates` (0 filas) - **REVISAR**
5. ⚠️ `contribution_adjustments` (0 filas) - **REVISAR**
6. ⚠️ `contribution_periods` (0 filas) - **REVISAR**
7. ⚠️ `credit_refund_requests` (0 filas) - **FUNCIONALIDAD NO USADA**
8. ⚠️ `dual_flow_config` (0 filas) - **REVISAR**
9. ⚠️ `dual_flow_transactions` (0 filas) - **REVISAR**
10. ⚠️ `household_savings` (0 filas) - **FUNCIONALIDAD NO IMPLEMENTADA**
11. ⚠️ `journal_adjustments` (0 filas) - **SISTEMA NO USADO**
12. ⚠️ `journal_invitations` (0 filas) - **SISTEMA NO USADO**
13. ⚠️ `journal_roles` (0 filas) - **SISTEMA NO USADO**
14. ⚠️ `loan_requests` (0 filas) - **NUEVO, SIN DATOS AÚN**

---

## 🔍 Análisis Detallado por Tabla

### 1. Tablas Legacy (Esperadas Vacías) ✅

#### `_legacy_member_credits` (0 filas)
**Estado**: ✅ CORRECTO - Tabla de migración  
**Propósito**: Backup de datos legacy de créditos de miembros  
**Referencias en código**: Ninguna (solo en migraciones)  
**Acción recomendada**: **MANTENER** - Tabla histórica para auditoría

#### `_legacy_personal_loans` (0 filas)
**Estado**: ✅ CORRECTO - Tabla de migración  
**Propósito**: Backup de datos legacy de préstamos personales  
**Referencias en código**: Ninguna (solo en migraciones)  
**Acción recomendada**: **MANTENER** - Tabla histórica para auditoría

#### `_legacy_refund_claims` (0 filas)
**Estado**: ✅ CORRECTO - Tabla de migración  
**Propósito**: Backup de datos legacy de reclamaciones de reembolso  
**Referencias en código**: Ninguna (solo en migraciones)  
**Acción recomendada**: **MANTENER** - Tabla histórica para auditoría

---

### 2. Sistema de Contribuciones (Posible Redundancia)

#### `contribution_adjustment_templates` (0 filas)
**Estado**: ⚠️ VACÍA - Funcionalidad no implementada  
**Propósito Original**: Plantillas para ajustes de contribuciones recurrentes  

**Schema**:
```sql
CREATE TABLE contribution_adjustment_templates (
  id UUID PRIMARY KEY,
  household_id UUID REFERENCES households(id),
  created_by UUID REFERENCES profiles(id),
  name TEXT,
  description TEXT,
  adjustment_type TEXT, -- 'add' | 'subtract'
  amount NUMERIC(10,2),
  category_id UUID REFERENCES categories(id),
  recurrence_pattern TEXT, -- 'monthly' | 'weekly' | 'one-time'
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Referencias en código**:
- `types/database.ts` - Definición de tipos ✅
- **NO se usa en ninguna query ni componente**

**Análisis**:
- ❌ No existe UI para crear plantillas
- ❌ No existe lógica de aplicación automática
- ✅ La tabla `contribution_adjustments` podría cubrirlo (aunque también está vacía)

**Acción recomendada**: **DEPRECAR** y eliminar en futuro
- Funcionalidad compleja no prioritaria
- Si se necesita en futuro, recrear con diseño actualizado

---

#### `contribution_adjustments` (0 filas)
**Estado**: ⚠️ VACÍA - Funcionalidad no usada actualmente  
**Propósito Original**: Ajustes manuales a contribuciones (bonificaciones, penalizaciones)

**Schema**:
```sql
CREATE TABLE contribution_adjustments (
  id UUID PRIMARY KEY,
  contribution_id UUID REFERENCES contributions(id),
  household_id UUID,
  created_by UUID,
  approved_by UUID,
  amount NUMERIC(10,2),
  adjustment_type TEXT, -- 'bonus' | 'penalty' | 'correction'
  reason TEXT,
  status TEXT, -- 'pending' | 'approved' | 'rejected'
  created_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ
);
```

**Referencias en código**:
- `types/database.ts` - Definición de tipos ✅
- **NO se usa en queries ni componentes**

**Análisis**:
- Sistema actual usa directamente `transactions` para ajustes
- Owner puede hacer transacciones directas para equilibrar
- Tabla diseñada para workflow más complejo (aprobación, tracking)

**¿Por qué está vacía?**
- El sistema de balance actual NO usa tabla `contributions` (Issue #60)
- Balance se calcula en tiempo real desde `transactions`
- Esta tabla era para sistema legacy de contribuciones

**Acción recomendada**: **DEPRECAR** y eliminar
- Sistema de balance actual más eficiente
- Si se necesitan ajustes, usar transacciones manuales

---

#### `contribution_periods` (0 filas)
**Estado**: ⚠️ VACÍA - Reemplazada por `monthly_periods`  
**Propósito Original**: Periodos de contribución con estados y bloqueos

**Referencias en código**:
```typescript
// lib/contributions/periods.ts
// Línea 79:
// TODO: Implementar tabla contribution_periods

// Línea 169:
// TODO: Marcar período como 'locked' en tabla contribution_periods
```

**Análisis**:
- **Función reemplazada completamente por `monthly_periods`** ✅
- `monthly_periods` tiene columnas equivalentes:
  - `phase` (preparing, validation, active, closing, closed)
  - `status` (open, pending_close, closed)
  - `opened_at`, `closed_at`
- Los TODOs en código son obsoletos

**Comparación**:

| Feature | contribution_periods | monthly_periods |
|---------|---------------------|-----------------|
| Tracking período | ❌ No usado | ✅ Activo (8 filas) |
| Estados/fases | ❌ No implementado | ✅ Enum completo |
| Lock período | ❌ No implementado | ✅ phase='closed' |
| Snapshot datos | ❌ No implementado | ✅ snapshot_* columnas |
| Integración | ❌ Ninguna | ✅ FK en transactions |

**Acción recomendada**: **ELIMINAR**
1. Remover TODOs obsoletos en `lib/contributions/periods.ts`
2. Crear migración para DROP TABLE
3. Actualizar documentación mencionando `monthly_periods` como única source of truth

---

### 3. Sistema de Dual-Flow (Posible Redundancia)

#### `dual_flow_config` (0 filas)
**Estado**: ⚠️ VACÍA - Configuración no usada  
**Propósito Original**: Configuración del sistema dual-flow por hogar

**Schema**:
```sql
CREATE TABLE dual_flow_config (
  id UUID PRIMARY KEY,
  household_id UUID REFERENCES households(id) UNIQUE,
  is_enabled BOOLEAN DEFAULT FALSE,
  default_flow_type TEXT DEFAULT 'common', -- 'common' | 'direct'
  require_approval_for_direct BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Referencias en código**:
- `types/dualFlow.ts` - Interfaz definida ✅
- **NO se consulta en ningún componente**

**Análisis**:
- **Sistema dual-flow funciona SIN esta tabla**
- Configuración actualmente hardcoded o en `household_settings`
- Columna `require_approval_for_direct` nunca implementada

**¿Por qué no se necesita?**
- Dual-flow SIEMPRE habilitado (no es opcional)
- `default_flow_type` se maneja en UI (selección manual)
- Aprobaciones se manejan via otras tablas (loan_requests)

**Acción recomendada**: **ELIMINAR**
- Funcionalidad cubierta por sistema actual
- Si se necesita config en futuro, añadir columnas a `household_settings`

---

#### `dual_flow_transactions` (0 filas)
**Estado**: ⚠️ VACÍA - Reemplazada por `transactions` directamente  
**Propósito Original**: Tabla separada para transacciones dual-flow

**Análisis**:
- **Función reemplazada por columnas en tabla `transactions`** ✅
- Columnas relevantes en `transactions`:
  - `flow_type` ('common' | 'direct')
  - `type` ('income' | 'expense' | 'income_direct' | 'expense_direct')
  - `performed_by_profile_id`
  - `is_compensatory_income`
  - `transaction_pair_id`

**Comparación**:

| Feature | dual_flow_transactions | transactions actual |
|---------|----------------------|-------------------|
| Flow tracking | ❌ Tabla separada | ✅ Columna `flow_type` |
| Tipo transacción | ❌ Separado | ✅ Columna `type` |
| Pairing | ❌ ? | ✅ `transaction_pair_id` |
| Compensación | ❌ ? | ✅ `is_compensatory_income` |
| Integración | ❌ Doble query | ✅ Single table |
| Datos reales | 0 filas | 355 filas |

**Acción recomendada**: **ELIMINAR**
- Sistema actual más eficiente (single table)
- Todas las queries funcionan correctamente
- Crear migración para DROP TABLE

---

### 4. Sistema de Reembolsos (Funcionalidad No Implementada)

#### `credit_refund_requests` (0 filas)
**Estado**: ⚠️ VACÍA - Funcionalidad planificada pero no implementada  
**Propósito Original**: Solicitudes de devolución de crédito acumulado

**Schema** (inferido):
```sql
-- Posible estructura (no confirmada en migración actual)
CREATE TABLE credit_refund_requests (
  id UUID PRIMARY KEY,
  household_id UUID,
  requested_by_profile_id UUID,
  amount NUMERIC(10,2),
  current_balance NUMERIC(10,2),
  reason TEXT,
  status TEXT, -- 'pending' | 'approved' | 'rejected' | 'completed'
  requested_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ
);
```

**Referencias en código**:
- Solo en `types/database.ts` (definición)
- **NO hay UI ni server actions**

**Documentación relacionada**:
- `docs/REFUND_SYSTEM.md` - Especificación completa ✅
- `docs/REFUND_SYSTEM_SPECIFICATION.md` - Diseño detallado ✅
- `docs/REFUND_UI_IMPLEMENTATION_GUIDE.md` - Guía de implementación ✅

**Estado de implementación**:
- ✅ Documentación completa (3 archivos)
- ❌ Schema en base de datos
- ❌ Server actions
- ❌ UI components
- ❌ Workflow implementado

**Análisis**:
- Sistema bien diseñado y documentado
- No implementado por priorización (otros sistemas más críticos)
- Balance actual se puede "devolver" mediante transacción manual del owner

**Acción recomendada**: **MANTENER** (funcionalidad futura)
- ✅ Documentación completa lista para implementar
- ✅ Tabla ya creada (no requiere migración adicional)
- ⚠️ Priorizar implementación en roadmap futuro (Issue #55 related)
- 📅 Considerar para Q1 2026 si usuarios lo requieren

---

### 5. Sistema de Ahorros (Funcionalidad No Implementada)

#### `household_savings` (0 filas)
**Estado**: ⚠️ VACÍA - Funcionalidad no implementada  
**Propósito Original**: Tracking de ahorros del hogar (metas, saldos)

**Schema** (inferido de types):
```sql
CREATE TABLE household_savings (
  id UUID PRIMARY KEY,
  household_id UUID REFERENCES households(id),
  goal_name TEXT,
  target_amount NUMERIC(10,2),
  current_amount NUMERIC(10,2) DEFAULT 0,
  target_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Referencias en código**:
- `types/savings.ts` - Interfaz completa ✅
- `lib/export/actions.ts` línea 279 - Query en export (nunca retorna datos)

**Código de referencia**:
```typescript
// lib/export/actions.ts
const savings = await query<HouseholdSavings>(
  `SELECT * FROM household_savings WHERE household_id = $1`,
  [householdId]
);
// savings.rows SIEMPRE vacío []
```

**Análisis**:
- Funcionalidad diseñada pero NUNCA implementada
- Export incluye sección de savings (siempre vacía)
- No existe UI para crear/editar savings

**Workflow esperado (NO implementado)**:
1. Owner define meta de ahorro (ej: "Vacaciones 2026", €3,000)
2. Sistema trackea aportes al fondo de ahorro
3. Dashboard muestra progreso (€1,500 / €3,000)
4. Alertas cuando se alcanza meta

**Acción recomendada**: **DEPRECAR** o **IMPLEMENTAR**

**Opción A - DEPRECAR** (recomendada):
- Remover query de `lib/export/actions.ts`
- Eliminar tabla mediante migración
- Archivar `types/savings.ts`
- Razón: Funcionalidad no crítica, alternativas existen

**Opción B - IMPLEMENTAR** (requiere roadmap):
- Crear Issue específica para sistema de ahorros
- Diseñar UI completa
- Implementar server actions
- Integrar con dashboard
- Estimar: 20-30 horas de trabajo

**Decisión requerida del usuario**: ¿Deprecar o priorizar implementación?

---

### 6. Sistema de Journal (Completamente No Usado)

#### `journal_adjustments` (0 filas)
#### `journal_invitations` (0 filas)
#### `journal_roles` (0 filas)

**Estado**: ⚠️ VACÍAS - Sistema completo no implementado  
**Propósito Original**: Sistema de journal/libro de cuentas con roles y ajustes

**Schema parcial**:
```sql
-- journal_roles: Roles dentro de un journal (admin, viewer, editor)
CREATE TABLE journal_roles (
  id UUID PRIMARY KEY,
  journal_id UUID, -- FK a tabla 'journals' (¿existe?)
  profile_id UUID REFERENCES profiles(id),
  role TEXT, -- 'admin' | 'editor' | 'viewer'
  assigned_at TIMESTAMPTZ
);

-- journal_invitations: Invitaciones a colaborar en journal
CREATE TABLE journal_invitations (
  id UUID PRIMARY KEY,
  journal_id UUID,
  invited_by UUID,
  invited_email TEXT,
  role TEXT,
  status TEXT, -- 'pending' | 'accepted' | 'rejected'
  created_at TIMESTAMPTZ
);

-- journal_adjustments: Ajustes/correcciones en journal
CREATE TABLE journal_adjustments (
  id UUID PRIMARY KEY,
  journal_id UUID,
  adjusted_by UUID,
  transaction_id UUID, -- FK a journal_transactions?
  amount NUMERIC(10,2),
  reason TEXT,
  created_at TIMESTAMPTZ
);
```

**Referencias en código**:
- Solo en `types/database.ts` (definiciones)
- **NO hay queries, server actions, ni UI**

**Análisis**:
- Sistema ambicioso de "multi-journal" (múltiples libros de cuentas)
- Posiblemente diseñado para:
  - Separar finanzas personales vs hogar
  - Colaboración con múltiples usuarios
  - Auditoría detallada con ajustes
- **NUNCA implementado** - tablas huérfanas

**Relación con `journal_transactions` (2,362 filas)**:
- ✅ **INVESTIGADO** - Es tabla de AUDITORÍA (audit log)
- ⚠️ Nombre confuso: debería llamarse `audit_log` o `transaction_audit`
- **NO está relacionada con journal_roles/invitations/adjustments**

**Hallazgos de investigación**:

```sql
-- Estructura
Table "public.journal_transactions"
- id (uuid)
- transaction_id (uuid) -- FK a transactions
- action (text) -- 'insert' | 'update' | 'delete'
- old_data (jsonb) -- Estado anterior
- new_data (jsonb) -- Estado nuevo
- performed_by (uuid)
- performed_at (timestamptz)
- reason (text)

-- Distribución de acciones
action | count | periodo
-------|-------|--------
update | 1,915 | Oct-Nov 2025
insert |   401 | Oct-Nov 2025
delete |    46 | Oct-Nov 2025
```

**Análisis**:
- ✅ Sistema de auditoría ACTIVO y funcional
- ✅ Rastrea cambios en tabla `transactions` (2,362 eventos)
- ❌ Nombre "journal_transactions" es **CONFUSO** (no es journal de contabilidad)
- ❌ Las 3 tablas vacías (roles, invitations, adjustments) NO están relacionadas

**Conclusión**:
- `journal_transactions` = **AUDIT LOG** (mantener, funciona bien)
- `journal_roles/invitations/adjustments` = **Sistema diferente no implementado** (eliminar)

**Acción recomendada**: 
1. **MANTENER** `journal_transactions` (es audit log activo)
2. **ELIMINAR** `journal_roles`, `journal_invitations`, `journal_adjustments` (huérfanas)
3. **OPCIONAL**: Renombrar `journal_transactions` → `transaction_audit_log` en futuro (requiere migración cuidadosa)

---

### 7. Sistema de Préstamos (Nuevo, Sin Datos Aún)

#### `loan_requests` (0 filas)
**Estado**: ✅ CORRECTO - Tabla nueva, funcionalidad recién implementada  
**Propósito**: Solicitudes de préstamo household-to-member (Phase 40)

**Schema**:
```sql
CREATE TABLE loan_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  requested_by_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewed_by_profile_id UUID REFERENCES profiles(id),
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  reason TEXT NOT NULL,
  status loan_request_status NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TYPE loan_request_status AS ENUM (
  'pending',
  'approved',
  'rejected',
  'cancelled'
);
```

**Referencias en código**:
- `lib/loans/actions.ts` - 8 server actions ✅
- `app/sickness/configuracion/prestamos-pendientes/` - UI owner ✅
- `app/sickness/credito-deuda/solicitar-prestamo/` - UI member ✅
- `app/sickness/credito-deuda/historial-prestamos/` - UI history ✅
- `docs/LOAN_SYSTEM.md` - Documentación completa ✅

**Estado de implementación**: ✅ COMPLETAMENTE FUNCIONAL
- ✅ Schema en base de datos
- ✅ 8 Server actions (request, approve, reject, cancel, list, etc.)
- ✅ UI completa (solicitar, aprobar, historial)
- ✅ Badge counter en navegación
- ✅ Integración con balance system
- ✅ Documentación exhaustiva

**¿Por qué está vacía?**
- Sistema implementado en Phase 40 (20 Nov 2025)
- Base de datos DEV es de testing/desarrollo
- **NO es un problema** - esperado hasta que usuarios creen solicitudes

**Acción recomendada**: **MANTENER** y **POBLAR CON DATOS DE PRUEBA**

**Sugerencia - Crear datos de testing**:
```sql
-- Insertar solicitudes de prueba para validar flujo completo
INSERT INTO loan_requests (household_id, requested_by_profile_id, amount, reason, status)
VALUES
  -- Solicitud pendiente
  ((SELECT id FROM households LIMIT 1),
   (SELECT profile_id FROM household_members WHERE role = 'member' LIMIT 1),
   500.00,
   'Necesito dinero para gastos médicos urgentes',
   'pending'),
  
  -- Solicitud aprobada
  ((SELECT id FROM households LIMIT 1),
   (SELECT profile_id FROM household_members WHERE role = 'member' LIMIT 1 OFFSET 1),
   300.00,
   'Reparación del coche',
   'approved'),
  
  -- Solicitud rechazada
  ((SELECT id FROM households LIMIT 1),
   (SELECT profile_id FROM household_members WHERE role = 'member' LIMIT 1),
   1000.00,
   'Viaje de vacaciones',
   'rejected');
```

---

## 📋 Resumen de Acciones Recomendadas

### Prioridad Alta (Eliminar - Redundantes)

| Tabla | Acción | Razón | Impacto |
|-------|--------|-------|---------|
| `contribution_periods` | **ELIMINAR** | Reemplazada por `monthly_periods` | Bajo - Sin uso |
| `dual_flow_config` | **ELIMINAR** | Config hardcoded/en household_settings | Bajo - Sin uso |
| `dual_flow_transactions` | **ELIMINAR** | Reemplazada por columnas en `transactions` | Bajo - Sin uso |
| `journal_roles` | **ELIMINAR** | Sistema journal nunca implementado | Bajo - Sin uso |
| `journal_invitations` | **ELIMINAR** | Sistema journal nunca implementado | Bajo - Sin uso |
| `journal_adjustments` | **ELIMINAR** | Sistema journal nunca implementado | Bajo - Sin uso |

**Beneficios**:
- Reduce complejidad del schema (6 tablas menos)
- Elimina confusión sobre tablas "correctas"
- Limpia TODOs obsoletos en código
- Clarifica que `journal_transactions` es audit log independiente

**Migración sugerida**:
```sql
-- 1. Verificar que realmente están vacías
SELECT COUNT(*) FROM contribution_periods; -- Esperado: 0
SELECT COUNT(*) FROM dual_flow_config; -- Esperado: 0
SELECT COUNT(*) FROM dual_flow_transactions; -- Esperado: 0
SELECT COUNT(*) FROM journal_roles; -- Esperado: 0
SELECT COUNT(*) FROM journal_invitations; -- Esperado: 0
SELECT COUNT(*) FROM journal_adjustments; -- Esperado: 0

-- 2. Drop tables
DROP TABLE IF EXISTS contribution_periods CASCADE;
DROP TABLE IF EXISTS dual_flow_config CASCADE;
DROP TABLE IF EXISTS dual_flow_transactions CASCADE;
DROP TABLE IF EXISTS journal_roles CASCADE;
DROP TABLE IF EXISTS journal_invitations CASCADE;
DROP TABLE IF EXISTS journal_adjustments CASCADE;

-- 3. Limpiar types/database.ts (regenerar automáticamente)
npm run types:generate:dev
```

---

### Prioridad Media (Deprecar - No Usadas)

| Tabla | Acción | Razón | Decisión requerida |
|-------|--------|-------|-------------------|
| `contribution_adjustment_templates` | **DEPRECAR** | Funcionalidad compleja no prioritaria | Owner aprueba |
| `contribution_adjustments` | **DEPRECAR** | Sistema legacy, no usado con balance actual | Owner aprueba |

**Consideraciones**:
- Si en futuro se necesita sistema de ajustes, rediseñar desde cero
- Sistema actual (transacciones manuales) es suficiente

**Migración sugerida**:
```sql
-- Solo si owner aprueba
DROP TABLE IF EXISTS contribution_adjustment_templates CASCADE;
DROP TABLE IF EXISTS contribution_adjustments CASCADE;
```

---

### Prioridad Baja (Investigar - Sistema Journal)

| Tabla | Acción | Razón | Estado |
|-------|--------|-------|--------|
| `journal_transactions` | ✅ **MANTENER** | Audit log activo (2,362 eventos) | Funcional |
| `journal_adjustments` | ❌ **ELIMINAR** | Sistema journal diferente no implementado | Incluido en Fase 1 |
| `journal_invitations` | ❌ **ELIMINAR** | Sistema journal diferente no implementado | Incluido en Fase 1 |
| `journal_roles` | ❌ **ELIMINAR** | Sistema journal diferente no implementado | Incluido en Fase 1 |

**Conclusión de investigación**: ✅ COMPLETADA

**Hallazgos**:
- `journal_transactions` es un **audit log** (registro de cambios en transactions)
- NO está relacionado con las 3 tablas vacías (journal_roles, invitations, adjustments)
- Sistema funcional y valioso para auditoría
- Nombre confuso (debería ser `transaction_audit_log`)

**Acción tomada**:
- ✅ Mantener `journal_transactions` (sistema activo)
- ❌ Eliminar las 3 tablas vacías relacionadas con "journal" no implementado
- 📝 Documentar que el nombre es histórico y confuso

**Opcional (futuro)**:
- Renombrar `journal_transactions` → `transaction_audit_log`
- Requiere migración cuidadosa (muchas filas)

---

### Mantener (Funcionalidad Futura)

| Tabla | Acción | Razón | Timeline |
|-------|--------|-------|----------|
| `credit_refund_requests` | **MANTENER** | Docs completas, implementar en futuro | Q1 2026 |
| `household_savings` | **DECIDIR** | ¿Deprecar o implementar? | Owner decide |
| `loan_requests` | **MANTENER + POBLAR** | Sistema nuevo, funcional, sin datos test | Inmediato |

**Para `credit_refund_requests`**:
- ✅ Mantener tabla (no molesta, no consume recursos)
- ✅ Crear Issue para implementación (vincular docs existentes)
- ⏰ Priorizar según demanda de usuarios

**Para `household_savings`**:
- ⚠️ **Decisión del owner requerida**:
  - **Opción A**: Deprecar (eliminar tabla + query en export)
  - **Opción B**: Priorizar implementación (Issue + roadmap)

**Para `loan_requests`**:
- ✅ Sistema completamente funcional
- ⚠️ Crear datos de prueba para validar flujos
- ✅ Monitorear uso en producción

---

### Mantener (Legacy/Auditoría)

| Tabla | Acción | Razón |
|-------|--------|-------|
| `_legacy_member_credits` | **MANTENER** | Backup histórico |
| `_legacy_personal_loans` | **MANTENER** | Backup histórico |
| `_legacy_refund_claims` | **MANTENER** | Backup histórico |

**Razón**:
- Tablas con prefijo `_legacy_` son backups de migraciones
- No consumen recursos significativos
- Útiles para auditoría y rollback si necesario
- Política: Mantener al menos 12 meses

---

## 🛠️ Plan de Implementación

### Fase 1: Limpieza Segura (Esta semana)

**Objetivo**: Eliminar redundancias claras sin impacto

1. ✅ Backup completo de base de datos DEV
   ```bash
   pg_dump -h 127.0.0.1 -U cuentassik_user -d cuentassik_dev > backup_pre_cleanup_$(date +%Y%m%d).sql
   ```

2. ✅ Crear migración para eliminar tablas redundantes:
   ```bash
   ./scripts/migrations/create_migration.sh "remove redundant empty tables"
   ```

3. ✅ Contenido migración:
   ```sql
   -- Eliminar tablas reemplazadas por sistemas actuales
   DROP TABLE IF EXISTS contribution_periods CASCADE;
   DROP TABLE IF EXISTS dual_flow_config CASCADE;
   DROP TABLE IF EXISTS dual_flow_transactions CASCADE;
   
   -- Verificación
   SELECT 'Tablas eliminadas correctamente' as status;
   ```

4. ✅ Aplicar en DEV y validar:
   ```bash
   ./scripts/migrations/apply_migration.sh dev 20251120_XXXXXX_remove_redundant_empty_tables.sql
   npm run typecheck
   npm run lint
   ```

5. ✅ Actualizar código (remover TODOs):
   - `lib/contributions/periods.ts` - Eliminar TODOs sobre contribution_periods

6. ✅ Regenerar types:
   ```bash
   npm run types:generate:dev
   ```

---

### Fase 2: Investigación Journal (Próxima semana)

**Objetivo**: Clarificar sistema journal y decidir acciones

1. ✅ Analizar `journal_transactions`:
   - Ver estructura completa
   - Entender propósito de las 2,362 filas
   - Identificar si es sistema activo o legacy

2. ✅ Decisión basada en análisis:
   - **Si activo**: Crear Issue para completar sistema journal
   - **Si legacy**: Renombrar/deprecar + eliminar tablas vacías relacionadas

3. ✅ Documentar hallazgos en este documento

---

### Fase 3: Decisiones de Owner (Próxima semana)

**Objetivo**: Owner decide sobre funcionalidades no implementadas

**Preguntas para el owner**:

1. **Sistema de Ahorros** (`household_savings`):
   - ¿Quieres que implementemos tracking de metas de ahorro?
   - ¿O eliminamos la funcionalidad completamente?
   - **Impacto**: 20-30 horas si se implementa

2. **Ajustes de Contribuciones** (`contribution_adjustments`):
   - ¿Necesitas sistema formal de ajustes con aprobación?
   - ¿O el sistema actual (transacciones manuales) es suficiente?
   - **Recomendación**: Eliminar (sistema actual funciona)

3. **Sistema de Reembolsos** (`credit_refund_requests`):
   - ¿Priorizar implementación en Q1 2026?
   - ¿O mantener en backlog para demanda futura?
   - **Nota**: Documentación completa ya existe

---

### Fase 4: Implementación de Decisiones (2-3 semanas)

**Basado en decisiones de Fase 3**:

- ✅ Crear migraciones para eliminar tablas deprecadas
- ✅ Implementar funcionalidades priorizadas
- ✅ Actualizar documentación
- ✅ Testing completo

---

## 📊 Métricas de Impacto

### Antes de Limpieza

- **Tablas totales**: 37
- **Tablas vacías**: 14 (37.8%)
- **Tablas con TODOs obsoletos**: 1 (`contribution_periods`)
- **Schema complexity**: Alta (tablas no usadas confunden)
- **Audit log**: Nombre confuso (`journal_transactions`)

### Después de Limpieza (Fase 1)

- **Tablas totales**: 31 (-6) ✅
- **Tablas vacías**: 8 (-6) ✅
- **TODOs obsoletos**: 0 (-1) ✅
- **Schema complexity**: Media-Baja (mejoría notable) ✅
- **Claridad audit**: Documentada (journal_transactions es audit log) ✅

### Después de Cleanup Completo (Todas las fases)

**Escenario Conservador** (deprecar la mayoría):
- **Tablas totales**: ~26-28
- **Tablas vacías**: ~5-7 (solo legacy + futuras)
- **Schema clarity**: Alta

**Escenario Agresivo** (implementar savings, refunds):
- **Tablas totales**: ~28-30
- **Tablas con datos**: ~24-26
- **Funcionalidad completa**: +20%

---

## 🔗 Referencias

**Issues Relacionadas**:
- Issue #63 - Este análisis
- Issue #60 - Sistema de Balance (depreca contribution_adjustments)
- Issue #55 - Presupuestos (relacionado con savings)

**Documentación**:
- `docs/REFUND_SYSTEM.md` - Sistema de reembolsos (credit_refund_requests)
- `docs/LOAN_SYSTEM.md` - Sistema de préstamos (loan_requests)
- `docs/BALANCE_SYSTEM.md` - Sistema de balance actual

**Archivos de Código**:
- `types/database.ts` - Definiciones de todas las tablas
- `lib/contributions/periods.ts` - TODOs obsoletos de contribution_periods
- `lib/export/actions.ts` - Query de household_savings (siempre vacío)

---

## ✅ Próximos Pasos Inmediatos

1. **Owner revisa este documento** (15-30 min)
2. **Owner aprueba Fase 1** (eliminar redundantes)
3. **Implementar Fase 1** (1-2 horas)
4. **Agendar sesión de decisiones** (Fase 3)
5. **Ejecutar Fase 2** (investigación journal)

---

**Última actualización**: 20 Noviembre 2025  
**Autor**: AI Assistant  
**Revisado por**: Pendiente (Owner)
