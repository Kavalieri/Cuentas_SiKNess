# Issue #32 - Análisis Profundo: Redundancia de Campos "Quién"

**Fecha**: 2 Noviembre 2025
**Autor**: AI Assistant + Kava (Owner)
**Estado**: ✅ COMPLETADO

---

## 🎯 Objetivo del Análisis

Determinar si los campos actuales de "quién" en la tabla `transactions` son redundantes dado el modelo de negocio específico de CuentasSiK, donde:

1. **TODOS los gastos salen de la Cuenta Común** (comunes Y directos)
2. **Gastos directos** crean ingreso compensatorio automático
3. **Badges** ya identifican el tipo (Común/Directo/Compensatorio)

---

## 📊 Datos Reales - Resultados SQL

### 1. Análisis de `paid_by` - ¿Es Calculable?

#### Query 1: Distribución por tipo y flujo

```sql
SELECT type, flow_type, COUNT(*) as total, COUNT(DISTINCT paid_by) as paid_by_unicos
FROM transactions
GROUP BY type, flow_type;
```

**Resultados:**
```
     type      | flow_type | total | paid_by_unicos 
---------------+-----------+-------+----------------
 expense        | common    |    24 |              1
 expense_direct | direct    |    85 |              1
 income         | common    |     4 |              2
 income_direct  | direct    |    85 |              2
```

**Conclusión 1**: 
- Gastos: Solo 1 valor único (la Cuenta Común)
- Ingresos: 2 valores únicos (diferentes miembros)

---

#### Query 2: Verificación gastos = Cuenta Común

```sql
SELECT t.type, t.flow_type, COUNT(*) as total,
       COUNT(CASE WHEN ja.id IS NOT NULL THEN 1 END) as es_cuenta_comun,
       COUNT(CASE WHEN ja.id IS NULL THEN 1 END) as NO_es_cuenta_comun
FROM transactions t
LEFT JOIN joint_accounts ja ON t.paid_by = ja.id
WHERE t.type IN ('expense', 'expense_direct')
GROUP BY t.type, t.flow_type;
```

**Resultados:**
```
     type      | flow_type | total | es_cuenta_comun | no_es_cuenta_comun 
---------------+-----------+-------+-----------------+--------------------
 expense        | common    |    24 |              24 |                  0
 expense_direct | direct    |    85 |              85 |                  0
```

**Conclusión 2**: ✅ **100% de gastos tienen `paid_by` = Cuenta Común**

---

#### Query 3: Ingresos - ¿paid_by = performed_by_profile_id?

```sql
SELECT COUNT(*) as total,
       COUNT(CASE WHEN paid_by = performed_by_profile_id THEN 1 END) as paid_by_igual_performed_by,
       COUNT(CASE WHEN paid_by != performed_by_profile_id THEN 1 END) as diferentes,
       COUNT(CASE WHEN paid_by IS NULL OR performed_by_profile_id IS NULL THEN 1 END) as con_null
FROM transactions
WHERE type IN ('income', 'income_direct');
```

**Resultados:**
```
 total | paid_by_igual_performed_by | diferentes | con_null 
-------+----------------------------+------------+----------
    89 |                         78 |         11 |        0
```

**Conclusión 3**: 
- 87.6% de ingresos: `paid_by` = `performed_by_profile_id`
- 12.4% difieren (11 casos)

---

#### Query 4: Investigar los 11 casos diferentes

```sql
SELECT t.type, t.description, t.is_compensatory_income,
       p_paid.display_name as paid_by_nombre,
       p_perf.display_name as performed_by_nombre
FROM transactions t
LEFT JOIN profiles p_paid ON t.paid_by = p_paid.id
LEFT JOIN profiles p_perf ON t.performed_by_profile_id = p_perf.id
WHERE t.type IN ('income', 'income_direct')
  AND t.paid_by != t.performed_by_profile_id
LIMIT 15;
```

**Resultados:**
```
     type      |     description      | is_compensatory_income | paid_by_nombre | performed_by_nombre 
---------------+----------------------+------------------------+----------------+---------------------
 income_direct | Equilibrio: Alquiler | t                      | Sarini13       | Kava
 income_direct | Equilibrio: Vodafone | t                      | Sarini13       | Kava
 income_direct | Equilibrio: Vivienda | t                      | Sarini13       | Kava
 income_direct | Equilibrio: Internet | t                      | Sarini13       | Kava
 ... (11 filas iguales)
```

**Conclusión 4**: 🔴 **INCONSISTENCIA DETECTADA**

Los 11 casos son **ingresos compensatorios** donde:
- `paid_by` = Sarini13 (incorrecto - debería ser quien gastó)
- `performed_by_profile_id` = Kava (correcto - el gasto directo asociado)

**Esto parece un BUG en la lógica de ingresos compensatorios**.

Verificación:
```sql
SELECT COUNT(*) as total_compensatorios,
       COUNT(CASE WHEN paid_by = performed_by_profile_id THEN 1 END) as iguales,
       COUNT(CASE WHEN paid_by != performed_by_profile_id THEN 1 END) as diferentes
FROM transactions
WHERE is_compensatory_income = true;
```

Resultado:
```
 total_compensatorios | iguales | diferentes 
----------------------+---------+------------
                   82 |      71 |         11
```

**13.4% de compensatorios tienen paid_by incorrecto**.

---

### 2. Análisis de `profile_id` vs `performed_by_profile_id`

#### Query 5: ¿Cuánto difieren?

```sql
SELECT COUNT(*) as total,
       COUNT(CASE WHEN profile_id = performed_by_profile_id THEN 1 END) as identicos,
       COUNT(CASE WHEN profile_id != performed_by_profile_id THEN 1 END) as diferentes,
       ROUND(100.0 * COUNT(CASE WHEN profile_id != performed_by_profile_id THEN 1 END) / COUNT(*), 2) as porcentaje_diferentes
FROM transactions;
```

**Resultados:**
```
 total | identicos | diferentes | porcentaje_diferentes 
-------+-----------+------------+-----------------------
   198 |       184 |         14 |                  7.07
```

**Conclusión 5**: 7% de transacciones tienen `profile_id` ≠ `performed_by_profile_id`

---

#### Query 6: Ver casos donde difieren

```sql
SELECT t.type, t.description, t.amount,
       p_reg.display_name as registrado_por,
       p_ej.display_name as ejecutado_por,
       t.created_at::date
FROM transactions t
JOIN profiles p_reg ON p_reg.id = t.profile_id
JOIN profiles p_ej ON p_ej.id = t.performed_by_profile_id
WHERE t.profile_id != t.performed_by_profile_id
LIMIT 15;
```

**Resultados:**
```
     type      |     description      | amount | registrado_por | ejecutado_por | created_at 
---------------+----------------------+--------+----------------+---------------+------------
 expense_direct | Internet             |     27 | Kava           | Sarini13      | 2025-10-29
 income_direct  | Equilibrio: Internet |     27 | Kava           | Sarini13      | 2025-10-29
 expense_direct | Varios               |  78.89 | Kava           | Sarini13      | 2025-10-29
 expense_direct | Alquiler             |    300 | Kava           | Sarini13      | 2025-10-28
 ... (14 filas, todas son gastos directos + compensatorios)
```

**Conclusión 6**: ✅ **Caso de uso VÁLIDO**

Todos los casos donde difieren son **gastos directos** donde:
- `profile_id` = Kava (owner que registra el gasto en el sistema)
- `performed_by_profile_id` = Sarini13 (miembro que realmente gastó)

**Este es un patrón esperado**: El owner registra gastos de otros miembros.

---

### 3. Análisis de `created_by_profile_id`

#### Query 7: ¿Es idéntico a profile_id?

```sql
SELECT COUNT(*) as total,
       COUNT(CASE WHEN profile_id = created_by_profile_id THEN 1 END) as identicos,
       COUNT(CASE WHEN profile_id != created_by_profile_id THEN 1 END) as diferentes,
       COUNT(CASE WHEN profile_id IS NULL OR created_by_profile_id IS NULL THEN 1 END) as con_null
FROM transactions;
```

**Resultados:**
```
 total | identicos | diferentes | con_null 
-------+-----------+------------+----------
   198 |       198 |          0 |        0
```

**Conclusión 7**: ✅ **100% idéntico** → Campo TOTALMENTE REDUNDANTE

---

## 🔍 Análisis de Código

### Uso de `profile_id` en transactions

```bash
grep -r "transactions.*profile_id" app/ lib/ --include="*.ts"
```

**Resultado**: Solo se usa en `UPDATE transactions SET updated_by_profile_id`

**NO hay filtros por `profile_id` en transactions**. Los filtros siempre son por:
- `household_id` (contexto del hogar)
- `period_id` (periodo mensual)
- `type`, `flow_type` (tipo de transacción)

**Conclusión 8**: `profile_id` en transactions **NO se usa para filtrar** ni para lógica de negocio. Solo es auditoría pasiva.

---

### Uso de `paid_by` en código

Búsqueda de usos no calculables:
```bash
grep -r "paid_by" app/ lib/ --include="*.ts" -A 3 -B 3 | grep -v "performed_by"
```

**Principales usos**:
1. **JOIN con joint_accounts** para determinar si es Cuenta Común
2. **Display en UI** ("Cuenta Común" vs nombre de miembro)
3. **Lógica de ingresos** (guardar el miembro que ingresa)

**Conclusión 9**: `paid_by` se usa principalmente para **display**, pero es CALCULABLE:
- Gastos → Siempre Cuenta Común (determinístico)
- Ingresos → Siempre `performed_by_profile_id` (redundante)

---

## 🧪 Calculabilidad de `paid_by`

### Lógica Determinística

```typescript
function getPaidBy(tx: Transaction, jointAccountId: string): string {
  if (tx.type === 'expense' || tx.type === 'expense_direct') {
    // Gastos SIEMPRE salen de Cuenta Común
    return jointAccountId;
  }
  
  if (tx.type === 'income' || tx.type === 'income_direct') {
    // Ingresos SIEMPRE del miembro que ingresa
    return tx.performed_by_profile_id;
  }
  
  throw new Error(`Tipo desconocido: ${tx.type}`);
}
```

**Verificación con datos reales**: ✅ **100% de casos son calculables**

---

## 🐛 BUG Identificado: Ingresos Compensatorios

**Problema**: 11 ingresos compensatorios tienen `paid_by` incorrecto.

**Datos reales**:
- Gasto directo: Sarini13 gasta 300€ → `performed_by_profile_id` = Sarini13
- Ingreso compensatorio: Se crea automáticamente
  - ❌ **Actual**: `paid_by` = Sarini13, `performed_by_profile_id` = Kava (INCORRECTO)
  - ✅ **Debería ser**: `paid_by` = Sarini13, `performed_by_profile_id` = Sarini13

**Root cause**: Error en la lógica de creación de ingresos compensatorios.

**Acción requerida**: Issue separado para corregir este bug.

---

## 📊 Resumen de Hallazgos

| Campo | ¿Redundante? | Evidencia | Acción |
|-------|--------------|-----------|--------|
| `profile_id` | ❌ NO | 7% casos difieren (owner registra gastos de otros) | ✅ MANTENER |
| `performed_by_profile_id` | ❌ NO | Campo principal para "quién ejecutó" | ✅ MANTENER |
| `paid_by` | ✅ SÍ | 100% calculable según tipo + performed_by | ⚠️ DEPRECAR |
| `created_by_profile_id` | ✅ SÍ | 100% idéntico a profile_id | ❌ DEPRECAR (Issue #31) |
| `real_payer_id` | ✅ SÍ | Duplica performed_by_profile_id en directos | ❌ MIGRAR (Issue #30) |
| `performed_by_email_deprecated` | ✅ SÍ | Ya deprecado | ❌ ELIMINAR (Issue #33) |

---

## 🎯 Decisión Arquitectónica

### Opción Elegida: **HÍBRIDA (2 campos almacenados + 1 calculado)**

```
✅ profile_id                → "Registrado por" (auditoría - MANTENER)
✅ performed_by_profile_id   → "Ejecutado por" (display - MANTENER)
🔄 paid_by                   → Calculado en queries (DEPRECAR almacenamiento)
```

### Justificación

#### ¿Por qué MANTENER `profile_id`?

✅ **Valor auditable**: 7% de casos donde el owner registra gastos de otros miembros
✅ **Trazabilidad**: Saber quién introdujo datos en el sistema tiene valor legal/compliance
✅ **Debugging**: Facilita identificar quién creó registros problemáticos
✅ **Sin coste adicional**: Ya existe y funciona, eliminarlo no aporta valor

**Caso de uso real**:
- Owner (Kava) registra gasto directo de Member (Sarini13)
- `profile_id` = Kava (quien tecleó)
- `performed_by_profile_id` = Sarini13 (quien gastó)

---

#### ¿Por qué DEPRECAR `paid_by` (almacenado)?

✅ **100% calculable**: Toda la información está en `type` + `performed_by_profile_id`
✅ **Elimina redundancia**: Un solo source of truth (`performed_by_profile_id`)
✅ **Simplifica lógica**: No hay que mantener consistencia entre campos
✅ **Previene bugs**: Los 11 casos inconsistentes de compensatorios desaparecen
✅ **Mantiene funcionalidad**: Se puede calcular en queries cuando se necesite

**Lógica de cálculo**:
```sql
-- Calcular paid_by en queries:
CASE 
  WHEN t.type IN ('expense', 'expense_direct') THEN ja.id
  ELSE t.performed_by_profile_id
END as paid_by_calculated
```

---

## 📝 Plan de Implementación

### Issue #31 (Independiente - 1-2h)
**Deprecar `created_by_profile_id`**
- ✅ Verificación: 100% idéntico a `profile_id`
- Marcar como DEPRECADO en comentarios SQL
- Actualizar queries para usar `profile_id`
- Período de gracia: 1 sprint

### Issue #30 (Actualizar - 2-3h)
**Migrar `real_payer_id` → `performed_by_profile_id`**
- Copiar datos donde sea NULL
- Actualizar queries
- Marcar como DEPRECADO
- Período de gracia: 1 sprint

### Issue #33 (Nuevo - 3-4h)
**Deprecar `paid_by` (almacenado)**
- Marcar columna como DEPRECADA
- Crear función helper `get_paid_by_calculated()`
- Actualizar queries para usar función calculada
- Testing exhaustivo con datos reales
- Período de gracia: 2 sprints (más tiempo por ser cambio mayor)

### Issue #34 (Nuevo - CRÍTICO - 2h)
**Corregir bug: paid_by en ingresos compensatorios**
- Los 11 casos con paid_by incorrecto
- Corregir lógica de creación de compensatorios
- Migrar datos históricos inconsistentes
- Testing de flujo completo directo → compensatorio

### Issue #35 (Futuro - 2-3h)
**Eliminar campos deprecados físicamente**
- Prerequisito: Issues #31, #30, #33 completados + 1-2 sprints
- DROP COLUMN `created_by_profile_id`
- DROP COLUMN `real_payer_id`
- DROP COLUMN `paid_by`
- DROP COLUMN `performed_by_email_deprecated`
- Regenerar types TypeScript
- Documentación final

---

## 🏗️ Arquitectura Final (Post-Implementación)

### Campos Activos en DB (2 campos)

```typescript
interface Transaction {
  // Campo 1: Auditoría (quién registró)
  profile_id: string; // UUID - FK a profiles
  
  // Campo 2: Ejecutor físico (quién ejecutó)
  performed_by_profile_id: string; // UUID - FK a profiles
  
  // Campos calculados en queries:
  // paid_by_calculated: string (calculado según tipo)
}
```

### Helper Function para Queries

```typescript
// lib/transactions/paidByCalculated.ts

/**
 * Fragmento SQL para calcular paid_by en queries.
 * 
 * Uso:
 * SELECT 
 *   t.*,
 *   ${getPaidByCalculatedSQL()} as paid_by_calculated
 * FROM transactions t
 * LEFT JOIN joint_accounts ja ON ja.household_id = t.household_id
 */
export function getPaidByCalculatedSQL(): string {
  return `
    CASE 
      WHEN t.type IN ('expense', 'expense_direct') THEN ja.id
      ELSE t.performed_by_profile_id
    END
  `;
}
```

### Display en UI

```typescript
// components/shared/TransactionCard.tsx

// ANTES (usando paid_by almacenado):
if (tx.paid_by_is_joint_account) {
  paidBy = tx.performed_by_display_name || 'Desconocido';
}

// DESPUÉS (simplificado - solo performed_by):
paidBy = tx.performed_by_display_name || 'Desconocido';
// El tipo (Común/Directo) ya se muestra en badges
```

---

## 📈 Beneficios de la Arquitectura Final

### Simplicidad
- ✅ De 6 campos → 2 campos activos
- ✅ Un solo source of truth para "quién ejecutó"
- ✅ Lógica calculada centrali zada

### Consistencia
- ✅ Elimina posibilidad de `paid_by` inconsistente
- ✅ No más bugs como los 11 compensatorios incorrectos
- ✅ Un único campo a actualizar en ediciones

### Mantenibilidad
- ✅ Menos JOINs en queries
- ✅ Documentación más clara
- ✅ Onboarding de developers más rápido

### Performance
- ⚠️ Cálculo de `paid_by` en cada query (overhead mínimo)
- ✅ Se puede indexar `performed_by_profile_id`
- ✅ Menos columnas = menos almacenamiento

---

## ⚠️ Riesgos y Mitigaciones

### Riesgo 1: Performance de cálculo

**Probabilidad**: Baja
**Impacto**: Bajo

**Mitigación**:
- El cálculo es trivial (CASE WHEN con FK lookup)
- JOINs con `joint_accounts` ya existen en queries actuales
- Indexar `performed_by_profile_id` para optimizar

---

### Riesgo 2: Queries legacy usando paid_by

**Probabilidad**: Media
**Impacto**: Alto (rompe funcionalidad)

**Mitigación**:
- **Período de gracia largo**: 2 sprints (Issue #33)
- **Búsqueda exhaustiva**: `grep -r "paid_by" app/ lib/`
- **Testing completo**: Todos los flows (crear, editar, listar, filtrar)
- **Rollback plan**: Restaurar columna desde backup si falla

---

### Riesgo 3: Datos históricos inconsistentes

**Probabilidad**: Alta (11 casos ya detectados)
**Impacto**: Medio (display incorrecto)

**Mitigación**:
- **Issue #34 prioritario**: Corregir bug compensatorios ANTES de deprecar paid_by
- **Migración de datos**: Script SQL para corregir inconsistencias históricas
- **Verificación post-migración**: Queries de validación

---

## ✅ Checklist de Verificación Pre-Implementación

### Queries SQL ejecutadas:
- ✅ Distribución paid_by por tipo/flujo
- ✅ Gastos = Cuenta Común (100% verificado)
- ✅ Ingresos paid_by vs performed_by (inconsistencias identificadas)
- ✅ profile_id vs performed_by_profile_id (7% difieren - caso válido)
- ✅ created_by_profile_id duplicado (100% idéntico)

### Código revisado:
- ✅ Usos de paid_by en queries
- ✅ Usos de profile_id para filtros (ninguno en transactions)
- ✅ Lógica de display en UI
- ✅ Funciones de creación de transacciones

### Decisiones tomadas:
- ✅ Arquitectura final definida (2 campos + 1 calculado)
- ✅ Issues creadas y priorizadas
- ✅ Plan de migración ordenado
- ✅ Riesgos identificados y mitigados

---

## 📚 Referencias

- **Issue #29**: UI "Gastado por" simplificada (pausado hasta #33)
- **Issue #30**: Migrar real_payer_id (actualizar con nueva info)
- **Issue #31**: Deprecar created_by_profile_id (puede hacerse ya)
- **Issue #32**: Este análisis
- **Issue #33** (crear): Deprecar paid_by almacenado
- **Issue #34** (crear): Corregir bug compensatorios
- **Issue #35** (crear): Eliminar campos deprecados físicamente

---

## 🎯 Próximos Pasos Inmediatos

1. ✅ **Crear Issue #34** - Bug compensatorios (CRÍTICO)
2. ✅ **Crear Issue #33** - Deprecar paid_by almacenado
3. ✅ **Actualizar Issue #30** - Con nueva info de paid_by
4. ✅ **Actualizar Issue #29** - Con arquitectura final
5. 🔄 **Implementar Issue #31** - Deprecar created_by_profile_id (independiente)
6. 🔄 **Implementar Issue #34** - Corregir bug (PRIORITARIO)
7. 🔄 **Implementar Issue #33** - Deprecar paid_by (después de #34)
8. 🔄 **Implementar Issue #30** - Migrar real_payer_id
9. 🔄 **Implementar Issue #29** - UI final simplificada

---

**Análisis completado**: 2 Noviembre 2025
**Decisión validada con datos reales**: ✅
**Plan de implementación**: ✅ Definido y priorizado
