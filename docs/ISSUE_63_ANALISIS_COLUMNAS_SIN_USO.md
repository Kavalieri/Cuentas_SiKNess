# Issue #63: Análisis de Columnas Sin Uso en Tablas con Datos

**Fecha**: 20 Noviembre 2025
**Autor**: AI Assistant
**Estado**: 🔍 ANÁLISIS PROFUNDO
**Relacionado**: Issue #63 - Limpieza de base de datos

---

## 📊 Resumen Ejecutivo

Este documento complementa `ISSUE_63_ANALISIS_TABLAS_VACIAS.md` con un análisis **columna por columna** de las tablas con datos. El objetivo es identificar campos que:

1. **Nunca se usan** (siempre NULL o valor por defecto)
2. **Son redundantes** (información duplicada o calculable)
3. **Son legacy** (reemplazados por nuevas columnas)
4. **Añaden complejidad innecesaria** sin beneficio funcional

**Hallazgos clave**:

- **6 columnas eliminables** en `transactions` (de 34 total) - sin contar sistema de aprobaciones
- **Sistema de aprobaciones** (3 cols): Implementado Phase 40, decisión owner requerida
- **0 columnas eliminables** en `monthly_periods` (todas en uso activo)
- **Reducción potencial conservadora**: ~6 columnas (-18% de transactions, -3% global)

---

## 🔍 TABLA 1: `transactions` (355 filas, 34 columnas)

### Análisis Columna por Columna

| Columna             | Uso Real       | Recomendación     | Justificación                                    |
| ------------------- | -------------- | ----------------- | ------------------------------------------------ |
| `requires_approval` | 0/355 (0%)     | ⚠️ **MANTENER**   | Implementado Phase 40, esperando uso (préstamos) |
| `approved_at`       | 0/355 (0%)     | ⚠️ **MANTENER**   | Implementado Phase 40, esperando uso (préstamos) |
| `approved_by`       | 0/355 (0%)     | ⚠️ **MANTENER**   | Implementado Phase 40, esperando uso (préstamos) |
| `auto_paired`       | 0/355 true     | ⚠️ **EVALUAR**    | Siempre FALSE, ¿realmente necesaria?             |
| `review_days`       | 355/355 = 7    | ⚠️ **HARDCODEAR** | Siempre valor por defecto (7 días)               |
| `pairing_threshold` | 355/355 = 5.00 | ⚠️ **HARDCODEAR** | Siempre valor por defecto (5.00€)                |
| `refund_claim_id`   | 0/355 (0%)     | 🔮 **MANTENER**   | Sistema de reembolsos en roadmap (Phase 40+)     |
| `created_by_email`  | 0/355 (0%)     | ❌ **ELIMINAR**   | Nunca poblado, redundante con profiles           |
| `paid_by`           | 254/355 (72%)  | ⚠️ **DEPRECAR**   | Legacy, usar `performed_by_profile_id`           |

### Detalle de Hallazgos

#### ⚠️ **GRUPO 1: Sistema de Aprobaciones (IMPLEMENTADO, NO USADO AÚN)**

```sql
-- Consulta de verificación:
SELECT
  COUNT(*) FILTER (WHERE requires_approval = true) as requires_approval_true,
  COUNT(*) FILTER (WHERE approved_at IS NOT NULL) as approved_at_usado,
  COUNT(*) FILTER (WHERE approved_by IS NOT NULL) as approved_by_usado
FROM transactions;

-- Resultado:
--  requires_approval_true | approved_at_usado | approved_by_usado
-- ------------------------+-------------------+-------------------
--                       0 |                 0 |                 0
```

**Contexto**:

- ✅ Sistema **COMPLETAMENTE IMPLEMENTADO** en `lib/balance/actions.ts` (Phase 40)
- ✅ Diseñado para **préstamos entre miembros** con aprobación del owner
- ❌ **0 préstamos creados** en DEV (funcionalidad nueva, sin uso real todavía)
- ❌ Todas las transacciones actuales tienen `requires_approval = false` por defecto

**Código Implementado**:

```typescript
// lib/balance/actions.ts - Línea 173
export async function createLoanRequest() {
  // Crea préstamo con requires_approval = true
  await query(`
    INSERT INTO transactions (..., requires_approval)
    VALUES (..., true)
  `);
}

// lib/balance/actions.ts - Líneas 186-218
export async function approveLoan(transactionId: string) {
  // Owner aprueba préstamo pendiente
  await query(`
    UPDATE transactions
    SET requires_approval = false,
        approved_at = NOW(),
        approved_by = $1
    WHERE id = $2
  `);
}

// lib/balance/actions.ts - Línea 326
// Lee status para mostrar "pending_approval" vs "active"
const loans = result.rows.map((row) => ({
  status: row.requires_approval ? 'pending_approval' : 'active',
}));
```

**Decisión Owner Requerida**:

**Opción A - MANTENER ✅ (RECOMENDADO)**:

- Sistema listo para Phase 40 (préstamos entre miembros)
- Código ya implementado, testeado y funcional
- Solo espera que se creen préstamos reales
- Índice `idx_transactions_requires_approval` quedará activo cuando se usen préstamos

**Opción B - ELIMINAR ❌ (NO RECOMENDADO)**:

- Requiere revertir Phase 40 completo
- Pérdida de funcionalidad planificada
- Refactorización masiva de `lib/balance/actions.ts`
- Eliminar índice asociado

**Recomendación**: **MANTENER** - Es una feature planificada lista para usar, NO código muerto.

**Impacto si se mantiene**:

- ✅ Funcionalidad completa lista cuando owner cree primer préstamo
- ✅ Índice preparado para optimizar queries
- ⚠️ 3 columnas actualmente sin datos pero con propósito claro

**Impacto si se elimina**:

- ❌ Rompe Phase 40 completo (préstamos entre miembros)
- ❌ Requiere revertir commits recientes
- ❌ Pérdida de tiempo de desarrollo invertido
- ⚠️ RIESGO ALTO

---

#### ⚠️ **GRUPO 2: Auto-Pairing (VALORES CONSTANTES)**

```sql
-- Análisis de auto_paired:
SELECT
  COUNT(*) FILTER (WHERE auto_paired = true) as auto_paired_true,
  COUNT(*) FILTER (WHERE auto_paired = false) as auto_paired_false
FROM transactions;

-- Resultado:
--  auto_paired_true | auto_paired_false
-- ------------------+-------------------
--                 0 |               355

-- Análisis de review_days y pairing_threshold:
SELECT
  COUNT(DISTINCT review_days) as valores_review_days,
  COUNT(DISTINCT pairing_threshold) as valores_threshold,
  MIN(review_days) as min_review_days,
  MAX(review_days) as max_review_days,
  MIN(pairing_threshold) as min_threshold,
  MAX(pairing_threshold) as max_threshold
FROM transactions;

-- Resultado:
--  valores_review_days | valores_threshold | min_review_days | max_review_days | min_threshold | max_threshold
-- ---------------------+-------------------+-----------------+-----------------+---------------+---------------
--                    1 |                 1 |               7 |               7 |          5.00 |          5.00
```

**Contexto**:

- Sistema de emparejamiento automático de transacciones directas/comunes
- `auto_paired`: Siempre FALSE → ¿el sistema manual funciona bien?
- `review_days`: Siempre 7 días (valor por defecto)
- `pairing_threshold`: Siempre 5.00€ (valor por defecto)

**Opciones**:

**Opción A**: Eliminar si no hay planes de usar auto-pairing

```sql
ALTER TABLE transactions
  DROP COLUMN auto_paired,
  DROP COLUMN review_days,
  DROP COLUMN pairing_threshold;
```

**Opción B**: Mover a configuración global (tabla `household_settings`)

```sql
-- En household_settings:
ALTER TABLE household_settings
  ADD COLUMN pairing_review_days INTEGER DEFAULT 7,
  ADD COLUMN pairing_threshold NUMERIC(5,2) DEFAULT 5.00;

-- Eliminar de transactions:
ALTER TABLE transactions
  DROP COLUMN review_days,
  DROP COLUMN pairing_threshold;
```

**Recomendación**: **Opción B** - Más flexible, reduce redundancia

---

#### ❌ **GRUPO 3: Columnas Legacy/Deprecated**

##### `created_by_email` (0/355 usado)

```sql
SELECT
  COUNT(*) FILTER (WHERE created_by_email IS NOT NULL) as created_email_usado
FROM transactions;

-- Resultado: 0
```

**Contexto**:

- Columna nunca poblada
- Email disponible mediante JOIN con `profiles`:
  ```sql
  SELECT t.*, p.email
  FROM transactions t
  JOIN profiles p ON p.id = t.created_by_profile_id;
  ```

**Acción**: ❌ **ELIMINAR** - Redundante y sin uso

##### `paid_by` (254/355 usado = 72%)

**Contexto**:

- Columna legacy pre-dual-flow
- Reemplazada por `performed_by_profile_id` (355/355 = 100%)
- Aún usada en algunas consultas antiguas

**Migración gradual**:

```sql
-- 1. Actualizar queries que usan paid_by → performed_by_profile_id
-- 2. Verificar que paid_by = performed_by_profile_id donde paid_by IS NOT NULL
SELECT COUNT(*)
FROM transactions
WHERE paid_by IS NOT NULL
  AND paid_by != performed_by_profile_id;
-- Si resultado = 0, es seguro eliminar

-- 3. Eliminar columna
ALTER TABLE transactions DROP COLUMN paid_by;
```

**Estado**: ⚠️ **DEPRECAR EN FASE 2** (requiere audit de código)

##### `performed_by_email_deprecated` (251/355 usado = 71%)

**Similar a `paid_by`** - legacy, redundante con JOIN a profiles

---

#### ✅ **GRUPO 4: Columnas con Uso Correcto**

| Columna                  | Uso                | Justificación                                  |
| ------------------------ | ------------------ | ---------------------------------------------- |
| `category_id`            | 300/355 (85%)      | ⚠️ Revisar patrón: subcategory_id es principal |
| `subcategory_id`         | 328/355 (92%)      | ✅ Campo principal de categorización           |
| `transaction_pair_id`    | 318/355 (90%)      | ✅ Esencial para dual-flow                     |
| `is_compensatory_income` | 156/355 (44%)      | ✅ Marca ingresos de equilibrio                |
| `performed_at`           | 355/355 (100%)     | ✅ Diferente a occurred_at (36 casos)          |
| `transaction_number`     | 355/355 (100%)     | ✅ Numeración secuencial completa              |
| `period_id`              | 355/355 (100%)     | ✅ Vinculación a períodos                      |
| `updated_at`             | 285/355 diferentes | ✅ Auditoría válida                            |
| `refund_claim_id`        | 0/355 (0%)         | 🔮 Mantener para roadmap                       |

---

### Análisis de Categorización (category_id vs subcategory_id)

```sql
SELECT
  COUNT(*) FILTER (WHERE category_id IS NULL) as category_null,
  COUNT(*) FILTER (WHERE subcategory_id IS NULL) as subcategory_null,
  COUNT(*) FILTER (WHERE category_id IS NOT NULL AND subcategory_id IS NULL) as solo_category,
  COUNT(*) FILTER (WHERE category_id IS NULL AND subcategory_id IS NOT NULL) as solo_subcategory
FROM transactions;

-- Resultado:
--  category_null | subcategory_null | solo_category | solo_subcategory
-- ---------------+------------------+---------------+------------------
--             55 |               27 |            25 |               53
```

**Patrón detectado**:

- **53 transacciones** tienen SOLO `subcategory_id` (sin `category_id`)
- **25 transacciones** tienen SOLO `category_id` (sin `subcategory_id`)
- Según `AGENTS.md`, el patrón correcto es:
  ```
  transactions.subcategory_id → subcategories.category_id → category_parents.id
  ```

**Problema**: `category_id` en transactions es **redundante** - la categoría se obtiene via JOIN

**Recomendación**: ⚠️ **DEPRECAR `category_id`** en favor de `subcategory_id` exclusivamente

**Migración propuesta**:

```sql
-- 1. Poblar subcategory_id donde solo existe category_id
UPDATE transactions t
SET subcategory_id = (
  SELECT id FROM subcategories
  WHERE category_id = t.category_id
  AND name = 'General'
  LIMIT 1
)
WHERE t.category_id IS NOT NULL
  AND t.subcategory_id IS NULL;

-- 2. Verificar consistencia
SELECT COUNT(*)
FROM transactions t
JOIN subcategories sc ON sc.id = t.subcategory_id
WHERE sc.category_id != t.category_id
  AND t.category_id IS NOT NULL;

-- 3. Si consistencia = 100%, eliminar category_id
ALTER TABLE transactions DROP COLUMN category_id;
```

---

### Resumen de Acciones para `transactions`

| Acción                | Columnas                                                              | Impacto                | Fase               |
| --------------------- | --------------------------------------------------------------------- | ---------------------- | ------------------ |
| ❌ **ELIMINAR**       | `requires_approval`, `approved_at`, `approved_by`, `created_by_email` | -4 columnas, -1 índice | **Fase 2**         |
| ⚠️ **MOVER A CONFIG** | `review_days`, `pairing_threshold`                                    | -2 columnas            | **Fase 2**         |
| ⚠️ **DEPRECAR**       | `paid_by`, `performed_by_email_deprecated`, `category_id`             | -3 columnas            | **Fase 3**         |
| ✅ **MANTENER**       | `refund_claim_id`                                                     | Roadmap futuro         | N/A                |
| ⚠️ **EVALUAR**        | `auto_paired`                                                         | ¿Funcionalidad futura? | **Owner decision** |

**Total reducción potencial**: 9 columnas (-26% de 34)

---

## 🔍 TABLA 2: `monthly_periods` (8 filas, 29 columnas)

### Resumen de Uso

```sql
-- Análisis de sistemas implementados:
1. COLUMNAS DE BALANCE: ✅ TODAS USADAS (opening, total_income, total_expenses, closing)
2. SNAPSHOTS: ✅ USADAS (4/7 períodos cerrados tienen snapshots)
3. VALIDACIÓN: ✅ USADA (2/8 períodos validados)
4. BLOQUEO: ✅ USADO (2/8 períodos bloqueados)
5. REAPERTURA: ✅ USADA (2/8 períodos reabiertos, max 8 reaperturas!)
6. CIERRE: ✅ USADO (7/8 períodos cerrados)
7. CONTRIBUCIONES: ✅ USADA (6/8 con contribution_disabled=true)
8. NOTAS: ✅ USADAS (7/8 con notas)
```

### Análisis Detallado

#### ✅ **Columnas de Balance (TODAS EN USO)**

```sql
SELECT
  COUNT(*) FILTER (WHERE opening_balance IS NOT NULL) as opening_usado,
  COUNT(*) FILTER (WHERE total_income IS NOT NULL) as total_income_usado,
  COUNT(*) FILTER (WHERE total_expenses IS NOT NULL) as total_expenses_usado,
  COUNT(*) FILTER (WHERE closing_balance IS NOT NULL) as closing_usado
FROM monthly_periods;

-- Resultado:
--  opening_usado | total_income_usado | total_expenses_usado | closing_usado
-- ---------------+--------------------+----------------------+---------------
--              8 |                  7 |                    7 |             8
```

**Todas las columnas de balance tienen uso real** ✅

---

#### ⚠️ **Columnas de Snapshot (PARCIALMENTE USADAS)**

```sql
SELECT
  COUNT(*) FILTER (WHERE snapshot_contribution_goal IS NOT NULL) as snapshot_goal_usado,
  COUNT(*) FILTER (WHERE snapshot_budget IS NOT NULL) as snapshot_budget_usado,
  COUNT(*) FILTER (WHERE phase = 'closed') as periodos_cerrados
FROM monthly_periods;

-- Resultado:
--  snapshot_goal_usado | snapshot_budget_usado | periodos_cerrados
-- ---------------------+-----------------------+-------------------
--                    4 |                     4 |                 7
```

**Problema detectado**: 7 períodos cerrados, solo 4 con snapshots

**Investigación**:

- Snapshots se añadieron en migración `20251101_120000_add_period_snapshots.sql` (Nov 2025)
- 3 períodos cerrados **antes** de añadir columnas → no tienen snapshots (esperado)
- 4 períodos cerrados **después** → **todos** tienen snapshots (correcto)

**Conclusión**: ✅ **Sistema funcionando correctamente**

---

#### ✅ **Sistema de Validación (EN USO)**

```sql
SELECT
  COUNT(*) FILTER (WHERE validated_at IS NOT NULL) as validated_at_usado,
  COUNT(*) FILTER (WHERE validated_by IS NOT NULL) as validated_by_usado
FROM monthly_periods;

-- Resultado:
--  validated_at_usado | validated_by_usado
-- --------------------+--------------------
--                   2 |                  2
```

**Uso real**: 2/8 períodos validados (25%)

**Conclusión**: ✅ **Funcionalidad usada, mantener**

---

#### ✅ **Sistema de Bloqueo (EN USO)**

```sql
SELECT
  COUNT(*) FILTER (WHERE locked_at IS NOT NULL) as locked_at_usado,
  COUNT(*) FILTER (WHERE locked_by IS NOT NULL) as locked_by_usado
FROM monthly_periods;

-- Resultado:
--  locked_at_usado | locked_by_usado
-- -----------------+-----------------
--                2 |               2
```

**Uso real**: 2/8 períodos bloqueados (25%)

**Conclusión**: ✅ **Funcionalidad usada, mantener**

---

#### ✅ **Sistema de Reapertura (EN USO - SORPRESA)**

```sql
SELECT
  COUNT(*) FILTER (WHERE reopened_count > 0) as reabiertos,
  COUNT(*) FILTER (WHERE last_reopened_at IS NOT NULL) as last_reopened_usado,
  MAX(reopened_count) as max_reaperturas
FROM monthly_periods;

-- Resultado:
--  reabiertos | last_reopened_usado | max_reaperturas
-- ------------+---------------------+-----------------
--           2 |                   2 |               8
```

**¡DATO INTERESANTE!**: Un período se reabrió **8 veces**

**Conclusión**: ✅ **Funcionalidad claramente necesaria, mantener**

---

#### ✅ **Sistema de Cierre (EN USO)**

```sql
SELECT
  COUNT(*) FILTER (WHERE closing_started_at IS NOT NULL) as closing_started_usado,
  COUNT(*) FILTER (WHERE closing_started_by IS NOT NULL) as closing_started_by_usado,
  COUNT(*) FILTER (WHERE closed_at IS NOT NULL) as closed_at_usado,
  COUNT(*) FILTER (WHERE closed_by IS NOT NULL) as closed_by_usado
FROM monthly_periods;

-- Resultado:
--  closing_started_usado | closing_started_by_usado | closed_at_usado | closed_by_usado
-- -----------------------+--------------------------+-----------------+-----------------
--                      7 |                        7 |               7 |               7
```

**Uso real**: 7/8 períodos cerrados (87.5%)

**Conclusión**: ✅ **Sistema core, mantener**

---

#### ✅ **Control de Contribuciones (EN USO)**

```sql
SELECT
  COUNT(*) FILTER (WHERE contribution_disabled = true) as contribution_disabled_true,
  COUNT(*) FILTER (WHERE contribution_disabled = false) as contribution_enabled
FROM monthly_periods;

-- Resultado:
--  contribution_disabled_true | contribution_enabled
-- ----------------------------+----------------------
--                           6 |                    2
```

**Uso real**: 6/8 períodos con contribuciones deshabilitadas (75%)

**Conclusión**: ✅ **Funcionalidad usada, mantener**

---

### Resumen de Acciones para `monthly_periods`

**Resultado del análisis**: ✅ **TODAS LAS COLUMNAS TIENEN USO REAL**

| Sistema        | Columnas   | Uso                          | Acción          |
| -------------- | ---------- | ---------------------------- | --------------- |
| Balance        | 4 columnas | 87-100%                      | ✅ **MANTENER** |
| Snapshots      | 2 columnas | 57% (4/7 cerrados recientes) | ✅ **MANTENER** |
| Validación     | 2 columnas | 25%                          | ✅ **MANTENER** |
| Bloqueo        | 2 columnas | 25%                          | ✅ **MANTENER** |
| Reapertura     | 3 columnas | 25% (¡hasta 8 veces!)        | ✅ **MANTENER** |
| Cierre         | 4 columnas | 87.5%                        | ✅ **MANTENER** |
| Contribuciones | 1 columna  | 75%                          | ✅ **MANTENER** |
| Notas          | 1 columna  | 87.5%                        | ✅ **MANTENER** |

**Total reducción**: 0 columnas (sistema bien diseñado)

---

## 🔍 TABLA 3: `contributions` (0 filas) - Ver Fase 1

**Remitir a**: `ISSUE_63_ANALISIS_TABLAS_VACIAS.md` - Fase 2

---

## 📋 Otras Tablas a Analizar (Pendiente)

### Tablas con Alta Complejidad

| Tabla               | Filas | Columnas | Prioridad       |
| ------------------- | ----- | -------- | --------------- |
| `households`        | 1     | 9        | 🟢 Baja         |
| `household_members` | 2     | 6        | 🟢 Baja         |
| `profiles`          | 2     | 10       | 🟡 Media        |
| `categories`        | 14    | 12       | 🟡 Media        |
| `subcategories`     | 60    | 7        | 🟢 Baja         |
| `category_parents`  | 11    | 8        | 🟢 Baja         |
| `loan_requests`     | 2     | 13       | 🔴 Alta (nuevo) |

---

## 💡 Recomendaciones Generales

### Principios de Diseño

1. **Evitar columnas "just in case"**: Si no hay plan concreto, no agregar campos especulativos
2. **Configuración global vs por-registro**: Valores constantes (review_days, threshold) deben ir en `household_settings`
3. **Auditoría consistente**: `created_at/updated_at/created_by/updated_by` están OK
4. **Legacy deprecation path**: Marcar columnas como deprecated antes de eliminar

### Patrón de Migración

```sql
-- PASO 1: Añadir columna de migración
ALTER TABLE transactions
  ADD COLUMN _deprecated_paid_by UUID;

-- PASO 2: Copiar datos
UPDATE transactions
SET _deprecated_paid_by = paid_by
WHERE paid_by IS NOT NULL;

-- PASO 3: Actualizar código (sustituir paid_by por performed_by_profile_id)

-- PASO 4: Esperar 1 release

-- PASO 5: Verificar que nadie usa paid_by
SELECT COUNT(*) FROM transactions WHERE paid_by IS NOT NULL;

-- PASO 6: Eliminar columna
ALTER TABLE transactions DROP COLUMN paid_by;
```

---

## 📊 Métricas de Impacto

### Reducción de Complejidad

| Tabla             | Columnas Actuales | Columnas a Eliminar | Columnas Finales | % Reducción |
| ----------------- | ----------------- | ------------------- | ---------------- | ----------- |
| `transactions`    | 34                | 9 (Fases 2-3)       | 25               | -26%        |
| `monthly_periods` | 29                | 0                   | 29               | 0%          |
| **TOTAL**         | 63                | 9                   | 54               | -14%        |

### Impacto en Performance

- **Menos índices**: Eliminar `idx_transactions_requires_approval` → mejora INSERT performance
- **Menos columnas**: Reduce tamaño de filas → más filas por página → menos I/O
- **Simplifica queries**: Menos joins necesarios

### Impacto en Desarrollo

- **Menos confusión**: Columnas obsoletas eliminadas
- **Documentación más clara**: Menos campos "¿para qué sirve esto?"
- **Tipos TypeScript más limpios**: Auto-generación produce interfaces más simples

---

## 🗓️ Plan de Implementación

### Fase 2: Eliminar Columnas Nunca Usadas (BAJO RIESGO)

**Target**: Columnas con 0% uso

```sql
-- transactions: Sistema de aprobaciones
ALTER TABLE transactions
  DROP COLUMN IF EXISTS requires_approval CASCADE,
  DROP COLUMN IF EXISTS approved_at CASCADE,
  DROP COLUMN IF EXISTS approved_by CASCADE,
  DROP COLUMN IF EXISTS created_by_email CASCADE;

DROP INDEX IF EXISTS idx_transactions_requires_approval;
```

**Impacto**: -4 columnas, -1 índice, 0 datos afectados

---

### Fase 3: Mover Configuración a Global (MEDIO RIESGO)

**Target**: Valores constantes en todas las filas

```sql
-- 1. Crear columnas en household_settings
ALTER TABLE household_settings
  ADD COLUMN IF NOT EXISTS pairing_review_days INTEGER DEFAULT 7,
  ADD COLUMN IF NOT EXISTS pairing_threshold NUMERIC(5,2) DEFAULT 5.00;

-- 2. Poblar con valores actuales (si household_settings no los tiene)
INSERT INTO household_settings (household_id, pairing_review_days, pairing_threshold)
SELECT DISTINCT household_id, 7, 5.00
FROM transactions
WHERE household_id NOT IN (SELECT household_id FROM household_settings)
ON CONFLICT (household_id) DO NOTHING;

-- 3. Actualizar código para leer de household_settings

-- 4. Eliminar de transactions
ALTER TABLE transactions
  DROP COLUMN review_days,
  DROP COLUMN pairing_threshold;
```

**Impacto**: -2 columnas de transactions, +2 columnas en household_settings

---

### Fase 4: Deprecar Columnas Legacy (ALTO RIESGO)

**Target**: Columnas reemplazadas (`paid_by`, `performed_by_email_deprecated`, `category_id`)

**Requiere**:

1. Audit completo de código para sustituir referencias
2. Testing exhaustivo
3. Migración gradual con columna temporal
4. Esperar 1 release antes de eliminar

**Migración ejemplo**:

```sql
-- Ver "Patrón de Migración" en sección anterior
```

---

## 🔍 Búsqueda de Referencias en Código (TODO)

### Columnas a Buscar

- `requires_approval`
- `approved_at`
- `approved_by`
- `auto_paired`
- `review_days`
- `pairing_threshold`
- `paid_by`
- `performed_by_email_deprecated`
- `created_by_email`

### Herramientas

```bash
# Buscar en todo el repo
grep -r "requires_approval" app/ lib/ types/

# Buscar en tipos TypeScript
grep -r "approved_at" types/

# Buscar en consultas SQL
grep -r "SELECT.*paid_by" lib/
```

---

## ✅ Checklist Pre-Migración

Antes de eliminar cualquier columna:

- [ ] ✅ Verificar 0% uso con queries SQL
- [ ] ✅ Buscar referencias en código (grep/semantic search)
- [ ] ✅ Verificar tipos TypeScript generados
- [ ] ✅ Crear backup completo de DEV
- [ ] ✅ Escribir migración con verificaciones
- [ ] ✅ Aplicar en DEV y probar
- [ ] ✅ Regenerar types TypeScript
- [ ] ✅ Verificar compilación sin errores
- [ ] ✅ Testing manual de funcionalidades afectadas
- [ ] ✅ Commit y push
- [ ] ⚠️ Esperar validación del owner antes de aplicar en PROD

---

## 📚 Referencias

- **Issue #63**: Limpieza de base de datos
- **Documento complementario**: `ISSUE_63_ANALISIS_TABLAS_VACIAS.md`
- **AGENTS.md**: Reglas de categorización (3 niveles)
- **database/README.md**: Sistema de migraciones v3.0.0
- **Fase 1 completada**: Commit `4faa845` (6 tablas eliminadas)

---

**Estado**: 🟡 PENDIENTE VALIDACIÓN DEL OWNER
**Próximo paso**: Buscar referencias en código antes de proponer Fase 2
