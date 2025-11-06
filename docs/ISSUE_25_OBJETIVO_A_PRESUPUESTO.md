# Issue #25 - Cambio de Concepto: "Objetivo" → "Presupuesto"

**Fecha Inicio**: 6 Noviembre 2025
**Estado**: 🟡 EN DESARROLLO
**Complejidad**: 🟡 MEDIA-ALTA (refactor conceptual completo)
**Estimación**: 12-16 horas

---

## 🎯 Objetivos del Issue

### Objetivo Principal
Reemplazar el confuso concepto de "objetivo del hogar" por la terminología financiera estándar "presupuesto mensual" en toda la aplicación.

### Objetivos Específicos
1. **Claridad Terminológica**: Usar lenguaje financiero profesional
2. **Coherencia UX**: Alinear UI con conceptos familiares para usuarios
3. **Preparación Futura**: Base para sistema de presupuestos por categoría
4. **Integridad de Datos**: Migrar sin romper funcionalidad existente
5. **Backwards Compatibility**: Mantener datos históricos intactos

---

## 📊 Análisis de Estado Actual

### 1. Estructura de Base de Datos

**Tabla `household_settings`**:
```sql
CREATE TABLE household_settings (
  household_id UUID PRIMARY KEY REFERENCES households(id),
  monthly_contribution_goal NUMERIC(10,2), -- ❌ Nombre confuso
  calculation_type VARCHAR(50),
  currency VARCHAR(3),
  updated_at TIMESTAMPTZ,
  updated_by TEXT
);
```

**Tabla `monthly_periods`**:
```sql
CREATE TABLE monthly_periods (
  id UUID PRIMARY KEY,
  household_id UUID REFERENCES households(id),
  year INT,
  month INT,
  phase period_phase_enum,
  snapshot_contribution_goal NUMERIC(10,2), -- ❌ Snapshot del "objetivo"
  opening_balance NUMERIC(10,2),
  closing_balance NUMERIC(10,2),
  -- ... más campos
);
```

### 2. Uso en Código (100+ referencias)

**Variables encontradas**:
- `monthly_goal` (30 ocurrencias)
- `target_amount` (15 ocurrencias)
- `monthlyGoal` (20 ocurrencias)
- `contribution_goal` (35 ocurrencias)

**Archivos críticos**:
1. `lib/contributions/periods.ts` (cálculo contribuciones)
2. `app/sickness/configuracion/hogar/actions.ts` (CRUD configuración)
3. `app/sickness/periodo/actions.ts` (gestión períodos)
4. `app/api/periods/checklist/route.ts` (validación fases)
5. `app/api/periods/contributions/route.ts` (cálculo contribuciones)
6. `app/sickness/credito-deuda/actions.ts` (gestión créditos/deudas)

### 3. UI Affected Components (15 componentes)

| Componente | Textos a Cambiar | Crítico |
|-----------|------------------|---------|
| `HogarMembersClient.tsx` | "Objetivo mensual" → "Presupuesto mensual" | ✅ Alto |
| `app/sickness/periodo/page.tsx` | "Objetivo común" → "Presupuesto del hogar" | ✅ Alto |
| `app/sickness/configuracion/hogar/page.tsx` | Labels y tooltips | ✅ Alto |
| `AdvancedQueries.tsx` | "Ingresos vs Objetivo" | 🟡 Medio |
| `query-catalog.ts` | Descripciones de queries | 🟡 Medio |

---

## 🎯 Estrategia de Implementación

### Enfoque: Migración Incremental Sin Breaking Changes

**Principios**:
1. ✅ **No eliminar columnas antiguas** (mantener compatibilidad)
2. ✅ **Añadir nuevas columnas** con nombres correctos
3. ✅ **Transición gradual** (código usa ambas durante migración)
4. ✅ **Rollback fácil** (columnas viejas funcionales)
5. ✅ **Testing exhaustivo** entre cada fase

---

## 📝 Plan de Implementación Detallado

### FASE 1: Migración de Base de Datos (3-4 horas)

#### Step 1.1: Crear Migración SQL (1h)

**Archivo**: `database/migrations/20251106_HHMMSS_objetivo_a_presupuesto_phase1.sql`

```sql
-- ============================================
-- Migración: Cambio "Objetivo" → "Presupuesto" (Fase 1)
-- Fecha: 2025-11-06
-- Autor: CuentasSiK Team
-- Issue: #25
-- ============================================

BEGIN;

-- ============================================
-- TABLA 1: household_settings
-- ============================================

-- Añadir nueva columna (NO eliminar la antigua aún)
ALTER TABLE household_settings
  ADD COLUMN monthly_budget NUMERIC(10,2);

COMMENT ON COLUMN household_settings.monthly_budget IS
  'Presupuesto mensual del hogar (reemplaza monthly_contribution_goal)';

-- Copiar datos existentes
UPDATE household_settings
  SET monthly_budget = monthly_contribution_goal
  WHERE monthly_contribution_goal IS NOT NULL;

-- Aplicar constraint NOT NULL (después de copiar datos)
ALTER TABLE household_settings
  ALTER COLUMN monthly_budget SET NOT NULL;

-- Añadir constraint de validación
ALTER TABLE household_settings
  ADD CONSTRAINT check_monthly_budget_positive
  CHECK (monthly_budget >= 0 AND monthly_budget <= 10000000);

-- ============================================
-- TABLA 2: monthly_periods
-- ============================================

-- Añadir nueva columna para snapshot
ALTER TABLE monthly_periods
  ADD COLUMN snapshot_budget NUMERIC(10,2);

COMMENT ON COLUMN monthly_periods.snapshot_budget IS
  'Snapshot del presupuesto mensual al momento de validar/bloquear el período.
   NULL = período en preparing (usa valor actual de household_settings).
   NOT NULL = período validado/cerrado (usa este valor histórico).';

-- Copiar snapshots existentes
UPDATE monthly_periods
  SET snapshot_budget = snapshot_contribution_goal
  WHERE snapshot_contribution_goal IS NOT NULL;

-- ============================================
-- ÍNDICES (si necesario)
-- ============================================

CREATE INDEX IF NOT EXISTS idx_household_settings_budget
  ON household_settings(household_id, monthly_budget)
  WHERE monthly_budget IS NOT NULL;

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Verificar que ambas columnas coinciden
DO $$
DECLARE
  mismatch_count INT;
BEGIN
  SELECT COUNT(*)
  INTO mismatch_count
  FROM household_settings
  WHERE COALESCE(monthly_budget, 0) != COALESCE(monthly_contribution_goal, 0);

  IF mismatch_count > 0 THEN
    RAISE EXCEPTION 'Migración falló: % filas con datos inconsistentes', mismatch_count;
  END IF;

  RAISE NOTICE 'Verificación OK: household_settings migrada correctamente';
END $$;

DO $$
DECLARE
  mismatch_count INT;
BEGIN
  SELECT COUNT(*)
  INTO mismatch_count
  FROM monthly_periods
  WHERE COALESCE(snapshot_budget, 0) != COALESCE(snapshot_contribution_goal, 0);

  IF mismatch_count > 0 THEN
    RAISE EXCEPTION 'Migración falló: % períodos con datos inconsistentes', mismatch_count;
  END IF;

  RAISE NOTICE 'Verificación OK: monthly_periods migrada correctamente';
END $$;

-- ============================================
-- DATOS DE PRUEBA (solo DEV)
-- ============================================

-- Verificar que hay datos
SELECT
  'household_settings' as tabla,
  COUNT(*) as total_filas,
  COUNT(monthly_budget) as con_presupuesto,
  AVG(monthly_budget) as presupuesto_promedio
FROM household_settings

UNION ALL

SELECT
  'monthly_periods' as tabla,
  COUNT(*) as total_filas,
  COUNT(snapshot_budget) as con_snapshot,
  AVG(snapshot_budget) as snapshot_promedio
FROM monthly_periods;

COMMIT;

-- ============================================
-- ROLLBACK (en caso de emergencia)
-- ============================================

/*
BEGIN;

-- Eliminar nuevas columnas
ALTER TABLE household_settings DROP COLUMN IF EXISTS monthly_budget;
ALTER TABLE monthly_periods DROP COLUMN IF EXISTS snapshot_budget;

-- Eliminar índices
DROP INDEX IF EXISTS idx_household_settings_budget;

COMMIT;
*/
```

#### Step 1.2: Aplicar Migración (30 min)

```bash
# 1. Aplicar a TEST primero
./scripts/migrations/apply_migration.sh test 20251106_HHMMSS_objetivo_a_presupuesto_phase1.sql

# 2. Verificar en TEST
psql -h 127.0.0.1 -U cuentassik_user -d test_baseline_v3 -c "
  SELECT
    column_name, data_type, is_nullable
  FROM information_schema.columns
  WHERE table_name = 'household_settings'
    AND column_name IN ('monthly_contribution_goal', 'monthly_budget')
  ORDER BY column_name;
"

# 3. Si OK, aplicar a DEV
./scripts/migrations/apply_migration.sh dev 20251106_HHMMSS_objetivo_a_presupuesto_phase1.sql

# 4. Verificar datos en DEV
psql -h 127.0.0.1 -U cuentassik_user -d cuentassik_dev -c "
  SELECT
    household_id,
    monthly_contribution_goal as viejo,
    monthly_budget as nuevo,
    CASE
      WHEN monthly_contribution_goal = monthly_budget THEN 'OK'
      ELSE 'MISMATCH'
    END as status
  FROM household_settings
  LIMIT 5;
"
```

#### Step 1.3: Regenerar Types (15 min)

```bash
# Regenerar types desde nuevo schema
npm run types:generate:dev

# Verificar que se generaron correctamente
git diff types/database.generated.ts

# Debería mostrar:
# + monthly_budget: Numeric | null;
# (monthly_contribution_goal sigue existiendo)
```

#### Step 1.4: Validación Post-Migración (15 min)

**Checklist de Validación**:

- [ ] Columna `household_settings.monthly_budget` existe
- [ ] Columna `monthly_periods.snapshot_budget` existe
- [ ] Datos copiados correctamente (count coincide)
- [ ] Constraint `check_monthly_budget_positive` aplicado
- [ ] Índices creados
- [ ] Types TypeScript regenerados
- [ ] Compilación limpia: `npm run typecheck`

---

### FASE 2: Actualizar Backend (4-5 horas)

#### Step 2.1: Crear Helper de Transición (1h)

**Archivo**: `lib/budget-migration.ts`

```typescript
/**
 * Helper temporal para transición "objetivo" → "presupuesto"
 *
 * Durante la migración, el código debe leer de ambas columnas:
 * - Primero intenta leer monthly_budget (nuevo)
 * - Si no existe, fallback a monthly_contribution_goal (viejo)
 *
 * Una vez completada la migración, este archivo se eliminará.
 */

import type { Numeric } from '@/types/database.generated';

/**
 * Lee el presupuesto mensual con fallback automático
 */
export function getMonthlyBudget(
  row: {
    monthly_budget?: Numeric | null;
    monthly_contribution_goal?: Numeric | null;
  }
): number {
  // Priorizar nueva columna
  if (row.monthly_budget !== undefined && row.monthly_budget !== null) {
    return typeof row.monthly_budget === 'number'
      ? row.monthly_budget
      : parseFloat(String(row.monthly_budget));
  }

  // Fallback a columna vieja
  if (row.monthly_contribution_goal !== undefined && row.monthly_contribution_goal !== null) {
    return typeof row.monthly_contribution_goal === 'number'
      ? row.monthly_contribution_goal
      : parseFloat(String(row.monthly_contribution_goal));
  }

  return 0;
}

/**
 * Lee el snapshot de presupuesto con fallback automático
 */
export function getSnapshotBudget(
  row: {
    snapshot_budget?: Numeric | null;
    snapshot_contribution_goal?: Numeric | null;
  }
): number | null {
  // Priorizar nueva columna
  if (row.snapshot_budget !== undefined && row.snapshot_budget !== null) {
    return typeof row.snapshot_budget === 'number'
      ? row.snapshot_budget
      : parseFloat(String(row.snapshot_budget));
  }

  // Fallback a columna vieja
  if (row.snapshot_contribution_goal !== undefined && row.snapshot_contribution_goal !== null) {
    return typeof row.snapshot_contribution_goal === 'number'
      ? row.snapshot_contribution_goal
      : parseFloat(String(row.snapshot_contribution_goal));
  }

  return null;
}

/**
 * Escribe presupuesto mensual en AMBAS columnas (durante transición)
 */
export function getWriteBudgetQuery(): string {
  return `
    monthly_budget = $1,
    monthly_contribution_goal = $1
  `;
}

/**
 * Escribe snapshot en AMBAS columnas (durante transición)
 */
export function getWriteSnapshotQuery(): string {
  return `
    snapshot_budget = $1,
    snapshot_contribution_goal = $1
  `;
}
```

#### Step 2.2: Actualizar lib/contributions/periods.ts (1h)

```typescript
// ANTES:
interface PeriodContribution {
  target_amount: number; // ❌
  // ...
}

export async function getContributionForPeriod(
  householdId: string,
  year: number,
  month: number
): Promise<PeriodContribution> {
  // Query con monthly_contribution_goal...
  target_amount: 0, // TODO: Obtener de household_settings
}

// DESPUÉS:
import { getMonthlyBudget, getSnapshotBudget } from '@/lib/budget-migration';

interface PeriodContribution {
  budget: number; // ✅ Nuevo nombre
  // ...
}

export async function getContributionForPeriod(
  householdId: string,
  year: number,
  month: number
): Promise<PeriodContribution> {
  const query = `
    SELECT
      hs.monthly_budget,
      hs.monthly_contribution_goal, -- Fallback temporal
      mp.snapshot_budget,
      mp.snapshot_contribution_goal -- Fallback temporal
    FROM monthly_periods mp
    LEFT JOIN household_settings hs ON hs.household_id = mp.household_id
    WHERE mp.household_id = $1 AND mp.year = $2 AND mp.month = $3
  `;

  const result = await pool.query(query, [householdId, year, month]);
  const row = result.rows[0];

  // Usar helpers con fallback automático
  const budget = getSnapshotBudget(row) ?? getMonthlyBudget(row);

  return {
    budget, // ✅
    // ... resto de campos
  };
}
```

#### Step 2.3: Actualizar Endpoints API (1.5h)

**Archivos a modificar**:

1. `app/api/periods/checklist/route.ts`
2. `app/api/periods/contributions/route.ts`
3. `app/sickness/credito-deuda/actions.ts`

**Patrón de cambio**:

```typescript
// ANTES:
const goalRes = await query<{ monthly_goal: string | null }>(
  `SELECT COALESCE(mp.snapshot_contribution_goal, hs.monthly_contribution_goal) as monthly_goal
   FROM ...`
);
const monthlyGoal = Number(goalRes.rows[0]?.monthly_goal ?? 0);

// DESPUÉS:
import { getMonthlyBudget, getSnapshotBudget } from '@/lib/budget-migration';

const budgetRes = await query<{
  monthly_budget: Numeric | null;
  monthly_contribution_goal: Numeric | null; // Fallback temporal
  snapshot_budget: Numeric | null;
  snapshot_contribution_goal: Numeric | null; // Fallback temporal
}>(
  `SELECT
     hs.monthly_budget,
     hs.monthly_contribution_goal,
     mp.snapshot_budget,
     mp.snapshot_contribution_goal
   FROM monthly_periods mp
   LEFT JOIN household_settings hs ON hs.household_id = mp.household_id
   WHERE ...`
);

const row = budgetRes.rows[0];
const monthlyBudget = getSnapshotBudget(row) ?? getMonthlyBudget(row);
```

#### Step 2.4: Actualizar Server Actions (1h)

**Archivos**:
- `app/sickness/configuracion/hogar/actions.ts`
- `app/sickness/periodo/actions.ts`

**Cambios clave**:

```typescript
// ANTES (actions.ts):
export async function updateHouseholdGoal(
  formData: FormData
): Promise<Result> {
  // ...
  const query = `
    INSERT INTO household_settings (household_id, monthly_contribution_goal, ...)
    VALUES ($1, $2, ...)
    ON CONFLICT (household_id) DO UPDATE
      SET monthly_contribution_goal = $2, ...
  `;
}

// DESPUÉS:
import { getWriteBudgetQuery } from '@/lib/budget-migration';

export async function updateHouseholdBudget(
  formData: FormData
): Promise<Result> {
  // ...

  // Escribir en AMBAS columnas durante transición
  const query = `
    INSERT INTO household_settings (household_id, monthly_budget, monthly_contribution_goal, ...)
    VALUES ($1, $2, $2, ...)
    ON CONFLICT (household_id) DO UPDATE
      SET monthly_budget = $2,
          monthly_contribution_goal = $2,
          ...
  `;

  // O usando helper:
  // SET ${getWriteBudgetQuery()}, ...
}
```

#### Step 2.5: Actualizar Analytics Queries (30 min)

**Archivo**: `app/sickness/analytics/queries-actions.ts`

```typescript
// ANTES:
async function queryIngresosVsObjetivo(pool: Pool, householdId: string): Promise<QueryResult> {
  const query = `
    SELECT
      COALESCE(hs.monthly_contribution_goal, 0) AS objetivo,
      ...
  `;
}

// DESPUÉS:
async function queryIngresosVsPresupuesto(pool: Pool, householdId: string): Promise<QueryResult> {
  const query = `
    SELECT
      COALESCE(hs.monthly_budget, hs.monthly_contribution_goal, 0) AS presupuesto,
      ...
  `;

  // ...

  return {
    columns: ['Año', 'Mes', 'Período', 'Ingresos Reales', 'Presupuesto', 'Diferencia', '% Cumplimiento'],
    // ...
  };
}
```

**También actualizar**:
- `query-catalog.ts`: Cambiar ID `ingresos_vs_objetivo` → `ingresos_vs_presupuesto`
- Actualizar descripciones de queries

#### Step 2.6: Testing Backend (30 min)

**Test Cases**:

1. **Crear nuevo hogar** → Verificar que `monthly_budget` se guarda
2. **Leer hogar existente** → Verificar fallback a `monthly_contribution_goal`
3. **Actualizar presupuesto** → Verificar que ambas columnas se actualizan
4. **Bloquear período** → Verificar que `snapshot_budget` se guarda
5. **Cálculo contribuciones** → Verificar que usa nuevo campo
6. **Query analytics** → Verificar que devuelve datos correctos

```bash
# Ejecutar tests
npm run test:unit -- --grep "budget"

# Testing manual con curl
curl -X POST http://localhost:3001/api/households/settings \
  -H "Content-Type: application/json" \
  -d '{"monthly_budget": 1500.00}'
```

---

### FASE 3: Actualizar Frontend UI (3-4 horas)

#### Step 3.1: Actualizar Componentes de Configuración (1.5h)

**Archivo**: `app/sickness/configuracion/hogar/HogarMembersClient.tsx`

```tsx
// ANTES:
<Label htmlFor="goalInput">Objetivo mensual</Label>
<Input
  id="goalInput"
  type="number"
  step="0.01"
  min="0"
  placeholder="Ej: 1500"
  value={editingGoal !== null ? editingGoal : monthlyGoal || ''}
  onChange={(e) => setEditingGoal(e.target.value)}
/>
<p className="text-xs text-muted-foreground">
  Objetivo actual: {formatCurrency(monthlyGoal || 0)}
</p>

// DESPUÉS:
<Label htmlFor="budgetInput">Presupuesto mensual del hogar</Label>
<Input
  id="budgetInput"
  name="monthly_budget"
  type="number"
  step="0.01"
  min="0"
  max="10000000"
  placeholder="Ej: 1500"
  value={editingBudget !== null ? editingBudget : monthlyBudget || ''}
  onChange={(e) => setEditingBudget(e.target.value)}
  aria-describedby="budget-help"
/>
<p id="budget-help" className="text-xs text-muted-foreground">
  Presupuesto actual: {formatCurrency(monthlyBudget || 0)}
</p>
<p className="text-xs text-muted-foreground mt-1">
  💡 Este es el monto que deseas destinar a gastos comunes cada mes.
</p>
```

**Variables a renombrar**:
```typescript
// ANTES:
const [monthlyGoal, setMonthlyGoal] = useState<number | null>(null);
const [editingGoal, setEditingGoal] = useState<string | null>(null);

// DESPUÉS:
const [monthlyBudget, setMonthlyBudget] = useState<number | null>(null);
const [editingBudget, setEditingBudget] = useState<string | null>(null);
```

**Actions a actualizar**:
```typescript
// ANTES:
const result = await updateHouseholdGoal(formData);

// DESPUÉS:
const result = await updateHouseholdBudget(formData);
```

#### Step 3.2: Actualizar Gestión de Períodos (1h)

**Archivo**: `app/sickness/periodo/page.tsx`

```tsx
// ANTES:
<div>Objetivo común: {data.hasHouseholdGoal ? 'Configurado' : 'No configurado'}</div>

<AlertDescription>
  Configura el objetivo mensual y los ingresos de todos los miembros para poder avanzar.
</AlertDescription>

<ChecklistItem
  label="Objetivo mensual definido"
  done={!!data?.hasHouseholdGoal}
/>

// DESPUÉS:
<div>
  Presupuesto del hogar: {data.hasHouseholdBudget ? (
    <span className="text-green-600 font-medium">
      {formatCurrency(data.monthlyBudget)} configurado
    </span>
  ) : (
    <span className="text-destructive font-medium">No configurado</span>
  )}
</div>

<AlertDescription>
  Configura el presupuesto mensual del hogar y los ingresos de todos los miembros para poder avanzar.
  El sistema calculará automáticamente la contribución de cada miembro según el tipo de cálculo seleccionado.
</AlertDescription>

<ChecklistItem
  label="Presupuesto mensual definido"
  done={!!data?.hasHouseholdBudget}
  description={data?.monthlyBudget ? formatCurrency(data.monthlyBudget) : 'Pendiente'}
/>
```

**Server Action**:
```typescript
// app/sickness/periodo/actions.ts

// ANTES:
export async function getPeriodData(householdId: string) {
  // ...
  const goalRes = await query(`
    SELECT monthly_contribution_goal as goal
    FROM household_settings
    WHERE household_id = $1
  `, [householdId]);

  return {
    hasHouseholdGoal: !!goalRes.rows[0]?.goal,
    // ...
  };
}

// DESPUÉS:
import { getMonthlyBudget } from '@/lib/budget-migration';

export async function getPeriodData(householdId: string) {
  // ...
  const budgetRes = await query<{
    monthly_budget: Numeric | null;
    monthly_contribution_goal: Numeric | null; // Fallback
  }>(`
    SELECT
      monthly_budget,
      monthly_contribution_goal
    FROM household_settings
    WHERE household_id = $1
  `, [householdId]);

  const row = budgetRes.rows[0];
  const monthlyBudget = row ? getMonthlyBudget(row) : 0;

  return {
    hasHouseholdBudget: monthlyBudget > 0,
    monthlyBudget,
    // ...
  };
}
```

#### Step 3.3: Actualizar Textos y Labels Globales (1h)

**Archivos a revisar** (búsqueda global):

```bash
# Buscar todas las referencias a "objetivo"
grep -r "objetivo" app/sickness --include="*.tsx" --include="*.ts"

# Reemplazar en batch (con confirmación manual)
find app/sickness -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/Objetivo mensual/Presupuesto mensual/g'
find app/sickness -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/Objetivo común/Presupuesto del hogar/g'
find app/sickness -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/objetivo del hogar/presupuesto mensual/g'
```

**Componentes principales**:
1. `app/sickness/dashboard/page.tsx` (si muestra presupuesto)
2. `app/sickness/balance/page.tsx` (si compara con presupuesto)
3. `components/periodo/MonthlyPeriodCard.tsx` (si muestra presupuesto)
4. `components/periodo/PendingPeriodsAlert.tsx` (mensajes)

#### Step 3.4: Actualizar Analytics UI (30 min)

**Archivo**: `app/sickness/analytics/query-catalog.ts`

```typescript
// ANTES:
{
  id: 'ingresos_vs_objetivo',
  label: 'Ingresos vs Objetivo',
  description: 'Comparación de ingresos reales con objetivo mensual',
  category: 'ingresos',
  requiresPeriod: false,
},

// DESPUÉS:
{
  id: 'ingresos_vs_presupuesto',
  label: 'Ingresos vs Presupuesto',
  description: 'Comparación de ingresos reales con presupuesto mensual configurado',
  category: 'ingresos',
  requiresPeriod: false,
  documentation: {
    columns: ['Año', 'Mes', 'Período', 'Ingresos Reales', 'Presupuesto', 'Diferencia', '% Cumplimiento'],
    example: 'Nov 2025: Ingresos 2000€, Presupuesto 1500€, +500€ (133% cumplimiento)',
    interpretation: 'Valores positivos indican excedente (ingresos > presupuesto)',
  },
},
```

**Archivo**: `app/sickness/analytics/AdvancedQueries.tsx`

```tsx
// ANTES:
<TabsTrigger value="ingresos">
  <TrendingUp className="mr-2 h-4 w-4" />
  Ingresos
  <Badge variant="outline" className="ml-2">6</Badge>
</TabsTrigger>

// DESPUÉS:
<TabsTrigger value="ingresos">
  <TrendingUp className="mr-2 h-4 w-4" />
  Ingresos y Presupuesto
  <Badge variant="outline" className="ml-2">6</Badge>
</TabsTrigger>

// Actualizar descripciones
<p className="text-sm text-muted-foreground">
  Revisa ingresos y compara con el presupuesto mensual configurado
</p>
```

#### Step 3.5: Testing Frontend (1h)

**Test Cases**:

1. **Configuración de hogar**
   - [ ] Crear nuevo hogar → Configurar presupuesto → Verificar guardado
   - [ ] Editar presupuesto existente → Verificar actualización
   - [ ] Labels y placeholders correctos ("Presupuesto mensual")

2. **Gestión de períodos**
   - [ ] Checklist muestra "Presupuesto mensual definido"
   - [ ] Validación fase 1 → fase 2 requiere presupuesto configurado
   - [ ] Snapshot se guarda al bloquear período

3. **Analytics**
   - [ ] Query "Ingresos vs Presupuesto" ejecuta correctamente
   - [ ] Columnas muestran "Presupuesto" en lugar de "Objetivo"
   - [ ] Datos coinciden con configuración

4. **UI/UX General**
   - [ ] No quedan textos con "objetivo" visible
   - [ ] Tooltips y ayudas contextuales claras
   - [ ] Responsive en móvil

```bash
# Testing manual
npm run dev
# Navegar a /sickness/configuracion/hogar
# Verificar todos los textos
```

---

### FASE 4: Documentación y Testing Final (2 horas)

#### Step 4.1: Actualizar Documentación (1h)

**Archivos a actualizar**:

1. **`docs/GESTION_PERIODOS_MENSUALES.md`**

```markdown
<!-- ANTES -->
## Fase 1: Preparación (setup)
- Configurar **objetivo mensual** en household_settings

<!-- DESPUÉS -->
## Fase 1: Preparación (setup)
- Configurar **presupuesto mensual del hogar** en household_settings
- Este presupuesto se refiere a la cantidad total que el hogar desea destinar a gastos comunes cada mes
```

2. **`database/README.md`**

```markdown
<!-- Añadir sección nueva -->
## Migración "Objetivo" → "Presupuesto" (Issue #25)

**Fecha**: Noviembre 2025

### Cambios de Esquema

**Tabla `household_settings`**:
- ✅ Nueva columna: `monthly_budget` (NUMERIC(10,2))
- ⚠️ Columna legacy: `monthly_contribution_goal` (mantener durante transición)

**Tabla `monthly_periods`**:
- ✅ Nueva columna: `snapshot_budget` (NUMERIC(10,2))
- ⚠️ Columna legacy: `snapshot_contribution_goal` (mantener durante transición)

### Compatibilidad

Durante la transición, el código lee de **ambas columnas** con fallback automático:
1. Intenta leer de `monthly_budget` / `snapshot_budget` (nuevas)
2. Si no existen, fallback a `monthly_contribution_goal` / `snapshot_contribution_goal` (viejas)

Helper: `lib/budget-migration.ts`

### Eliminación de Columnas Legacy

Las columnas antiguas se eliminarán en una migración futura (post-v3.1.0) una vez confirmado que:
- Todos los entornos han migrado
- No hay código legacy usando las columnas viejas
- Testing exhaustivo completado
```

3. **`CHANGELOG.md`**

```markdown
## [3.0.1] - 2025-11-06

### Changed
- **BREAKING (Soft)**: Renombrado concepto "objetivo del hogar" → "presupuesto mensual"
  - UI actualizada con nueva terminología
  - Nuevas columnas DB: `monthly_budget`, `snapshot_budget`
  - Mantiene compatibilidad backwards con columnas antiguas
  - Ver `docs/ISSUE_25_OBJETIVO_A_PRESUPUESTO.md` para detalles

### Added
- Helper temporal `lib/budget-migration.ts` para transición suave
- Validación de presupuesto mejorada (constraints DB)

### Deprecated
- Columnas `monthly_contribution_goal` y `snapshot_contribution_goal` (aún funcionales)
- Se eliminarán en v3.2.0 tras período de gracia

### Migration Notes
- Migración automática de datos existentes
- Zero downtime (columnas viejas siguen funcionando)
- Rollback disponible (ver migración SQL)
```

4. **`AGENTS.md`** (instrucciones para AI)

```markdown
<!-- Actualizar sección de sistema -->
## Sistema troncal a mantener funcional

### Presupuesto Mensual

**Terminología correcta**: "Presupuesto mensual del hogar"
**❌ NO usar**: "objetivo", "target", "goal"

**Columnas DB**:
- `household_settings.monthly_budget` ✅ (usar esta)
- `monthly_periods.snapshot_budget` ✅ (usar esta)

Durante migración temporal (v3.0.1 - v3.1.0):
- Helper `lib/budget-migration.ts` para fallback automático
- Escribir en AMBAS columnas (nueva + legacy)

Post-migración (v3.2.0+):
- Eliminar columnas legacy
- Eliminar helper de migración
```

#### Step 4.2: Testing de Regresión Completo (1h)

**Test Suite Completo**:

```bash
# 1. TypeCheck
npm run typecheck
# Debe pasar sin errores

# 2. Lint
npm run lint
# Debe pasar sin warnings

# 3. Unit Tests
npm run test:unit
# Todos los tests deben pasar

# 4. Build
npm run build
# Debe compilar sin errores

# 5. Testing Manual Crítico
npm run dev
```

**Checklist de Testing Manual**:

**Configuración de Hogar**:
- [ ] Crear nuevo hogar → Configurar presupuesto → ✅ Guardado
- [ ] Editar presupuesto → ✅ Actualización
- [ ] Ver presupuesto en UI → ✅ Texto correcto ("Presupuesto mensual")

**Gestión de Períodos**:
- [ ] Crear nuevo período → ✅ Checklist muestra presupuesto
- [ ] Bloquear período → ✅ Snapshot guardado en `snapshot_budget`
- [ ] Ver período bloqueado → ✅ Usa snapshot correcto

**Contribuciones**:
- [ ] Calcular contribuciones → ✅ Usa presupuesto correcto
- [ ] Verificar montos → ✅ Coinciden con cálculo esperado

**Analytics**:
- [ ] Query "Ingresos vs Presupuesto" → ✅ Ejecuta correctamente
- [ ] Datos históricos → ✅ Usa fallback correcto

**Datos Legacy**:
- [ ] Ver períodos antiguos (pre-migración) → ✅ Fallback funciona
- [ ] Editar período antiguo → ✅ Actualiza ambas columnas

#### Step 4.3: Preparar Rollback Plan (15 min)

**Documento**: `docs/ROLLBACK_PLAN_ISSUE_25.md`

```markdown
# Rollback Plan - Issue #25 (Objetivo → Presupuesto)

## Escenario 1: Problema Detectado Inmediatamente (< 1 hora)

### Git Revert
```bash
# Obtener SHA del último commit antes de la migración
git log --oneline | head -10

# Revertir cambios
git revert <commit_sha_issue_25>
git push origin main

# Reiniciar PM2
pm2 restart cuentassik-prod
```

### Rollback DB (si migración aplicada)
```bash
# Conectar como postgres
sudo -u postgres psql -d cuentassik_prod

BEGIN;

-- Eliminar nuevas columnas
ALTER TABLE household_settings DROP COLUMN IF EXISTS monthly_budget;
ALTER TABLE monthly_periods DROP COLUMN IF EXISTS snapshot_budget;

-- Verificar
SELECT column_name FROM information_schema.columns
WHERE table_name = 'household_settings'
ORDER BY column_name;

COMMIT;
```

## Escenario 2: Problema Detectado Después (> 1 hora, datos nuevos)

### NO Revertir Git (hay datos nuevos en columnas nuevas)

### Hotfix Forward
1. Copiar datos de `monthly_budget` → `monthly_contribution_goal`
2. Actualizar código para leer de columnas viejas temporalmente
3. Investigar problema real
4. Fix proper + re-deploy

### Comandos
```sql
-- Copiar datos para no perderlos
UPDATE household_settings
  SET monthly_contribution_goal = monthly_budget
  WHERE monthly_budget IS NOT NULL;

UPDATE monthly_periods
  SET snapshot_contribution_goal = snapshot_budget
  WHERE snapshot_budget IS NOT NULL;
```

## Escenario 3: Testing Fallido en DEV

### Simplemente no promocionar a PROD
- Investigar en DEV
- Corregir problema
- Re-testear
- NO aplicar a PROD hasta confirmar

## Contactos Emergencia
- GitHub Issues: Crear issue con tag `critical` + `rollback`
- Logs: `pm2 logs cuentassik-prod --lines 100`
```

---

### FASE 5: Deploy y Monitoreo (1-2 horas)

#### Step 5.1: Deploy a Desarrollo (30 min)

```bash
# 1. Commit todos los cambios
git status
git add database/migrations/ lib/ app/ components/ types/ docs/
git commit -m "feat(database): cambio concepto 'objetivo' → 'presupuesto' (#25)

BREAKING CHANGE: Renombrado conceptual en toda la app
- Nueva columna: household_settings.monthly_budget
- Nueva columna: monthly_periods.snapshot_budget
- Mantiene compatibilidad con columnas legacy
- Helper temporal: lib/budget-migration.ts
- UI actualizada con nueva terminología

Refs #25"

# 2. Push a GitHub
git push origin main

# 3. Reiniciar DEV con nueva migración
./scripts/migrations/apply_migration.sh dev 20251106_HHMMSS_objetivo_a_presupuesto_phase1.sql

# 4. Reiniciar servidor DEV
pm2 restart cuentassik-dev

# 5. Verificar logs
pm2 logs cuentassik-dev --lines 50
```

#### Step 5.2: Testing en Desarrollo (30 min)

**Checklist Completo**:

**Smoke Tests**:
- [ ] Aplicación carga sin errores
- [ ] Login funciona
- [ ] Dashboard se renderiza

**Funcionalidad Core**:
- [ ] Configurar presupuesto nuevo hogar
- [ ] Editar presupuesto hogar existente
- [ ] Crear nuevo período mensual
- [ ] Calcular contribuciones
- [ ] Bloquear período (guarda snapshot)

**Datos Legacy**:
- [ ] Ver períodos antiguos (usa fallback)
- [ ] Analytics con datos históricos

**UI/UX**:
- [ ] No hay textos "objetivo" visibles
- [ ] Tooltips claros
- [ ] Mensajes de error apropiados

#### Step 5.3: Deploy a Producción (30 min)

```bash
# 1. Backup OBLIGATORIO
sudo -u postgres pg_dump -d cuentassik_prod > ~/backups/prod_pre_issue25_$(date +%Y%m%d_%H%M%S).sql

# 2. Aplicar migración en PROD
./scripts/migrations/apply_migration.sh prod 20251106_HHMMSS_objetivo_a_presupuesto_phase1.sql

# 3. Build + Deploy
npm run build
pm2 restart cuentassik-prod

# 4. Verificar logs
pm2 logs cuentassik-prod --lines 50 --nostream

# Buscar errores:
pm2 logs cuentassik-prod --err --lines 100 | grep -i "error\|exception\|fail"
```

#### Step 5.4: Monitoreo Post-Deploy (30 min)

**Checklist de Monitoreo**:

**Métricas**:
- [ ] Aplicación responde (health check)
- [ ] Tiempo respuesta normal (< 500ms)
- [ ] Sin errores en logs (primeros 5 minutos)

**Funcionalidad Crítica**:
- [ ] Login users reales → ✅
- [ ] Ver dashboard → ✅
- [ ] Configurar presupuesto → ✅
- [ ] Calcular contribuciones → ✅

**Datos**:
- [ ] Presupuestos existentes visibles
- [ ] Períodos bloqueados con snapshots correctos
- [ ] Datos históricos intactos

**Comandos de Monitoreo**:

```bash
# 1. Health check
curl http://localhost:3000/api/health

# 2. Ver logs en tiempo real (5 min)
pm2 logs cuentassik-prod --timestamp

# 3. Verificar datos en DB
psql -h 127.0.0.1 -U cuentassik_user -d cuentassik_prod -c "
  SELECT
    COUNT(*) as total_hogares,
    COUNT(monthly_budget) as con_presupuesto_nuevo,
    COUNT(monthly_contribution_goal) as con_objetivo_viejo,
    AVG(monthly_budget) as presupuesto_promedio
  FROM household_settings;
"

# 4. Verificar períodos
psql -h 127.0.0.1 -U cuentassik_user -d cuentassik_prod -c "
  SELECT
    COUNT(*) as total_periodos,
    COUNT(snapshot_budget) as con_snapshot_nuevo,
    COUNT(snapshot_contribution_goal) as con_snapshot_viejo,
    phase,
    COUNT(*) as count_por_fase
  FROM monthly_periods
  GROUP BY phase
  ORDER BY phase;
"
```

---

## 📊 Resumen de Cambios

### Base de Datos
- ✅ Nueva columna: `household_settings.monthly_budget`
- ✅ Nueva columna: `monthly_periods.snapshot_budget`
- ⚠️ Mantiene: `monthly_contribution_goal` y `snapshot_contribution_goal` (transición)

### Backend (6 archivos)
- ✅ `lib/budget-migration.ts` (nuevo helper)
- ✅ `lib/contributions/periods.ts` (usa nuevo campo)
- ✅ `app/api/periods/checklist/route.ts` (actualizado)
- ✅ `app/api/periods/contributions/route.ts` (actualizado)
- ✅ `app/sickness/credito-deuda/actions.ts` (actualizado)
- ✅ `app/sickness/configuracion/hogar/actions.ts` (actualizado)
- ✅ `app/sickness/periodo/actions.ts` (actualizado)
- ✅ `app/sickness/analytics/queries-actions.ts` (actualizado)

### Frontend (8 componentes)
- ✅ `HogarMembersClient.tsx` (labels + variables)
- ✅ `app/sickness/periodo/page.tsx` (textos + checklist)
- ✅ `app/sickness/analytics/query-catalog.ts` (IDs + descripciones)
- ✅ `AdvancedQueries.tsx` (tabs + descripciones)

### Documentación (4 archivos)
- ✅ `docs/GESTION_PERIODOS_MENSUALES.md` (terminología)
- ✅ `database/README.md` (sección migración)
- ✅ `CHANGELOG.md` (v3.0.1 entry)
- ✅ `AGENTS.md` (instrucciones AI actualizadas)

---

## 🎯 Criterios de Éxito

### Funcionales
- [ ] ✅ Nuevos hogares usan `monthly_budget`
- [ ] ✅ Hogares existentes funcionan (fallback automático)
- [ ] ✅ Bloquear período guarda snapshot correcto
- [ ] ✅ Cálculo contribuciones usa presupuesto correcto
- [ ] ✅ Analytics muestra datos correctos

### Técnicos
- [ ] ✅ TypeScript compila sin errores
- [ ] ✅ Lint pasa sin warnings
- [ ] ✅ Tests unitarios pasan
- [ ] ✅ Build producción exitoso
- [ ] ✅ Zero downtime (rollback disponible)

### UX
- [ ] ✅ No hay textos "objetivo" visibles
- [ ] ✅ Labels claros ("Presupuesto mensual del hogar")
- [ ] ✅ Tooltips informativos
- [ ] ✅ Mensajes de error apropiados

### Datos
- [ ] ✅ 100% hogares migrados correctamente
- [ ] ✅ 100% períodos con snapshots correctos
- [ ] ✅ Datos históricos intactos
- [ ] ✅ Queries analytics funcionan

---

## ⏱️ Timeline Estimado

| Fase | Duración | Acumulado |
|------|----------|-----------|
| 1. Migración DB | 3-4h | 3-4h |
| 2. Backend | 4-5h | 7-9h |
| 3. Frontend | 3-4h | 10-13h |
| 4. Documentación + Testing | 2h | 12-15h |
| 5. Deploy + Monitoreo | 1-2h | 13-17h |

**Total estimado**: 12-17 horas

**Con contingencia (+20%)**: 14-20 horas

---

## 🚨 Riesgos y Mitigación

### Riesgo 1: Datos Inconsistentes Post-Migración
**Probabilidad**: Baja
**Impacto**: Alto
**Mitigación**:
- Verificaciones SQL en migración
- Testing exhaustivo en TEST/DEV antes de PROD
- Rollback plan documentado

### Riesgo 2: Código Legacy No Actualizado
**Probabilidad**: Media
**Impacto**: Medio
**Mitigación**:
- Búsqueda global exhaustiva (`grep -r "objetivo"`)
- Helper de fallback automático
- Code review completo

### Riesgo 3: Breaking Change para Usuarios
**Probabilidad**: Baja
**Impacto**: Bajo
**Mitigación**:
- Cambio solo afecta terminología (no funcionalidad)
- Testing UX completo
- Documentación clara

### Riesgo 4: Performance Degradado
**Probabilidad**: Muy Baja
**Impacto**: Bajo
**Mitigación**:
- Índices creados en migración
- Queries optimizadas (no N+1)
- Monitoreo post-deploy

---

## ✅ Checklist Final

### Pre-Deploy
- [ ] Migración SQL revisada y probada
- [ ] TypeScript compila sin errores
- [ ] Lint pasa sin warnings
- [ ] Tests unitarios pasan
- [ ] Búsqueda global de "objetivo" completada
- [ ] Documentación actualizada
- [ ] Rollback plan documentado

### Deploy DEV
- [ ] Migración aplicada exitosamente
- [ ] Types regenerados
- [ ] Servidor reiniciado
- [ ] Smoke tests pasados
- [ ] Funcionalidad core verificada

### Deploy PROD
- [ ] Backup realizado
- [ ] Migración aplicada exitosamente
- [ ] Build exitoso
- [ ] Servidor reiniciado
- [ ] Logs sin errores (primeros 5 min)
- [ ] Health checks OK
- [ ] Funcionalidad crítica verificada

### Post-Deploy
- [ ] Monitoreo primeras 24h
- [ ] Issue #25 cerrada en GitHub
- [ ] Commit pusheado
- [ ] Changelog actualizado
- [ ] Documentación actualizada en repo

---

**Estado Final**: ✅ LISTO PARA IMPLEMENTACIÓN

**Próximos Pasos**:
1. Comenzar con Fase 1 (Migración DB)
2. Validar cada paso antes de continuar
3. Testing exhaustivo en cada fase
4. Deploy a DEV → Verificar → Deploy a PROD

---

**Última actualización**: 6 Noviembre 2025
