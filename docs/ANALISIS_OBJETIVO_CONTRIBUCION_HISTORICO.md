# Análisis: Problema de Objetivo de Contribución Afectando Histórico

**Fecha**: 18 de Enero 2025
**Autor**: AI Assistant
**Prioridad**: 🔴 **CRÍTICA**

---

## 🚨 Problema Identificado

Al cambiar `household_settings.monthly_contribution_goal` de **1200€ a 1100€**, este cambio afecta **TODOS los períodos**, incluyendo aquellos que ya están bloqueados/cerrados.

### Comportamiento Esperado vs Actual

| Escenario | Esperado | Actual |
|-----------|----------|---------|
| **Período en fase "preparing"** | ✅ Usa nuevo objetivo (1100€) | ✅ Usa nuevo objetivo |
| **Período bloqueado en "validation"** | ❌ Preserva objetivo histórico (1200€) | ⚠️ **USA nuevo objetivo (1100€)** |
| **Período cerrado "closed"** | ❌ Preserva objetivo histórico (1200€) | ⚠️ **USA nuevo objetivo (1100€)** |

### Impacto

1. **Integridad Histórica Rota**: Los cálculos de contribuciones de períodos pasados cambian retroactivamente
2. **Inconsistencia de Datos**: Los valores `expected_amount` en tabla `contributions` pueden no coincidir con el objetivo usado al momento de bloqueo
3. **Auditoría Imposible**: No se puede determinar qué objetivo se usó en cada período histórico
4. **Reportes Incorrectos**: Los informes de períodos pasados mostrarán valores actualizados, no los históricos

---

## 🏗️ Arquitectura Actual

### Estructura de Datos

```
┌─────────────────────────┐
│  household_settings     │
├─────────────────────────┤
│ household_id (PK)       │
│ monthly_contribution_    │
│   goal: NUMERIC         │ ← ⚠️ ÚNICO VALOR GLOBAL
│ calculation_type: TEXT  │
│ currency: TEXT          │
│ updated_at              │
│ updated_by              │
└─────────────────────────┘
           │
           │ FK household_id
           ↓
┌─────────────────────────┐
│  monthly_periods        │
├─────────────────────────┤
│ id (PK)                 │
│ household_id            │
│ year, month             │
│ phase: ENUM             │ ← preparing → validation → active → closing → closed
│ contribution_disabled   │
│ opening_balance         │
│ closing_balance         │
│ ...                     │
└─────────────────────────┘
           │
           │ household_id + year + month
           ↓
┌─────────────────────────┐
│  contributions          │
├─────────────────────────┤
│ id (PK)                 │
│ household_id            │
│ profile_id              │
│ year, month             │
│ expected_amount         │ ← Calculado con monthly_contribution_goal
│ paid_amount             │
│ status                  │
│ calculation_method      │
└─────────────────────────┘
```

### Flujo Actual de Cálculo

**Cuando se bloquea un período** (`lockPeriod()` en `app/sickness/periodo/actions.ts`):

```typescript
// 1. Se llama a SQL lock_contributions_period(household_id, period_id, locked_by)
// 2. Dentro de la función SQL, se genera/actualiza tabla contributions
// 3. El cálculo usa SIEMPRE el valor ACTUAL de household_settings.monthly_contribution_goal
```

**Cuando se muestra un período histórico**:

```typescript
// 1. Se consulta household_settings.monthly_contribution_goal
const monthlyGoal = Number(settingsRes.rows[0]?.monthly_contribution_goal ?? 0);

// 2. Se usa este valor para calcular porcentajes, visualizaciones, etc.
// 3. NO hay referencia al valor histórico usado al momento de bloqueo
```

### Lugares donde se lee `monthly_contribution_goal`

Búsqueda en codebase reveló **6 lugares críticos**:

1. **`lib/contributions/periods.ts`** (línea 187)
   - `calculateContributionsWithDirectExpenses()` - Cálculo base de contribuciones

2. **`app/api/periods/checklist/route.ts`** (línea 71)
   - Checklist de preparación de período

3. **`app/api/periods/contributions/route.ts`** (línea 62)
   - API que devuelve contribuciones de un período

4. **`app/sickness/configuracion/hogar/page.tsx`** (línea 33)
   - Página de configuración del hogar

5. **`app/sickness/credito-deuda/actions.ts`** (líneas 117, 352)
   - Cálculo de créditos/deudas entre miembros

**TODOS estos lugares usan el valor ACTUAL de `household_settings`, no el histórico.**

---

## 💡 Solución Propuesta

### Opción 1: Snapshot en `monthly_periods` (RECOMENDADA)

**Añadir columna `snapshot_contribution_goal` a tabla `monthly_periods`:**

```sql
ALTER TABLE monthly_periods
ADD COLUMN snapshot_contribution_goal NUMERIC(10,2) DEFAULT NULL;

COMMENT ON COLUMN monthly_periods.snapshot_contribution_goal IS
  'Snapshot del objetivo de contribución al momento de bloquear el período.
   NULL = período en preparing (usa valor actual de household_settings).
   NOT NULL = período bloqueado/cerrado (usa este valor histórico).';
```

**Lógica de uso:**

```typescript
// Al bloquear período (preparing → validation):
UPDATE monthly_periods
SET
  snapshot_contribution_goal = (SELECT monthly_contribution_goal FROM household_settings WHERE household_id = $1),
  phase = 'validation',
  locked_at = NOW(),
  locked_by = $2
WHERE id = $3;

// Al leer período:
const goal = period.snapshot_contribution_goal ?? currentSettings.monthly_contribution_goal;
```

**Ventajas:**
- ✅ Cambio mínimo en schema (1 columna)
- ✅ Preserva integridad histórica por período
- ✅ Fácil de consultar (está en la misma tabla de períodos)
- ✅ Lógica simple: NULL = usa actual, NOT NULL = usa snapshot

**Desventajas:**
- ⚠️ Requiere migración y update de todos los registros existentes
- ⚠️ Necesita modificar 6+ lugares en código para usar snapshot vs actual

---

### Opción 2: Columnas adicionales en `contributions`

**Añadir columnas a cada registro de contribución:**

```sql
ALTER TABLE contributions
ADD COLUMN snapshot_contribution_goal NUMERIC(10,2),
ADD COLUMN snapshot_calculation_type TEXT;
```

**Ventajas:**
- ✅ Snapshot por miembro (más granular)
- ✅ Preserva también el método de cálculo histórico

**Desventajas:**
- ❌ Duplicación de datos (mismo snapshot repetido N veces por período)
- ❌ Más complejo de mantener (más columnas)
- ❌ Queries más lentas (tabla contributions es más grande)

---

### Opción 3: Nueva tabla `period_settings_snapshots`

**Crear tabla dedicada:**

```sql
CREATE TABLE period_settings_snapshots (
  period_id UUID PRIMARY KEY REFERENCES monthly_periods(id),
  snapshot_contribution_goal NUMERIC(10,2),
  snapshot_calculation_type TEXT,
  snapshotted_at TIMESTAMPTZ DEFAULT NOW(),
  snapshotted_by UUID REFERENCES profiles(id)
);
```

**Ventajas:**
- ✅ Separación de concerns
- ✅ Puede almacenar settings complejos (jsonb)
- ✅ No modifica tablas existentes

**Desventajas:**
- ❌ JOIN adicional en TODAS las queries de períodos
- ❌ Más complejidad arquitectónica
- ❌ Overhead de crear/mantener nueva tabla

---

## 🎯 Decisión Recomendada

### **OPCIÓN 1: Snapshot en `monthly_periods`**

**Justificación:**
1. Simplicidad: 1 columna, lógica clara
2. Performance: No requiere JOINs adicionales
3. Compatibilidad: Fácil migrar períodos existentes (NULL = sin snapshot)
4. Mantenibilidad: Cambio localizado en pocas funciones

---

## 📋 Plan de Implementación

### Fase 1: Migración de Schema

**Archivo**: `database/migrations/development/20250118_snapshot_contribution_goal.sql`

```sql
-- =====================================================
-- FASE 1: Añadir columna snapshot_contribution_goal
-- =====================================================

BEGIN;

-- 1. Añadir columna
ALTER TABLE monthly_periods
ADD COLUMN IF NOT EXISTS snapshot_contribution_goal NUMERIC(10,2) DEFAULT NULL;

-- 2. Comentario explicativo
COMMENT ON COLUMN monthly_periods.snapshot_contribution_goal IS
  'Snapshot del objetivo de contribución al momento de bloquear el período.
   NULL = período en preparing (usa valor actual de household_settings).
   NOT NULL = período bloqueado/cerrado (usa este valor histórico).';

-- 3. Poblar períodos existentes bloqueados con valor actual
-- NOTA: Esto es una aproximación; no podemos recuperar el valor histórico real
UPDATE monthly_periods mp
SET snapshot_contribution_goal = hs.monthly_contribution_goal
FROM household_settings hs
WHERE mp.household_id = hs.household_id
  AND mp.phase IN ('validation', 'active', 'closing', 'closed')
  AND mp.snapshot_contribution_goal IS NULL;

-- 4. Log de cambios
INSERT INTO _migrations (migration_name, description)
VALUES ('20250118_snapshot_contribution_goal.sql', 'Añade snapshot de objetivo de contribución al bloquear períodos');

COMMIT;
```

**⚠️ IMPORTANTE**: Los períodos ya bloqueados se poblarán con el valor **ACTUAL** de `household_settings`, no el histórico (que no podemos recuperar). Esto mantiene la consistencia futura pero no corrige el pasado.

---

### Fase 2: Modificar función SQL `lock_contributions_period`

**Ubicación**: Función SQL en PostgreSQL (buscar en migraciones aplicadas)

```sql
-- Modificar función para guardar snapshot al bloquear
CREATE OR REPLACE FUNCTION public.lock_contributions_period(
  p_household_id UUID,
  p_period_id UUID,
  p_locked_by UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_phase TEXT;
  v_year INT;
  v_month INT;
  v_contribution_goal NUMERIC;
BEGIN
  -- 1. Obtener datos del período
  SELECT phase, year, month INTO v_phase, v_year, v_month
  FROM monthly_periods
  WHERE id = p_period_id AND household_id = p_household_id;

  IF v_phase IS NULL THEN
    RAISE EXCEPTION 'Período no encontrado';
  END IF;

  IF v_phase != 'preparing' THEN
    RAISE EXCEPTION 'El período no está en fase de preparación (fase actual: %)', v_phase;
  END IF;

  -- 2. Obtener objetivo actual de household_settings
  SELECT monthly_contribution_goal INTO v_contribution_goal
  FROM household_settings
  WHERE household_id = p_household_id;

  -- 3. Guardar snapshot y cambiar fase
  UPDATE monthly_periods
  SET
    phase = 'validation',
    snapshot_contribution_goal = v_contribution_goal,  -- ← NUEVO
    locked_at = NOW(),
    locked_by = p_locked_by,
    updated_at = NOW()
  WHERE id = p_period_id;

  -- 4. Generar/actualizar contribuciones usando el snapshot
  -- ... (resto de lógica existente)

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### Fase 3: Modificar Server Action `lockPeriod`

**Archivo**: `app/sickness/periodo/actions.ts`

```typescript
export async function lockPeriod(
  periodId: string,
  contributionDisabled = false,
): Promise<Result<{ periodId: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return fail('No autenticado');

    const householdId = await getUserHouseholdId();
    if (!householdId) return fail('No tienes un hogar activo');

    // Pre-chequeo de fase
    const phaseRes = await query<{ phase: string }>(
      `SELECT phase::text AS phase FROM monthly_periods WHERE id = $1 AND household_id = $2`,
      [periodId, householdId],
    );

    const currentPhase = phaseRes.rows[0]?.phase ?? null;
    if (!currentPhase || currentPhase !== 'preparing') {
      return fail(`Fase actual no permite bloqueo: ${currentPhase}`);
    }

    if (contributionDisabled) {
      // Flujo sin contribuciones: NO guardar snapshot (no aplica)
      await query(
        `UPDATE monthly_periods
         SET contribution_disabled = TRUE,
             phase = 'validation',
             snapshot_contribution_goal = NULL,  -- ← Explícito
             updated_at = NOW()
         WHERE id = $1 AND household_id = $2`,
        [periodId, householdId],
      );

      // Crear contribuciones a 0€
      await query(
        `INSERT INTO contributions (household_id, profile_id, year, month, expected_amount, paid_amount, status)
         SELECT $1, hm.profile_id, mp.year, mp.month, 0, 0, 'paid'
         FROM monthly_periods mp
         CROSS JOIN household_members hm
         WHERE mp.id = $2
           AND mp.household_id = $1
           AND hm.household_id = $1
         ON CONFLICT (household_id, profile_id, year, month)
         DO UPDATE SET
           expected_amount = 0,
           paid_amount = 0,
           status = 'paid',
           updated_at = NOW()`,
        [householdId, periodId],
      );

      revalidatePath('/sickness');
      revalidatePath('/sickness/periodo');
      return ok({ periodId });
    }

    // Flujo normal: Obtener objetivo actual para guardar snapshot
    const settingsRes = await query<{ monthly_contribution_goal: string | null }>(
      `SELECT monthly_contribution_goal FROM household_settings WHERE household_id = $1`,
      [householdId],
    );

    const snapshotGoal = Number(settingsRes.rows[0]?.monthly_contribution_goal ?? 0);
    if (snapshotGoal <= 0) {
      return fail('Configura primero el objetivo mensual en Configuración > Hogar');
    }

    // ⚠️ NUEVO: Guardar snapshot ANTES de llamar a lock_contributions_period
    await query(
      `UPDATE monthly_periods
       SET snapshot_contribution_goal = $1, updated_at = NOW()
       WHERE id = $2 AND household_id = $3`,
      [snapshotGoal, periodId, householdId],
    );

    // Llamar función SQL (ahora el snapshot ya está guardado)
    const { rows } = await query(
      `SELECT lock_contributions_period($1, $2, $3) AS locked`,
      [householdId, periodId, user.profile_id],
    );

    if (rows[0]?.locked) {
      // Reconciliar balances...
      // (resto de lógica existente)

      revalidatePath('/sickness');
      revalidatePath('/sickness/periodo');
      return ok({ periodId });
    }

    return fail('No se pudo bloquear el período');
  } catch (error) {
    console.error('[lockPeriod] Error:', error);
    return fail(formatPgError(error));
  }
}
```

---

### Fase 4: Modificar Queries de Lectura (6 lugares)

**Patrón general a aplicar:**

```typescript
// ANTES (usa valor actual siempre):
const settingsRes = await query(
  `SELECT monthly_contribution_goal FROM household_settings WHERE household_id = $1`,
  [householdId]
);
const monthlyGoal = Number(settingsRes.rows[0]?.monthly_contribution_goal ?? 0);

// DESPUÉS (usa snapshot si existe):
const goalRes = await query(
  `SELECT
     COALESCE(mp.snapshot_contribution_goal, hs.monthly_contribution_goal) as monthly_goal
   FROM monthly_periods mp
   LEFT JOIN household_settings hs ON hs.household_id = mp.household_id
   WHERE mp.id = $1`,
  [periodId]
);
const monthlyGoal = Number(goalRes.rows[0]?.monthly_goal ?? 0);
```

**Lugares a modificar:**

1. ✅ `lib/contributions/periods.ts` - `calculateContributionsWithDirectExpenses()`
2. ✅ `app/api/periods/checklist/route.ts` - Checklist GET
3. ✅ `app/api/periods/contributions/route.ts` - Contributions GET
4. ✅ `app/sickness/configuracion/hogar/page.tsx` - Página configuración (NO cambiar, usa valor actual OK)
5. ✅ `app/sickness/credito-deuda/actions.ts` (2 lugares) - Créditos/deudas

**⚠️ NOTA**: El punto 4 (configuración) debe seguir usando el valor ACTUAL de `household_settings`, no el snapshot, porque es la configuración global del hogar.

---

### Fase 5: Testing

**Escenarios de prueba:**

1. **Período nuevo en "preparing"**
   - Cambiar objetivo global → Verificar que usa nuevo valor
   - Bloquear período → Verificar que se guarda snapshot

2. **Período bloqueado con snapshot**
   - Cambiar objetivo global → Verificar que período usa snapshot (valor antiguo)
   - Visualizar contribuciones → Verificar cálculos con snapshot

3. **Período sin snapshot (legacy)**
   - Verificar que usa valor actual (fallback)
   - Logs de warning si período bloqueado sin snapshot

4. **Migración de períodos existentes**
   - Verificar que períodos bloqueados tienen snapshot poblado
   - Verificar que períodos "preparing" tienen NULL

---

## 📊 Impacto Estimado

### Archivos a Modificar

| Archivo | Tipo | Cambio | Complejidad |
|---------|------|--------|-------------|
| `database/migrations/development/20250118_*.sql` | Nuevo | Migración schema | 🟢 Baja |
| `database/.../lock_contributions_period.sql` | Editar | Añadir snapshot en UPDATE | 🟢 Baja |
| `app/sickness/periodo/actions.ts` | Editar | lockPeriod() guardar snapshot | 🟡 Media |
| `lib/contributions/periods.ts` | Editar | Usar snapshot vs actual | 🟡 Media |
| `app/api/periods/checklist/route.ts` | Editar | Usar snapshot vs actual | 🟢 Baja |
| `app/api/periods/contributions/route.ts` | Editar | Usar snapshot vs actual | 🟡 Media |
| `app/sickness/credito-deuda/actions.ts` | Editar | Usar snapshot vs actual (2x) | 🟡 Media |

**Total**: 1 archivo nuevo + 6 archivos editados

### Riesgo de Regresión

- 🟢 **Bajo**: Cambio aditivo (añade columna, no elimina)
- 🟡 **Medio**: Requiere update de lógica en múltiples lugares
- 🔴 **Alto**: Datos existentes se poblarán con valor aproximado (no histórico real)

---

## ⚠️ Limitaciones y Advertencias

### Datos Históricos No Recuperables

**Los períodos ya bloqueados antes de esta implementación NO tienen el valor histórico real.**

Cuando ejecutemos la migración, poblaremos `snapshot_contribution_goal` con el valor **actual** de `household_settings`. Esto significa:

```
Ejemplo:
- Octubre 2024 bloqueado cuando goal era 1200€
- Noviembre 2024 bloqueado cuando goal era 1200€
- Diciembre 2024 bloqueado cuando goal era 1200€
- Usuario cambió goal a 1100€ en Enero 2025

Después de migración:
- Octubre 2024: snapshot = 1100€ (❌ debería ser 1200€, pero no lo sabemos)
- Noviembre 2024: snapshot = 1100€ (❌ debería ser 1200€, pero no lo sabemos)
- Diciembre 2024: snapshot = 1100€ (❌ debería ser 1200€, pero no lo sabemos)
```

**Solución Manual**: Si el usuario recuerda los valores históricos, puede corregirlos manualmente con:

```sql
UPDATE monthly_periods
SET snapshot_contribution_goal = 1200
WHERE year = 2024
  AND month IN (10, 11, 12)
  AND household_id = 'xxx';
```

---

## 📝 Checklist de Implementación

- [ ] Crear migración SQL (`20250118_snapshot_contribution_goal.sql`)
- [ ] Aplicar migración a DEV
- [ ] Verificar columna creada y períodos poblados
- [ ] Modificar función SQL `lock_contributions_period` (si existe como migración)
- [ ] Modificar `app/sickness/periodo/actions.ts` (`lockPeriod()`)
- [ ] Modificar `lib/contributions/periods.ts` (`calculateContributionsWithDirectExpenses()`)
- [ ] Modificar `app/api/periods/checklist/route.ts`
- [ ] Modificar `app/api/periods/contributions/route.ts`
- [ ] Modificar `app/sickness/credito-deuda/actions.ts` (2 lugares)
- [ ] Testing en DEV:
  - [ ] Crear período nuevo en preparing
  - [ ] Cambiar objetivo global
  - [ ] Verificar que preparing usa nuevo valor
  - [ ] Bloquear período
  - [ ] Verificar snapshot guardado
  - [ ] Cambiar objetivo global otra vez
  - [ ] Verificar que período bloqueado usa snapshot (valor antiguo)
- [ ] Documentar cambios en CHANGELOG.md
- [ ] Promover migración a `tested/`
- [ ] Aplicar a PRODUCCIÓN (ESCENARIO 2)
- [ ] Verificar períodos existentes poblados correctamente
- [ ] Monitorear logs de errores

---

## 🔗 Referencias

- **Tabla afectada**: `monthly_periods`
- **Configuración global**: `household_settings.monthly_contribution_goal`
- **Registros calculados**: `contributions.expected_amount`
- **Función SQL crítica**: `lock_contributions_period()`
- **Server Action principal**: `lockPeriod()` en `app/sickness/periodo/actions.ts`

---

## 💬 Preguntas Abiertas

1. **¿Corregir manualmente períodos históricos?**
   - Usuario debe decidir si vale la pena corregir períodos ya cerrados
   - Si no recuerda valores exactos, mantener valor actual (consistencia futura)

2. **¿Snapshot también del `calculation_type`?**
   - Por ahora NO incluido en propuesta
   - Si se desea, añadir otra columna `snapshot_calculation_type TEXT`

3. **¿Validación al cambiar objetivo global?**
   - Podríamos mostrar warning: "Este cambio solo afecta períodos nuevos"
   - ¿Implementar confirmación en UI?

4. **¿Migración reversible?**
   - Sí: `ALTER TABLE monthly_periods DROP COLUMN IF EXISTS snapshot_contribution_goal;`
   - Pero se pierde el snapshot (no crítico si no se ha desplegado a PROD)

---

**Última actualización**: 18 de Enero 2025, 01:45
**Pendiente de aprobación**: ✅ Esperando decisión del usuario
