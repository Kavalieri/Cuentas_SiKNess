# Issue #30: Deprecar `real_payer_id` - Migrar a `performed_by_profile_id`

**Fecha**: 02 Noviembre 2025
**Estado**: 🔄 EN PROGRESO
**Prerequisito para**: Issue #29 (UI Updates)

---

## 🎯 Objetivo

Deprecar el campo `real_payer_id` y migrar toda su lógica a `performed_by_profile_id`, estableciendo este último como **único campo de verdad** para "quien ejecutó la transacción".

---

## 📊 Análisis de Consistencia de Datos

### DEV - Estado Actual

```sql
      type      | flow_type | total | coinciden | difieren | real_payer_null | performed_null
----------------+-----------+-------+-----------+----------+-----------------+----------------
 expense        | common    |    24 |         0 |        0 |              24 |              0
 income         | common    |     4 |         0 |        0 |               4 |              0
 expense_direct | direct    |    85 |        74 |       11 |               0 |              0
 income_direct  | direct    |    85 |        74 |       11 |               0 |              0
```

**❌ 11 registros inconsistentes** (6.5% de transacciones directas):
- `real_payer_id`: Sarini13 (quien pagó realmente)
- `performed_by_profile_id`: Kava (quien registró en el sistema)
- `profile_id`: Kava (quien registró)

**Ejemplo**:
```
| id | type | description | real_payer_id | performed_by_profile_id | profile_id |
|----|------|-------------|---------------|-------------------------|------------|
| bd44... | expense_direct | Vodafone | Sarini13 | Kava | Kava |
```

### Causa Raíz

Código actual en `lib/transactions/unified.ts:443`:
```typescript
performed_by_profile_id: data.performed_by_profile_id || data.real_payer_id
```

Si se pasa `performed_by_profile_id` explícitamente (ej: Kava registrando un gasto de Sarini13), prevalece sobre `real_payer_id`, creando inconsistencia semántica.

---

## ✅ Regla de Negocio Correcta

**Para transacciones de flujo directo**:
- `performed_by_profile_id` = **Quien pagó de su bolsillo** (NO quien registró)
- `profile_id` = Quien registró en el sistema (auditoría)

**Ejemplo correcto**:
- Sarini13 paga Vodafone (27€) de su bolsillo
- Kava lo registra en el sistema
- **Resultado esperado**:
  - `performed_by_profile_id`: Sarini13 (ejecutó el pago)
  - `real_payer_id`: Sarini13 (DEPRECADO - mismo valor)
  - `profile_id`: Kava (registró)

---

## 📍 Ubicaciones de Uso

### WRITE Locations (4)

**1. `lib/transactions/unified.ts:445`** - Gastos directos
```typescript
real_payer_id: data.real_payer_id, // ❌ ELIMINAR
```

**2. `lib/transactions/unified.ts:443`** - Gastos directos
```typescript
performed_by_profile_id: data.performed_by_profile_id || data.real_payer_id, // ⚠️ CORREGIR lógica
```

**3. `lib/transactions/unified.ts:504`** - Ingresos directos compensatorios
```typescript
real_payer_id: data.real_payer_id, // ❌ ELIMINAR
```

**4. `lib/transactions/unified.ts:502`** - Ingresos directos compensatorios
```typescript
performed_by_profile_id: data.real_payer_id, // ✅ YA CORRECTO (usa real_payer_id como fuente)
```

### READ Locations (Críticas - 8)

**1. `app/api/periods/contributions/route.ts:109-126`** - Cálculo de contribuciones directas
```sql
SELECT real_payer_id, SUM(amount)::numeric::text AS total
FROM transactions
WHERE type = 'expense_direct' AND flow_type = 'direct'
GROUP BY real_payer_id
```
**Cambiar a**: `performed_by_profile_id`

**2. `lib/contributions/periods.ts:238,250,253`** - Cálculo de gastos directos por miembro
```typescript
.select('real_payer_id, amount')
const payerId = expense.real_payer_id;
```
**Cambiar a**: `performed_by_profile_id`

**3. `app/sickness/credito-deuda/actions.ts:184,429`** - Filtros por miembro
```sql
AND real_payer_id = $2
```
**Cambiar a**: `performed_by_profile_id`

**4. `app/sickness/estadisticas/queries-actions.ts:1071,1177`** - Estadísticas personales
```sql
INNER JOIN profiles p ON t.real_payer_id = p.id OR t.profile_id = p.id
AND (t.profile_id = $2 OR t.real_payer_id = $2)
```
**Cambiar a**: `performed_by_profile_id`

**5. `app/sickness/balance/actions.ts:91-102,208-223,272,284,306,320-321`** - Edición de gastos directos
```sql
SELECT real_payer_id, profile_id FROM transactions
const isRealPayer = tx.real_payer_id === profileId;
real_payer_id = $8
```
**Cambiar a**: `performed_by_profile_id`

**6. `app/api/sickness/transactions/global/route.ts:42,79,123`** - Transacciones globales
```sql
(t.profile_id = $2 OR t.real_payer_id = $2)
t.real_payer_id,
LEFT JOIN profiles rp ON t.real_payer_id = rp.id
```
**Cambiar a**: `performed_by_profile_id`

**7. `app/api/transactions/recent/route.ts:47`** - Transacciones recientes
```sql
AND (profile_id = $X OR real_payer_id = $X)
```
**Cambiar a**: `performed_by_profile_id`

**8. `components/shared/data-display/TransactionPairItem.tsx:11,41`** - UI
```typescript
real_payer_id?: string | null;
<span>Miembro: {expense.real_payer_id ?? 'N/A'}</span>
```
**Cambiar a**: `performed_by_profile_id`

### Funciones y Vistas (Legacy - Bajo Impacto)

- `database/migrations/applied/20251101_000000_baseline_v2.1.0.sql`: Múltiples usos en funciones legacy y vistas
- `scripts/data-fixes/20251101_fix_gastos_directos_paid_by.sql`: Scripts de fix históricos

**Acción**: Documentar como DEPRECATED, no modificar funciones legacy por ahora

---

## 🔧 Plan de Implementación

### FASE 1: Corregir Datos Inconsistentes ✅

**Migración**: Corregir 11 registros donde `performed_by_profile_id != real_payer_id`

```sql
-- Para gastos/ingresos directos: performed_by_profile_id DEBE ser real_payer_id
UPDATE transactions
SET performed_by_profile_id = real_payer_id
WHERE flow_type = 'direct'
  AND real_payer_id IS NOT NULL
  AND performed_by_profile_id != real_payer_id;
```

**Resultado esperado**: 22 filas actualizadas (11 expense_direct + 11 income_direct en pares)

### FASE 2: Actualizar Queries de Lectura ⏳

**Archivos a modificar** (8 ubicaciones):

1. `app/api/periods/contributions/route.ts`
2. `lib/contributions/periods.ts`
3. `app/sickness/credito-deuda/actions.ts`
4. `app/sickness/estadisticas/queries-actions.ts`
5. `app/sickness/balance/actions.ts`
6. `app/api/sickness/transactions/global/route.ts`
7. `app/api/transactions/recent/route.ts`
8. `components/shared/data-display/TransactionPairItem.tsx`

**Cambio**: Reemplazar todas las referencias `real_payer_id` → `performed_by_profile_id`

### FASE 3: Actualizar Código de Escritura ⏳

**Archivo**: `lib/transactions/unified.ts`

**1. Gastos directos (línea 443)**:
```typescript
// ANTES:
performed_by_profile_id: data.performed_by_profile_id || data.real_payer_id,
real_payer_id: data.real_payer_id, // Legacy

// DESPUÉS:
performed_by_profile_id: data.real_payer_id, // ✅ Único campo - quien pagó
// real_payer_id: REMOVED
```

**2. Ingresos compensatorios (línea 502-504)**:
```typescript
// ANTES:
performed_by_profile_id: data.real_payer_id,
real_payer_id: data.real_payer_id,

// DESPUÉS:
performed_by_profile_id: data.real_payer_id, // ✅ Ya correcto
// real_payer_id: REMOVED
```

**3. Schema Zod (línea 127)**:
```typescript
// ANTES:
real_payer_id: z.string().uuid(),

// DESPUÉS:
// real_payer_id: REMOVED - usar performed_by_profile_id
```

**4. Interface (línea 89)**:
```typescript
// ANTES:
real_payer_id?: string; // Quien pagó realmente de su bolsillo (legacy)

// DESPUÉS:
// real_payer_id: REMOVED - usar performed_by_profile_id
```

### FASE 4: Migración de Schema ⏳

**Archivo**: `database/migrations/development/20251102_XXXXXX_deprecate_real_payer_id.sql`

```sql
-- ============================================
-- DEV: Deprecar real_payer_id
-- ============================================

DO $$
DECLARE
  v_inconsistencies INTEGER;
BEGIN
  -- Verificar que performed_by_profile_id esté poblado
  SELECT COUNT(*) INTO v_inconsistencies
  FROM transactions
  WHERE flow_type = 'direct'
    AND real_payer_id IS NOT NULL
    AND performed_by_profile_id IS NULL;

  IF v_inconsistencies > 0 THEN
    RAISE EXCEPTION 'Hay % transacciones directas con real_payer_id pero sin performed_by_profile_id', v_inconsistencies;
  END IF;

  RAISE NOTICE '✅ Verificación OK: Todos los registros directos tienen performed_by_profile_id';
END $$;

-- Marcar columna como DEPRECATED
COMMENT ON COLUMN transactions.real_payer_id IS
  '⚠️ DEPRECATED (Issue #30): Campo redundante con performed_by_profile_id.

   USAR EN SU LUGAR: performed_by_profile_id

   Para transacciones directas:
   - performed_by_profile_id = quien pagó de su bolsillo (CAMPO ÚNICO)
   - real_payer_id = MISMO VALOR (redundante, deprecado)

   Deprecado: 02 November 2025
   Eliminar en: v3.0.0 (tras periodo de gracia)';

-- ============================================
-- PROD: Deprecar real_payer_id
-- ============================================
-- (Mismo código que DEV)
```

---

## ⚠️ Riesgos y Mitigaciones

### Riesgo 1: Queries Legacy

**Riesgo**: Funciones PostgreSQL y vistas legacy usan `real_payer_id`
**Impacto**: BAJO (funciones no se usan activamente en app)
**Mitigación**: Documentar como DEPRECATED, no modificar por ahora

### Riesgo 2: Scripts de Backups/Análisis

**Riesgo**: Scripts de análisis externos pueden usar `real_payer_id`
**Impacto**: MEDIO
**Mitigación**:
- Mantener columna con valores durante periodo de gracia
- Documentar cambio en CHANGELOG.md
- Avisar antes de eliminación física

### Riesgo 3: Inconsistencias Históricas

**Riesgo**: 11 registros con `real_payer_id != performed_by_profile_id`
**Impacto**: CRÍTICO (rompe regla de negocio)
**Mitigación**: FASE 1 corrige esto ANTES de cualquier otro cambio

---

## ✅ Checklist de Implementación

- [ ] **FASE 1**: Corregir datos inconsistentes (UPDATE 22 filas)
- [ ] **FASE 2**: Actualizar queries de lectura (8 archivos)
- [ ] **FASE 3**: Actualizar código de escritura (unified.ts)
- [ ] **FASE 4**: Migración de schema (COMMENT + verificación)
- [ ] Verificar TypeScript compilation
- [ ] Probar creación de gastos directos
- [ ] Probar edición de gastos directos
- [ ] Verificar cálculo de contribuciones
- [ ] Commit y push
- [ ] Cerrar Issue #30

---

## 🎯 Resultado Final

**Arquitectura Simplificada**:
```typescript
// ✅ ÚNICO CAMPO DE VERDAD
performed_by_profile_id → "Quien ejecutó la transacción"

// ❌ DEPRECATED (Issues completados)
created_by_profile_id   → Issue #31 ✅
paid_by (stored)        → Issue #33 ✅
real_payer_id           → Issue #30 🔄 (en progreso)
```

**Beneficios**:
- ✅ Eliminación de redundancia
- ✅ Regla de negocio clara y consistente
- ✅ Código más simple y mantenible
- ✅ Prerequisito cumplido para Issue #29 (UI)
