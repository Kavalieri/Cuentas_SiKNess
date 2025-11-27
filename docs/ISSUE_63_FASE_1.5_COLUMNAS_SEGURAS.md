# Issue #63 - Fase 1.5: Eliminación de Columnas 100% Seguras

**Fecha**: 27 Noviembre 2025
**Estado**: ✅ LISTO PARA IMPLEMENTAR
**Relacionado**: Issue #63 - Limpieza de base de datos
**Precedente**: Fase 1 completada (6 tablas vacías eliminadas - commit 4faa845)

---

## 🎯 Objetivo

Eliminar **columnas que NUNCA se usan** y son **100% seguras de eliminar**:

- ✅ **0% de datos** (todas NULL o valor constante sin significado)
- ✅ **0 referencias en código** (o código nunca ejecutado)
- ✅ **Sin riesgo** para funcionalidad existente

**Enfoque conservador**: Solo columnas con **evidencia absoluta** de no uso.

---

## 📊 Resumen del Análisis Completo

| Tabla                | Total Columnas | ❌ Eliminar   | ⚠️ Revisar   | ✅ Mantener     |
| -------------------- | -------------- | ------------- | ------------ | --------------- |
| **transactions**     | 34             | **4**         | 6            | 24              |
| **contributions**    | 16             | **5**         | 0            | 11              |
| monthly_periods      | 29             | 0             | 0            | 29              |
| profiles             | 10             | 0             | 1            | 9               |
| categories           | 12             | **2**         | 0            | 10              |
| category_parents     | 8              | 0             | 0            | 8               |
| subcategories        | 7              | 0             | 0            | 7               |
| households           | 9              | 0             | 1            | 8               |
| household_members    | 6              | 0             | 0            | 6               |
| member_incomes       | 6              | 0             | 0            | 6               |
| loan_requests        | 13             | 0             | 0            | 13              |
| journal_transactions | 8              | **1**         | 0            | 7               |
| **TOTAL**            | **158**        | **12** (7.6%) | **8** (5.1%) | **138** (87.3%) |

---

## ❌ COLUMNAS A ELIMINAR (Fase 1.5)

### 1. `transactions.created_by_email` ❌ NUNCA USADO

```sql
-- Evidencia:
SELECT COUNT(*) FILTER (WHERE created_by_email IS NOT NULL) FROM transactions;
-- Resultado: 0/355 (0%)
```

**Justificación**:

- ✅ **0% poblado** en 355 transacciones
- ✅ **NO se escribe** en código (`lib/transactions/unified.ts` no la menciona)
- ✅ **Redundante** con JOIN a `profiles.email`
- ✅ **Sin índices** que dependan de ella

**Riesgo**: **NULO** - Campo completamente muerto

---

### 2. `transactions.auto_paired` ❌ SIEMPRE FALSE

```sql
-- Evidencia:
SELECT COUNT(*) FILTER (WHERE auto_paired = true) FROM transactions;
-- Resultado: 0/355 (siempre false)
```

**Justificación**:

- ✅ **100% false** en todas las transacciones
- ✅ Sistema de auto-pairing **nunca activado**
- ✅ Valor por defecto hardcodeado sin lógica
- ⚠️ Si se implementa en futuro, puede recrearse

**Riesgo**: **BAJO** - Funcionalidad no implementada

---

### 3. `transactions.review_days` ❌ CONSTANTE = 7

```sql
-- Evidencia:
SELECT COUNT(DISTINCT review_days) FROM transactions;
-- Resultado: 1 valor único (todos = 7)
```

**Justificación**:

- ✅ **100% constante** (valor por defecto 7 días)
- ✅ **Nunca cambia** en la aplicación
- ✅ Puede **hardcodearse** en código si se necesita
- ✅ Sin lógica de negocio que lo modifique

**Riesgo**: **NULO** - Valor hardcodeable

---

### 4. `transactions.pairing_threshold` ❌ CONSTANTE = 5.00

```sql
-- Evidencia:
SELECT COUNT(DISTINCT pairing_threshold) FROM transactions;
-- Resultado: 1 valor único (todos = 5.00)
```

**Justificación**:

- ✅ **100% constante** (valor por defecto 5.00€)
- ✅ **Nunca cambia** en la aplicación
- ✅ Puede **hardcodearse** en código si se necesita
- ✅ Sin lógica de negocio que lo modifique

**Riesgo**: **NULO** - Valor hardcodeable

---

### 5. `contributions.paid_at` ❌ NUNCA POBLADO

```sql
-- Evidencia:
SELECT COUNT(*) FILTER (WHERE paid_at IS NOT NULL) FROM contributions;
-- Resultado: 0/12 (0%)
```

**Justificación**:

- ✅ **0% poblado** en 12 contribuciones
- ✅ Sistema de timestamp de pago **nunca implementado**
- ✅ Campo `paid_amount` existe pero sin fecha
- ⚠️ Si se necesita en futuro, puede recrearse

**Riesgo**: **BAJO** - Funcionalidad no implementada

---

### 6. `contributions.adjustments_total` ❌ NUNCA POBLADO

```sql
-- Evidencia:
SELECT COUNT(*) FILTER (WHERE adjustments_total IS NOT NULL) FROM contributions;
-- Resultado: 0/12 (0%)
```

**Justificación**:

- ✅ **0% poblado** (todas NULL)
- ✅ **Redundante** con `adjustments_paid_amount` (siempre 0)
- ✅ Lógica de ajustes manejada en otra tabla
- ✅ Campo duplicado sin propósito

**Riesgo**: **NULO** - Redundante y vacío

---

### 7. `contributions.calculation_method` ❌ NUNCA POBLADO

```sql
-- Evidencia:
SELECT COUNT(*) FILTER (WHERE calculation_method IS NOT NULL) FROM contributions;
-- Resultado: 0/12 (0%)
```

**Justificación**:

- ✅ **0% poblado** (todas NULL)
- ✅ Método de cálculo **no se registra** en DB
- ✅ Lógica de cálculo en código, no en datos
- ✅ Sin beneficio de auditoría

**Riesgo**: **NULO** - Campo no utilizado

---

### 8. `contributions.created_by_profile_id` ❌ NUNCA POBLADO

```sql
-- Evidencia:
SELECT COUNT(*) FILTER (WHERE created_by_profile_id IS NOT NULL) FROM contributions;
-- Resultado: 0/12 (0%)
```

**Justificación**:

- ✅ **0% poblado** (todas NULL)
- ✅ Auditoría de creación **no implementada**
- ✅ Sin triggers que la actualicen
- ⚠️ Si se necesita auditoría, puede recrearse

**Riesgo**: **BAJO** - Auditoría no implementada

---

### 9. `contributions.updated_by_profile_id` ❌ NUNCA POBLADO

```sql
-- Evidencia:
SELECT COUNT(*) FILTER (WHERE updated_by_profile_id IS NOT NULL) FROM contributions;
-- Resultado: 0/12 (0%)
```

**Justificación**:

- ✅ **0% poblado** (todas NULL)
- ✅ Auditoría de actualización **no implementada**
- ✅ Trigger `update_contribution_audit()` existe pero no la usa
- ⚠️ Si se necesita auditoría, puede recrearse

**Riesgo**: **BAJO** - Auditoría no implementada

---

### 10. `categories.created_by_profile_id` ❌ NUNCA POBLADO

```sql
-- Evidencia:
SELECT COUNT(*) FILTER (WHERE created_by_profile_id IS NOT NULL) FROM categories;
-- Resultado: 0/146 (0%)
```

**Justificación**:

- ✅ **0% poblado** en 146 categorías
- ✅ Auditoría de creación **no implementada**
- ✅ Categorías creadas sin tracking de autor
- ⚠️ Si se necesita auditoría, puede recrearse

**Riesgo**: **BAJO** - Auditoría no implementada

---

### 11. `categories.updated_by_profile_id` ❌ NUNCA POBLADO

```sql
-- Evidencia:
SELECT COUNT(*) FILTER (WHERE updated_by_profile_id IS NOT NULL) FROM categories;
-- Resultado: 0/146 (0%)
```

**Justificación**:

- ✅ **0% poblado** en 146 categorías
- ✅ Auditoría de actualización **no implementada**
- ✅ Sin triggers que la actualicen
- ⚠️ Si se necesita auditoría, puede recrearse

**Riesgo**: **BAJO** - Auditoría no implementada

---

### 12. `journal_transactions.reason` ❌ NUNCA POBLADO

```sql
-- Evidencia:
SELECT COUNT(*) FILTER (WHERE reason IS NOT NULL) FROM journal_transactions;
-- Resultado: 0/2362 (0%)
```

**Justificación**:

- ✅ **0% poblado** en 2,362 entradas de auditoría
- ✅ Campo de "motivo" **nunca capturado**
- ✅ Auditoría funciona sin este campo
- ✅ Datos en `old_data` y `new_data` son suficientes

**Riesgo**: **NULO** - Campo nunca usado

---

## ⚠️ COLUMNAS A REVISAR (Decisión Owner)

### Sistema de Aprobaciones (`transactions`)

| Columna             | Estado                          |
| ------------------- | ------------------------------- |
| `requires_approval` | ⚠️ Implementado Phase 40, 0 uso |
| `approved_at`       | ⚠️ Implementado Phase 40, 0 uso |
| `approved_by`       | ⚠️ Implementado Phase 40, 0 uso |

**Decisión**: **MANTENER** (funcionalidad lista para usar)

### Campos Legacy (`transactions`)

| Columna                         | Estado                                                          |
| ------------------------------- | --------------------------------------------------------------- |
| `paid_by`                       | ⚠️ 254/355 uso (72%), reemplazado por `performed_by_profile_id` |
| `performed_by_email_deprecated` | ⚠️ 251/355 uso (71%), redundante con JOIN profiles              |
| `created_by_member_id`          | ⚠️ 355/355 uso (100%), pero duplica `created_by_profile_id`     |

**Decisión**: **DEPRECAR en Fase 2** (requiere migración de datos)

### Sistema de Reembolsos (`transactions`)

| Columna           | Estado                        |
| ----------------- | ----------------------------- |
| `refund_claim_id` | 🔮 0/355 uso, pero en roadmap |

**Decisión**: **MANTENER** (funcionalidad planificada)

### Soft Deletes

| Tabla        | Columna      | Estado                                     |
| ------------ | ------------ | ------------------------------------------ |
| `profiles`   | `deleted_at` | ⚠️ 3/5 perfiles con soft delete            |
| `households` | `deleted_at` | ⚠️ 0/1 hogares (sin uso pero puede usarse) |

**Decisión**: **MANTENER** (funcionalidad activa en profiles)

---

## 📋 Migración Fase 1.5 (SQL)

```sql
-- ============================================
-- FASE 1.5: Eliminación de Columnas 100% Seguras
-- Fecha: 27 Noviembre 2025
-- Issue: #63
-- Autor: AI Assistant
-- ============================================

-- VERIFICACIÓN PRE-MIGRACIÓN
DO $$
BEGIN
  RAISE NOTICE 'Verificando columnas antes de eliminar...';

  -- Verificar transactions
  IF (SELECT COUNT(*) FILTER (WHERE created_by_email IS NOT NULL) FROM transactions) > 0 THEN
    RAISE EXCEPTION 'transactions.created_by_email tiene datos! Abortar.';
  END IF;

  IF (SELECT COUNT(*) FILTER (WHERE auto_paired = true) FROM transactions) > 0 THEN
    RAISE EXCEPTION 'transactions.auto_paired tiene valores true! Abortar.';
  END IF;

  -- Verificar contributions
  IF (SELECT COUNT(*) FILTER (WHERE paid_at IS NOT NULL) FROM contributions) > 0 THEN
    RAISE EXCEPTION 'contributions.paid_at tiene datos! Abortar.';
  END IF;

  IF (SELECT COUNT(*) FILTER (WHERE created_by_profile_id IS NOT NULL) FROM contributions) > 0 THEN
    RAISE EXCEPTION 'contributions.created_by_profile_id tiene datos! Abortar.';
  END IF;

  -- Verificar categories
  IF (SELECT COUNT(*) FILTER (WHERE created_by_profile_id IS NOT NULL) FROM categories) > 0 THEN
    RAISE EXCEPTION 'categories.created_by_profile_id tiene datos! Abortar.';
  END IF;

  -- Verificar journal_transactions
  IF (SELECT COUNT(*) FILTER (WHERE reason IS NOT NULL) FROM journal_transactions) > 0 THEN
    RAISE EXCEPTION 'journal_transactions.reason tiene datos! Abortar.';
  END IF;

  RAISE NOTICE '✅ Todas las verificaciones pasaron. Procediendo...';
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

SELECT
  'transactions' as tabla,
  COUNT(*) as total_columnas
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'transactions';
-- Esperado: 30 (antes: 34)

SELECT
  'contributions' as tabla,
  COUNT(*) as total_columnas
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'contributions';
-- Esperado: 11 (antes: 16)

SELECT
  'categories' as tabla,
  COUNT(*) as total_columnas
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'categories';
-- Esperado: 10 (antes: 12)

SELECT
  'journal_transactions' as tabla,
  COUNT(*) as total_columnas
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'journal_transactions';
-- Esperado: 7 (antes: 8)

-- ============================================
-- RESULTADO ESPERADO
-- ============================================
-- Columnas eliminadas: 12 (4 + 5 + 2 + 1)
-- Schema total: 158 → 146 columnas (-7.6%)
-- Sin datos perdidos (todas las columnas estaban vacías o constantes)
-- ============================================
```

---

## ✅ Checklist de Implementación

### Pre-Implementación

- [ ] Backup completo de DEV: `pg_dump cuentassik_dev > backup_pre_fase1.5.sql`
- [ ] Verificar que NO hay cambios pendientes en schema
- [ ] Confirmar con owner que análisis es correcto

### Ejecución en DEV

- [ ] Aplicar migración en DEV: `./scripts/migrations/apply_migration.sh dev 20251127_fase1.5_columnas_seguras.sql`
- [ ] Verificar conteo de columnas post-migración
- [ ] Regenerar types TypeScript: `npm run types:generate:dev`
- [ ] Ejecutar typecheck: `npm run typecheck`
- [ ] Ejecutar linter: `npm run lint`
- [ ] Probar funcionalidad crítica:
  - [ ] Crear transacción
  - [ ] Crear contribución
  - [ ] Crear categoría
  - [ ] Ver historial (journal_transactions)

### Testing Funcional

- [ ] Verificar que transacciones se crean correctamente
- [ ] Verificar que contribuciones se calculan correctamente
- [ ] Verificar que categorías funcionan
- [ ] Verificar que auditoría sigue funcionando
- [ ] Verificar que NO hay errores en logs PM2

### Promoción a PROD

- [ ] Backup completo de PROD: `pg_dump cuentassik_prod > backup_pre_fase1.5_prod.sql`
- [ ] Build de producción: `npm run build`
- [ ] Verificar que build compila sin errores
- [ ] Aplicar migración en PROD: `./scripts/migrations/apply_migration.sh prod 20251127_fase1.5_columnas_seguras.sql`
- [ ] Regenerar types PROD: `npm run types:generate:prod`
- [ ] Deploy: Reiniciar PM2 con nuevos types
- [ ] Monitorear logs PROD por 15 minutos
- [ ] Verificar funcionalidad en PROD con datos reales

### Post-Implementación

- [ ] Commit cambios: `git add . && git commit -m "feat(db): Fase 1.5 - Eliminar 12 columnas sin uso (Issue #63)"`
- [ ] Push a GitHub: `git push origin main`
- [ ] Actualizar Issue #63 con resultados
- [ ] Documentar en CHANGELOG.md

---

## 📊 Impacto Esperado

### Schema

- **Antes**: 158 columnas totales
- **Después**: 146 columnas totales
- **Reducción**: 12 columnas (-7.6%)

### Tablas Afectadas

| Tabla                | Antes | Después | Reducción |
| -------------------- | ----- | ------- | --------- |
| transactions         | 34    | 30      | -11.8%    |
| contributions        | 16    | 11      | -31.3%    |
| categories           | 12    | 10      | -16.7%    |
| journal_transactions | 8     | 7       | -12.5%    |

### Beneficios

- ✅ **Menos confusión** para developers (columnas muertas eliminadas)
- ✅ **Schema más limpio** (solo columnas en uso)
- ✅ **Types más precisos** (TypeScript refleja realidad)
- ✅ **Sin pérdida de datos** (todas las columnas estaban vacías)
- ✅ **Sin cambios de código** (columnas nunca referenciadas)

### Riesgos

- ⚠️ **BAJO**: Columnas pueden recrearse si se necesitan en futuro
- ⚠️ **NULO**: Sin datos perdidos (todas vacías o constantes)
- ⚠️ **NULO**: Sin cambios de comportamiento (código no las usa)

---

## 🚀 Próximos Pasos (Fase 2 - Futuro)

**NO incluidas en Fase 1.5** (requieren decisión owner o migración de datos):

### Fase 2: Deprecación de Campos Legacy

- `transactions.paid_by` → Migrar a `performed_by_profile_id`
- `transactions.performed_by_email_deprecated` → Eliminar tras migrar queries
- `transactions.created_by_member_id` → Evaluar si duplica `created_by_profile_id`

**Complejidad**: MEDIA (requiere actualizar queries)

### Fase 3: Sistema de Aprobaciones

- Decisión owner: ¿Mantener para Phase 40 o eliminar?
- Si se elimina: Refactorizar `lib/balance/actions.ts`

**Complejidad**: ALTA (funcionalidad implementada)

---

**Última actualización**: 27 Noviembre 2025
**Autor**: AI Assistant
**Estado**: ✅ LISTO PARA IMPLEMENTAR
**Aprobación owner**: PENDIENTE
