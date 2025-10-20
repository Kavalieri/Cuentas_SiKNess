# Gestión de Períodos Mensuales - CuentasSiK

**Fecha**: 20 Octubre 2025
**Estado**: PROPUESTA - Pendiente de implementación

---

## 🎯 Objetivos

1. **Evitar creación masiva de períodos vacíos** (actualmente tenemos 25 períodos, solo 1 con datos)
2. **Crear períodos bajo demanda** cuando realmente se necesitan
3. **Permitir edición de períodos pasados** para correcciones/ajustes
4. **Gestionar apertura de períodos futuros** de forma controlada

---

## 📊 Situación Actual (Octubre 2025)

### Períodos Existentes

```sql
SELECT COUNT(*), MIN(year || '-' || month), MAX(year || '-' || month) 
FROM monthly_periods 
WHERE household_id = 'd0c3fe46-f19e-4d60-bc13-fd8b2f7be228';

-- Resultado: 25 períodos desde 2024-10 hasta 2026-08
```

### Períodos con Datos

```
Solo 2025-10 tiene 13 transacciones
Todos los demás están vacíos (phase='preparing', 0 transacciones, 0 contribuciones)
```

### Problemas Identificados

1. ✅ **Balance incorrecto**: Resuelto con commit 02e64ce (fix period.phase logic) + este commit
   - Problema: `getHouseholdBalancesOverview` no contaba gastos directos como contribución
   - Solución: Añadido cálculo de gastos directos con lógica `shouldCountDirectAsPaid` basada en `phase`

2. ⚠️ **Períodos fantasma**: 24 períodos sin datos ocupando espacio y confundiendo
   - No sabemos cuándo/cómo se crearon
   - No hay lógica clara de cuándo crear un período nuevo

3. ⚠️ **Sin edición de pasados**: No hay forma de reabrir períodos cerrados para correcciones

---

## 🏗️ Propuesta de Arquitectura

### Ciclo de Vida de un Período

```
┌─────────────┐
│   INEXISTENTE│  ← No existe en BD (default)
└──────┬──────┘
       │ Creación bajo demanda (al registrar primera transacción o al avanzar de mes)
       ▼
┌─────────────┐
│  'preparing'│  ← Configuración inicial (ingresos, método de cálculo)
└──────┬──────┘
       │ Owner → "Calcular Contribuciones" (Fase 2)
       ▼
┌─────────────┐
│ 'validation'│  ← Miembros aportan su parte (pagos comunes + gastos directos)
└──────┬──────┘
       │ Owner → "Bloquear Período" (no más cambios de configuración)
       ▼
┌─────────────┐
│   'active'  │  ← Período en uso activo (gastos/ingresos del mes)
└──────┬──────┘
       │ Owner → "Cerrar Período" (fin de mes, reconciliación)
       ▼
┌─────────────┐
│  'closing'  │  ← Reconciliación en proceso (cálculo de balances finales)
└──────┬──────┘
       │ Automático tras reconciliación exitosa
       ▼
┌─────────────┐
│   'closed'  │  ← Período cerrado (solo lectura, excepto reopening)
└──────┬──────┘
       │ Owner → "Reabrir para Correcciones" (casos excepcionales)
       ▼
┌─────────────┐
│  'reopened' │  ← Editable temporalmente para ajustes
└──────┬──────┘
       │ Owner → "Recerrar"
       ▼
    'closed'
```

### Fases y Sus Características

| Fase | Crear Transacciones | Editar Configuración | Calcular Contribuciones | Descripción |
|------|---------------------|----------------------|-------------------------|-------------|
| `preparing` | ❌ No | ✅ Sí | ❌ No | Solo configuración inicial |
| `validation` | ⚠️ Solo Owner | ⚠️ Solo ingresos | ✅ Sí | Miembros aportan su parte |
| `active` | ✅ Sí | ❌ No | ❌ No (ya calculadas) | Operativa mensual |
| `closing` | ❌ No | ❌ No | ❌ No | Reconciliación automática |
| `closed` | ❌ No | ❌ No | ❌ No | Solo lectura |
| `reopened` | ✅ Sí | ⚠️ Limitado | ⚠️ Recalcular | Correcciones excepcionales |

---

## 🎬 Estrategias de Creación

### Opción A: Creación Lazy (RECOMENDADA)

**Cuándo crear**: Solo cuando se necesita

**Triggers**:
1. Usuario registra primera transacción del mes → Crear período si no existe
2. Owner accede a "Configurar Período" → Crear si no existe
3. Fin de mes anterior → Sugerir crear próximo período (notificación)
4. Cron job mensual → Crear período del mes actual si no existe (seguridad)

**Ventajas**:
- ✅ Sin períodos fantasma
- ✅ Crecimiento orgánico
- ✅ Menos carga en BD

**Desventajas**:
- ⚠️ Requiere lógica de creación distribuida

### Opción B: Creación Proactiva

**Cuándo crear**: Mes actual + próximo mes

**Triggers**:
1. Cron job diario → Verificar que existan períodos de mes actual y siguiente
2. Al cerrar período N → Crear período N+1 si no existe

**Ventajas**:
- ✅ Período siempre listo
- ✅ Lógica centralizada

**Desventajas**:
- ⚠️ Crea períodos que pueden no usarse
- ⚠️ Requiere cron job funcionando

---

## 📝 Implementación Propuesta (Opción A + B Híbrida)

### 1. Función Helper de Creación

```typescript
// lib/periods.ts

export async function ensureMonthlyPeriod(
  householdId: string,
  year: number,
  month: number,
  options?: {
    phase?: 'preparing' | 'validation' | 'active';
    autoCalculate?: boolean;
  }
): Promise<Result<{ period_id: string }>> {
  // 1. Verificar si ya existe
  const existing = await query(
    `SELECT id, phase FROM monthly_periods 
     WHERE household_id = $1 AND year = $2 AND month = $3`,
    [householdId, year, month]
  );

  if (existing.rows[0]) {
    return ok({ period_id: existing.rows[0].id });
  }

  // 2. Determinar fase inicial
  const now = new Date();
  const isPast = year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1);
  const isCurrent = year === now.getFullYear() && month === now.getMonth() + 1;
  
  const initialPhase = options?.phase || (
    isPast ? 'closed' : 
    isCurrent ? 'active' : 
    'preparing'
  );

  // 3. Crear período
  const result = await query(
    `INSERT INTO monthly_periods (household_id, year, month, status, phase, opening_balance, closing_balance)
     VALUES ($1, $2, $3, 'open', $4, 0, 0)
     RETURNING id`,
    [householdId, year, month, initialPhase]
  );

  const periodId = result.rows[0].id;

  // 4. Si es fase 'validation' o 'active', auto-calcular contribuciones
  if (options?.autoCalculate && ['validation', 'active'].includes(initialPhase)) {
    await calculateContributions(householdId, year, month);
  }

  return ok({ period_id: periodId });
}
```

### 2. Modificar Server Actions

**En todas las acciones que registran transacciones:**

```typescript
export async function createTransaction(formData: FormData): Promise<Result> {
  // ... validación ...

  // ANTES de insertar transacción, asegurar que existe el período
  const periodResult = await ensureMonthlyPeriod(
    householdId,
    year,
    month,
    { phase: 'active', autoCalculate: true }
  );

  if (!periodResult.ok) return periodResult;

  // Ahora sí, insertar transacción con period_id
  await query(
    `INSERT INTO transactions (..., period_id) VALUES (..., $X)`,
    [..., periodResult.data.period_id]
  );

  return ok();
}
```

### 3. Cron Job de Seguridad

```typescript
// scripts/cron/ensure-current-period.ts

import { query } from '@/lib/db';
import { ensureMonthlyPeriod } from '@/lib/periods';

async function main() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  // Obtener todos los hogares activos
  const households = await query(
    `SELECT id FROM households WHERE deleted_at IS NULL`
  );

  for (const household of households.rows) {
    // Asegurar período actual
    await ensureMonthlyPeriod(household.id, year, month, {
      phase: 'active',
      autoCalculate: true
    });

    // Asegurar próximo período en 'preparing'
    await ensureMonthlyPeriod(household.id, nextYear, nextMonth, {
      phase: 'preparing'
    });
  }

  console.log(`✅ Períodos verificados para ${households.rows.length} hogares`);
}

main().catch(console.error);
```

**Ejecutar diariamente con cron:**

```bash
# /etc/cron.d/cuentassik
0 3 * * * kava cd /home/kava/workspace/proyectos/CuentasSiK/repo && NODE_ENV=production node scripts/cron/ensure-current-period.js >> /home/kava/logs/cron-periods.log 2>&1
```

### 4. UI para Gestión Manual

**Nueva página `/app/periods/manage/page.tsx`** (solo Owner):

- **Listar períodos** existentes con su estado
- **Crear período manualmente** para mes específico
- **Reabrir período cerrado** (con confirmación)
- **Eliminar período vacío** (solo si 0 transacciones, 0 contribuciones)

---

## 🧹 Limpieza Inmediata

### Script de Limpieza de Períodos Vacíos

```sql
-- 1. Identificar períodos vacíos (excepto mes actual)
SELECT 
  id, 
  household_id, 
  year || '-' || LPAD(month::text, 2, '0') as periodo,
  phase
FROM monthly_periods mp
WHERE NOT EXISTS (
  SELECT 1 FROM transactions t WHERE t.period_id = mp.id
)
AND NOT EXISTS (
  SELECT 1 FROM contributions c 
  WHERE c.household_id = mp.household_id 
    AND c.year = mp.year 
    AND c.month = mp.month
)
AND (mp.year != EXTRACT(YEAR FROM CURRENT_DATE) OR mp.month != EXTRACT(MONTH FROM CURRENT_DATE))
ORDER BY mp.year, mp.month;

-- 2. Eliminar períodos vacíos confirmados
DELETE FROM monthly_periods
WHERE id IN (
  SELECT mp.id
  FROM monthly_periods mp
  WHERE NOT EXISTS (
    SELECT 1 FROM transactions t WHERE t.period_id = mp.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM contributions c 
    WHERE c.household_id = mp.household_id 
      AND c.year = mp.year 
      AND c.month = mp.month
  )
  AND (mp.year != EXTRACT(YEAR FROM CURRENT_DATE) OR mp.month != EXTRACT(MONTH FROM CURRENT_DATE))
);
```

---

## 🎯 Plan de Implementación

### Fase 1: Limpieza y Diagnóstico ✅
- [x] Identificar períodos vacíos
- [x] Verificar integridad de datos
- [ ] Eliminar períodos vacíos (excepto Oct 2025)
- [ ] Documentar estado actual

### Fase 2: Helper de Creación 🚧
- [ ] Implementar `ensureMonthlyPeriod()` en `lib/periods.ts`
- [ ] Añadir tests unitarios para la función
- [ ] Integrar en acciones existentes (`createTransaction`, etc.)

### Fase 3: Cron Job 📅
- [ ] Crear script `scripts/cron/ensure-current-period.ts`
- [ ] Configurar cron job en servidor
- [ ] Añadir logging y monitoreo

### Fase 4: UI de Gestión 🎨
- [ ] Página `/app/periods/manage`
- [ ] Listado de períodos con indicadores visuales
- [ ] Acciones: Crear, Reabrir, Eliminar
- [ ] Protección de permisos (solo Owner)

### Fase 5: Migración y Documentación 📚
- [ ] Migración para añadir índices necesarios
- [ ] Actualizar AGENTS.md con nuevas reglas
- [ ] Actualizar documentación de flujo de períodos
- [ ] Comunicación a usuarios sobre cambios

---

## 🔒 Reglas de Validación

### Al Crear Período

1. ✅ No puede haber 2 períodos para el mismo household/year/month
2. ✅ Solo períodos pasados pueden crearse en fase 'closed'
3. ✅ Período actual debe crearse en fase 'active'
4. ✅ Períodos futuros deben crearse en fase 'preparing'

### Al Reabrir Período

1. ⚠️ Solo períodos en fase 'closed' pueden reabrirse
2. ⚠️ Requiere confirmación del Owner
3. ⚠️ Se registra en audit log (quién, cuándo, por qué)
4. ⚠️ Recalcula balances tras cambios

### Al Eliminar Período

1. ❌ Solo períodos sin transacciones ni contribuciones
2. ❌ No se puede eliminar período actual
3. ❌ Requiere confirmación del Owner

---

## 📊 Métricas de Éxito

### Antes (Estado Actual)
- 25 períodos totales
- 1 período con datos (4%)
- 24 períodos vacíos (96%)
- Sin estrategia de creación

### Después (Objetivo)
- N períodos = meses con actividad real + 1 (próximo mes)
- ~100% períodos con datos
- Crecimiento orgánico según uso
- Creación automática bajo demanda

---

## 🚀 Próximos Pasos Inmediatos

1. **AHORA**: Ejecutar limpieza de períodos vacíos (excepto Oct 2025)
   ```bash
   psql -h 127.0.0.1 -U cuentassik_user -d cuentassik_dev -f scripts/cleanup_empty_periods.sql
   ```

2. **HOY**: Implementar `ensureMonthlyPeriod()` helper

3. **MAÑANA**: Integrar helper en acciones de transacciones

4. **ESTA SEMANA**: Configurar cron job

5. **PRÓXIMA SEMANA**: UI de gestión de períodos

---

**Última actualización**: 20 Octubre 2025
**Estado del fix de balance**: ✅ Implementado (incluyendo gastos directos en getHouseholdBalancesOverview)
