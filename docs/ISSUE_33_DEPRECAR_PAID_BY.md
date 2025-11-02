# Issue #33: Deprecar Almacenamiento de `paid_by`

**Fecha**: 02 Noviembre 2025
**Estado**: 🔄 EN PROGRESO
**Objetivo**: Convertir `paid_by` de campo almacenado a campo calculado dinámicamente

---

## 🎯 Objetivo Final

**Campo único de verdad**: `performed_by_profile_id` (quien ejecutó la transacción)

**Campo calculado**: `paid_by` será calculado dinámicamente según reglas de negocio:
- **Gastos** (común/directo): `paid_by = joint_account_id` (dinero sale de Cuenta Común)
- **Ingresos** (común/directo): `paid_by = performed_by_profile_id` (dinero sale del miembro)

---

## 📊 Verificación Inicial de Datos (DEV)

**Ejecutado**: 02 Noviembre 2025 16:40

### Consistencia Actual: ✅ 100% VÁLIDA

```sql
-- Resultados por tipo/flujo:
      type      | flow_type | total | paid_eq_performed | paid_is_joint | paid_is_null | otros
----------------+-----------+-------+-------------------+---------------+--------------+-------
 expense        | common    |    24 |                 0 |            24 |            0 |     0
 income         | common    |     4 |                 4 |             0 |            0 |     0
 expense_direct | direct    |    85 |                 0 |            85 |            0 |     0
 income_direct  | direct    |    85 |                85 |             0 |            0 |     0
```

**Conclusión**: Los datos actuales ya siguen las reglas de cálculo propuestas.

---

## 🔍 Reglas de Cálculo (Validadas con Datos Reales)

### REGLA 1: Gastos Comunes
- `paid_by` = UUID de `joint_account` (Cuenta Común)
- `performed_by_profile_id` = Miembro que ejecutó el gasto
- **Verificado**: 24/24 transacciones cumplen regla

### REGLA 2: Ingresos Comunes ⚠️ CRÍTICO
- `paid_by` = UUID del miembro que aporta
- `performed_by_profile_id` = **Mismo miembro**
- **Uso**: Query en `/api/periods/contributions` suma aportaciones por miembro
- **Verificado**: 4/4 transacciones tienen `paid_by = performed_by_profile_id`

### REGLA 3: Gastos Directos
- `paid_by` = UUID de `joint_account` (Cuenta Común - Criterio Issue #18)
- `performed_by_profile_id` = Miembro que pagó de bolsillo
- **Verificado**: 85/85 transacciones cumplen regla

### REGLA 4: Ingresos Directos (Compensatorios)
- `paid_by` = UUID del miembro
- `performed_by_profile_id` = **Mismo miembro**
- **Verificado**: 85/85 transacciones tienen `paid_by = performed_by_profile_id`

---

## 🚨 Puntos Críticos Identificados

### 1. Query de Aportaciones (`/api/periods/contributions/route.ts:180`)

**Query actual**:
```sql
SELECT t.paid_by as profile_id, SUM(t.amount) AS total
FROM transactions t
WHERE t.type = 'income' AND t.flow_type = 'common'
GROUP BY t.paid_by
```

**Debe cambiar a**:
```sql
SELECT t.performed_by_profile_id as profile_id, SUM(t.amount) AS total
FROM transactions t
WHERE t.type = 'income' AND t.flow_type = 'common'
GROUP BY t.performed_by_profile_id
```

**Impacto**: ✅ NINGUNO - campos son idénticos en ingresos comunes (4/4)

### 2. Exports (`/app/exports/actions.ts`)

**Uso actual**: SELECT paid_by + lookup en profiles
**Cambio necesario**: Usar `performed_by_profile_id` en lugar de `paid_by`

### 3. UI (`/components/shared/TransactionCard.tsx`)

**Props actuales**:
- `paid_by`
- `paid_by_email`
- `paid_by_display_name`
- `paid_by_is_joint_account`

**Cambio necesario**: Backend debe calcular estos valores desde `performed_by_profile_id` + reglas

---

## 📋 Plan de Implementación

### FASE 1: ✅ Verificación de Datos (COMPLETADO)
- [x] Verificar identidad en ingresos comunes (4/4 iguales)
- [x] Verificar distribución por tipo/flujo (100% consistente)
- [x] Documentar estado actual

### FASE 2: 🔄 Actualizar Queries de Lectura (EN PROGRESO)
- [ ] `app/api/periods/contributions/route.ts` → usar `performed_by_profile_id`
- [ ] `app/exports/actions.ts` → cambiar a `performed_by_profile_id`
- [ ] Testing en DEV: verificar cálculos de contribuciones

### FASE 3: ⏳ Actualizar Código de Escritura
- [ ] `lib/transactions/unified.ts` → Comentar asignaciones de `paid_by`
- [ ] Mantener compatibilidad (no eliminar campos aún)
- [ ] Testing: crear transacciones de cada tipo

### FASE 4: ⏳ Migración de Schema
- [ ] Crear función PostgreSQL `calculate_paid_by()`
- [ ] Marcar columna como DEPRECATED (COMMENT ON COLUMN)
- [ ] Aplicar en DEV y PROD

### FASE 5: ⏳ Actualizar UI (si necesario)
- [ ] Componentes que usan `paid_by_*` props
- [ ] Backend adapta cálculo dinámico

### FASE 6: ⏳ Testing E2E Completo
- [ ] Crear transacciones de cada tipo
- [ ] Verificar contributions
- [ ] Verificar exports
- [ ] Verificar UI muestra correctamente

### FASE 7: ⏳ Deploy a PROD
- [ ] Aplicar cambios de código
- [ ] Aplicar migración de schema
- [ ] Monitoreo post-deploy

---

## 🛡️ Mitigación de Riesgos

### Riesgo 1: Datos Históricos Inconsistentes
- **Estado**: ✅ MITIGADO
- **Verificación**: 198/198 registros consistentes con reglas
- **Excepción**: 22 registros corruptos de Issue #34 (se auto-resuelven con esta implementación)

### Riesgo 2: Lógica de Contributions
- **Estado**: ✅ MITIGADO
- **Verificación**: `paid_by = performed_by_profile_id` en 100% de ingresos comunes
- **Cambio**: Transparente, no afecta cálculos

### Riesgo 3: UI Muestra Datos Incorrectos
- **Estado**: ⏳ PENDIENTE
- **Mitigación**: Actualizar backend primero, luego componentes

---

## 📝 Función de Cálculo (Propuesta)

```typescript
/**
 * Calcula paid_by dinámicamente basado en tipo de transacción
 *
 * @param type Tipo de transacción
 * @param performedByProfileId Miembro que ejecutó la transacción
 * @param jointAccountId UUID de la Cuenta Común del hogar
 * @returns UUID del origen del dinero (paid_by calculado)
 */
export function calculatePaidBy(
  type: 'income' | 'expense' | 'income_direct' | 'expense_direct',
  performedByProfileId: string,
  jointAccountId: string
): string {
  // Gastos: dinero sale de Cuenta Común
  if (type === 'expense' || type === 'expense_direct') {
    return jointAccountId;
  }

  // Ingresos: dinero sale del miembro
  return performedByProfileId;
}
```

---

## ✅ Commits Relacionados

- **Inicio**: (pendiente)
- **Queries**: (pendiente)
- **Código**: (pendiente)
- **Schema**: (pendiente)
- **Cierre**: (pendiente)

---

**Última actualización**: 02 Noviembre 2025 16:42
