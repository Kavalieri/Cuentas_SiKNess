# Análisis del Problema: Cálculo Incorrecto en Periodos Cerrados

**Fecha**: 19 Noviembre 2025
**Issue**: Cálculo de contribuciones falla en periodos cerrados
**Autor**: AI Assistant

---

## 🔴 Problema Identificado

Los cálculos de contribución son **correctos en periodos activos** pero **incorrectos en periodos cerrados**.

### Evidencia

**NOVIEMBRE 2025 (active)** ✅:
- Kava: Aportado 562.64€, Gastos Directos 60€ → Pendiente: 477.36€
- Sarini13: Aportado 150.36€, Gastos Directos 327€ → Pendiente: 622.64€
- **Cálculo correcto**: Los gastos directos se descuentan del pendiente

**OCTUBRE 2025 (closed)** ❌:
- Los gastos directos **NO se descuentan** del pendiente
- El cálculo ignora los 327€ de gastos directos de Sarini13

---

## 🔍 Causa Raíz

**Archivo**: `app/api/periods/contributions/route.ts`
**Línea**: 174

```typescript
const shouldCountDirectAsPaid = currentPhase === 'validation' || currentPhase === 'active';
```

**Problema**: Esta lógica **excluye** los periodos cerrados (`phase = 'closed'`).

**Efecto**:
```typescript
// Línea 227
const paidDirect = shouldCountDirectAsPaid ? directExpenses : 0;
const paidCommon = shouldCountDirectAsPaid ? (commonIncomesMap.get(m.profile_id) ?? 0) : 0;
```

Cuando `phase = 'closed'`:
- `paidDirect = 0` ❌ (debería ser el total de gastos directos)
- `paidCommon = 0` ❌ (debería ser el total de ingresos comunes)

---

## ❓ Pregunta Clave

**¿Por qué existe esta condición?**

Posibles razones históricas:
1. **Fase "preparing"**: No contar gastos directos hasta validar contribuciones
2. **Fase "closed"**: ¿Protección contra modificaciones? (pero NO tiene sentido ignorar gastos reales)

**Hipótesis**: La condición fue diseñada para **fase preparing**, pero se extendió incorrectamente a **fase closed**.

---

## ✅ Solución Propuesta

### Opción 1: Incluir 'closed' en la condición (RECOMENDADA)

```typescript
const shouldCountDirectAsPaid = 
  currentPhase === 'validation' || 
  currentPhase === 'active' || 
  currentPhase === 'closed';
```

**Justificación**:
- Los gastos directos son **hechos históricos** que no cambian
- Deben contarse siempre después de la fase preparing
- Mantiene consistencia: el cálculo no cambia al cerrar el periodo

### Opción 2: Solo excluir 'preparing'

```typescript
const shouldCountDirectAsPaid = currentPhase !== 'preparing';
```

**Ventaja**: Más robusto ante futuras fases

---

## 🔄 Impacto de la Corrección

### Cambios en el Cálculo

**ANTES (Octubre cerrado)**:
```typescript
paidDirect = 0  // ❌ Ignora 327€ de Sarini13
paidCommon = 0  // ❌ Ignora ingresos
paid = 0
pending = 1200€ (sin ajustar)
```

**DESPUÉS (Octubre cerrado)**:
```typescript
paidDirect = 327€  // ✅ Cuenta gastos directos
paidCommon = 193.75€  // ✅ Cuenta ingresos
paid = 520.75€
pending = 679.25€  // ✅ Calculo correcto
```

### Periodos Afectados

- **Octubre 2025**: Se corregirá al aplicar fix
- **Periodos futuros**: Mantendrán consistencia al cerrarse
- **Noviembre 2025**: Sin cambios (ya está correcto)

---

## 📝 Acciones Requeridas

### 1. Corregir el Código

**Archivo**: `app/api/periods/contributions/route.ts`
**Línea**: ~174

```diff
- const shouldCountDirectAsPaid = currentPhase === 'validation' || currentPhase === 'active';
+ const shouldCountDirectAsPaid = currentPhase !== 'preparing';
```

### 2. Documentar la Lógica

Añadir comentario explicativo:

```typescript
// REGLA: Contar gastos directos y aportaciones comunes en todas las fases excepto 'preparing'
// - preparing: Solo mostrar contribuciones esperadas (sin contar ejecución real)
// - validation/active/closed: Contar todo lo ejecutado (gastos directos + ingresos comunes)
// Esto mantiene la consistencia: el cálculo no cambia al cerrar el periodo
const shouldCountDirectAsPaid = currentPhase !== 'preparing';
```

### 3. Deprecar Tabla `contributions`

La tabla `contributions` está **vacía** y **no se usa** en el sistema actual.

**Documentar**:
- ❌ NO se usa para cálculos
- ❌ NO se pobla automáticamente
- ⚠️ Podría causar confusión
- ✅ El cálculo es 100% en tiempo real desde `transactions`

**Opciones**:
1. **Deprecar y documentar**: Renombrar a `_legacy_contributions`
2. **Eliminar**: Si no hay plan de uso futuro
3. **Implementar**: Poblar durante bloqueo de periodo (más complejo)

---

## 🎯 Validación Post-Fix

### Test Manual

```sql
-- Verificar Octubre después del fix
SELECT 
  p.display_name,
  -- Gastos directos (deben contarse)
  COALESCE(SUM(CASE WHEN t.type = 'expense_direct' THEN t.amount ELSE 0 END), 0) as gastos_directos,
  -- Ingresos comunes (deben contarse)
  COALESCE(SUM(CASE WHEN t.type = 'income' AND t.flow_type = 'common' THEN t.amount ELSE 0 END), 0) as ingresos_comunes,
  -- Total pagado efectivo
  COALESCE(SUM(CASE WHEN t.type = 'expense_direct' THEN t.amount ELSE 0 END), 0) + 
  COALESCE(SUM(CASE WHEN t.type = 'income' AND t.flow_type = 'common' THEN t.amount ELSE 0 END), 0) as total_pagado
FROM transactions t
JOIN profiles p ON p.id = t.performed_by_profile_id
JOIN monthly_periods mp ON mp.id = t.period_id
WHERE mp.household_id = 'd0c3fe46-f19e-4d60-bc13-fd8b2f7be228'
  AND mp.year = 2025
  AND mp.month = 10
GROUP BY p.display_name;
```

**Resultado Esperado**:
- Kava: gastos_directos=0, ingresos_comunes=680, total_pagado=680
- Sarini13: gastos_directos=327, ingresos_comunes=193.75, total_pagado=520.75

### Test API

```bash
# Consultar API de contribuciones para Octubre
curl http://localhost:3001/api/periods/contributions?year=2025&month=10

# Verificar que paid_amount incluye gastos directos + ingresos comunes
```

---

## 📚 Documentación Adicional Necesaria

### 1. Flujo Completo del Sistema

Crear: `docs/SISTEMA_CONTRIBUCIONES_FLUJO_REAL.md`

**Contenido**:
- Cómo se calculan las contribuciones (100% en tiempo real)
- Qué tablas se usan (transactions, monthly_periods, member_incomes)
- Qué tablas NO se usan (contributions está vacía)
- Lógica de fases y su impacto en cálculos
- Vistas materializadas (mv_member_pending_contributions)

### 2. Deprecación de Tabla `contributions`

Crear: `docs/DEPRECATION_CONTRIBUTIONS_TABLE.md`

**Contenido**:
- Estado actual: Tabla vacía, no utilizada
- Razón histórica de existencia
- Por qué se depreca
- Plan de eliminación (si aplica)
- Alternativas actuales (cálculo en tiempo real)

### 3. Actualizar AGENTS.md

Añadir sección sobre contribuciones:
```markdown
## Sistema de Contribuciones

**Cálculo**: 100% en tiempo real desde `transactions`
**NO usar**: Tabla `contributions` (deprecada, vacía)
**Fases del periodo**:
- `preparing`: Solo mostrar esperado (no contar ejecución)
- `validation/active/closed`: Contar gastos directos + ingresos comunes

**Regla crítica**: `shouldCountDirectAsPaid = phase !== 'preparing'`
```

---

## 🔄 Próximos Pasos

1. ✅ **Aplicar fix** en `route.ts`
2. ✅ **Commit y push**
3. ✅ **Validar en DEV** (Octubre debe mostrar cálculos correctos)
4. ✅ **Documentar flujo real** del sistema
5. ✅ **Deprecar tabla contributions**
6. ⏳ **Continuar con Phase 2** del Issue #58 (función `calculate_member_balance`)

---

**Lección Aprendida**: Siempre validar lógica de negocio con datos reales en múltiples estados (activo, cerrado, etc.). La consistencia del cálculo entre fases es crítica.
