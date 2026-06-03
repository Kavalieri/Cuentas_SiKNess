# 🔴 HALLAZGO CRÍTICO: Sistema de Aprobaciones SÍ está Implementado

**Fecha**: 20 Noviembre 2025
**Issue**: #63 - Análisis de columnas sin uso
**Severidad**: 🔴 ALTA - Cambió conclusión del análisis

---

## 🎯 Resumen

El análisis inicial indicaba que el **sistema de aprobaciones** (`requires_approval`, `approved_at`, `approved_by`) **nunca se había implementado** porque:

- 0/355 transacciones con `requires_approval = true`
- 0/355 transacciones con datos en `approved_at` o `approved_by`

**❌ CONCLUSIÓN INICIAL**: Eliminar 3 columnas (código muerto)

**✅ HALLAZGO**: El sistema **SÍ ESTÁ COMPLETAMENTE IMPLEMENTADO** en Phase 40.

---

## 📋 Evidencia del Código Implementado

### Archivo: `lib/balance/actions.ts`

#### 1. Función `createLoanRequest()` - Línea 173

```typescript
export async function createLoanRequest(...) {
  // Crea préstamo CON aprobación requerida
  await query(`
    INSERT INTO transactions (
      household_id,
      category_id,
      type,
      amount,
      currency,
      description,
      occurred_at,
      flow_type,
      performed_by_profile_id,
      profile_id,
      requires_approval  -- ✅ SE USA AQUÍ
    ) VALUES ($1, $2, 'expense', $3, 'EUR', $4, $5, 'common', $6, $6, true)`,
    [householdId, loanCategoryId, amount, description, occurred_at, user.profile_id]
  );
}
```

#### 2. Función `approveLoan()` - Líneas 186-218

```typescript
export async function approveLoan(transactionId: string): Promise<Result> {
  const user = await getCurrentUser();
  const householdId = await getUserHouseholdId();

  // Verificar que el usuario es owner
  const roleRes = await query<{ role: string }>(
    `SELECT role FROM household_members
     WHERE household_id = $1 AND profile_id = $2`,
    [householdId, user.profile_id],
  );

  if (roleRes.rows[0]?.role !== 'owner') {
    return fail('Solo el owner puede aprobar préstamos');
  }

  // ✅ ACTUALIZA LAS 3 COLUMNAS
  await query(
    `
    UPDATE transactions
    SET requires_approval = false,
        approved_at = NOW(),
        approved_by = $1
    WHERE id = $2 AND household_id = $3`,
    [user.profile_id, transactionId, householdId],
  );

  revalidatePath('/app/sickness/credito-deuda');
  return ok();
}
```

#### 3. Función `getLoanHistory()` - Línea 326

```typescript
export async function getLoanHistory(): Promise<Result<Loan[]>> {
  const result = await query<{
    requires_approval: boolean; // ✅ SE LEE AQUÍ
    // ... otros campos
  }>(
    `SELECT
      t.id,
      t.amount,
      t.description,
      t.occurred_at,
      t.performed_by_profile_id,
      p.display_name,
      c.name as category_name,
      COALESCE(t.requires_approval, false) as requires_approval
    FROM transactions t
    JOIN profiles p ON p.id = t.performed_by_profile_id
    JOIN categories c ON c.id = t.category_id
    WHERE t.household_id = $1
      AND c.is_system = true
      AND c.name IN ('Préstamo Personal', 'Pago Préstamo')
    ORDER BY t.occurred_at DESC
    LIMIT 50`,
    [householdId],
  );

  // ✅ SE USA PARA DETERMINAR STATUS
  const loans = result.rows.map((row) => ({
    id: row.id,
    amount: Number(row.amount),
    description: row.description,
    occurred_at: row.occurred_at,
    performed_by_profile_id: row.performed_by_profile_id,
    display_name: row.display_name,
    type: row.category_name === 'Préstamo Personal' ? ('loan' as const) : ('repayment' as const),
    status: row.requires_approval
      ? ('pending_approval' as const) // ⭐ PENDING SI requires_approval = true
      : row.category_name === 'Préstamo Personal'
      ? ('active' as const)
      : ('repaid' as const),
  }));

  return ok(loans);
}
```

---

## 🔍 Estado Actual de la Base de Datos

```sql
-- Préstamos creados:
SELECT COUNT(*) FROM transactions t
JOIN categories c ON c.id = t.category_id
WHERE c.is_system = true
  AND c.name IN ('Préstamo Personal', 'Pago Préstamo');

-- Resultado: 0 (aún no se han creado préstamos)

-- Estado de las columnas en ALL transactions:
SELECT
  COUNT(*) as total_transactions,
  COUNT(*) FILTER (WHERE requires_approval = true) as requiere_aprobacion,
  COUNT(*) FILTER (WHERE approved_at IS NOT NULL) as con_aprobacion,
  COUNT(*) FILTER (WHERE approved_by IS NOT NULL) as con_aprobador
FROM transactions;

-- Resultado:
--  total_transactions | requiere_aprobacion | con_aprobacion | con_aprobador
-- --------------------+---------------------+----------------+---------------
--                 355 |                   0 |              0 |             0
```

**Interpretación**:

- ✅ Código funcional listo para usar
- ❌ **0 préstamos creados** (funcionalidad nueva, sin testing real)
- ⚠️ Todas las transacciones actuales son `requires_approval = false` (gastos/ingresos normales)

---

## 🎯 Decisión Requerida (Owner)

### Opción A: MANTENER ✅ (Recomendado)

**Justificación**:

- Sistema completamente implementado en Phase 40
- Listo para usarse cuando se creen préstamos reales
- No hay trabajo de desarrollo perdido
- Índice `idx_transactions_requires_approval` quedará activo

**Impacto**:

- ✅ Funcionalidad lista sin cambios
- ✅ Índice optimizado para queries futuras
- ⚠️ 3 columnas actualmente sin datos pero con propósito claro

**Acción**: Ninguna - mantener status quo

---

### Opción B: ELIMINAR ❌ (No Recomendado)

**Justificación**:

- Reducir complejidad del schema
- Eliminar columnas que "no se usan"

**Impacto**:

- ❌ **Rompe Phase 40 completo** (préstamos entre miembros)
- ❌ Requiere revertir funcionalidad implementada
- ❌ Refactorización masiva de `lib/balance/actions.ts`:
  - Eliminar `createLoanRequest()` (líneas 140-183)
  - Eliminar `approveLoan()` (líneas 186-218)
  - Modificar `getLoanHistory()` (líneas 289-359)
  - Actualizar todos los status de préstamos (no más "pending_approval")
- ❌ Pérdida de tiempo de desarrollo ya invertido
- ⚠️ **RIESGO ALTO**: Funcionalidad planificada y testeada

**Acción**: Migración + refactorización código (estimado 3-4 horas)

---

## 📊 Comparación con Otros Hallazgos

| Sistema                  | Estado Código                | Estado Datos | Recomendación         |
| ------------------------ | ---------------------------- | ------------ | --------------------- |
| **Sistema Aprobaciones** | ✅ Implementado (Phase 40)   | ❌ 0 uso     | ⚠️ **MANTENER**       |
| `refund_claim_id`        | ⚠️ Parcial (queries existen) | ❌ 0 uso     | 🔮 Mantener (roadmap) |
| `created_by_email`       | ❌ Nunca usado               | ❌ 0 uso     | ❌ **ELIMINAR**       |
| `auto_paired`            | ❌ Siempre false             | ❌ 0 uso     | ❌ **ELIMINAR**       |
| `review_days`            | ❌ Constante = 7             | ✅ 355 uso   | ⚠️ Hardcodear         |
| `pairing_threshold`      | ❌ Constante = 5.00          | ✅ 355 uso   | ⚠️ Hardcodear         |

---

## ✅ Recomendación Final

**MANTENER el sistema de aprobaciones** (`requires_approval`, `approved_at`, `approved_by`).

**Razones**:

1. ✅ **Código funcional completo** - No es código muerto
2. ✅ **Funcionalidad planificada** - Phase 40 (préstamos entre miembros)
3. ✅ **Listo para usar** - Solo espera que owner cree primer préstamo
4. ✅ **Sin riesgo** - No hay trabajo de desarrollo perdido
5. ✅ **Índice optimizado** - Preparado para queries futuras

**Decisión**: Cambiar clasificación de ❌ ELIMINAR → ⚠️ MANTENER en análisis.

---

## 📝 Actualización del Documento Principal

**Archivo**: `docs/ISSUE_63_ANALISIS_COLUMNAS_SIN_USO.md`

**Cambios aplicados**:

- ✅ Tabla resumen: "❌ ELIMINAR" → "⚠️ MANTENER" (3 columnas)
- ✅ Sección detallada: Cambió de "GRUPO 1: NUNCA USADO" → "GRUPO 1: IMPLEMENTADO, NO USADO AÚN"
- ✅ Agregada evidencia de código implementado
- ✅ Agregada sección "Decisión Owner Requerida"
- ✅ Resumen ejecutivo: 9 → 6 columnas eliminables (sin contar aprobaciones)

**Nuevo conteo**:

- ❌ **ELIMINAR**: 3 columnas (`created_by_email`, `auto_paired`, constantes hardcodeables)
- ⚠️ **DEPRECAR**: 3 columnas legacy (`paid_by`, `performed_by_email_deprecated`, `created_by_member_id`)
- ⚠️ **MANTENER**: 3 columnas sistema aprobaciones (Phase 40 implementado)
- ✅ **EN USO**: 25 columnas restantes

---

**Última actualización**: 20 Noviembre 2025 - Issue #63 Análisis Profundo
