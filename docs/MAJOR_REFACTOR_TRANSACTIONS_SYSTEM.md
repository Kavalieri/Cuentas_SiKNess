# 🏗️ Major Refactor: Sistema de Transacciones Robusto

**Fecha**: 5 de octubre de 2025  
**Última actualización**: 6 de octubre de 2025  
**Estado**: ✅ **IMPLEMENTADO (7 de 9 problemas resueltos)** ⭐  
**Impacto**: 🔴 BREAKING CHANGES - Wipe completo ejecutado el 5 oct  

---

## 📊 Estado de Implementación (6 octubre 2025)

### ✅ Problemas RESUELTOS (7/9)

1. ✅ **Campo description para usuario** → SOLVED via columna `paid_by` (UUID → profiles.id)
2. ✅ **Sistema de ownership robusto** → SOLVED via `paid_by`, `created_by`, `updated_by`
3. ✅ **Estados no robustos** → SOLVED via `status` (draft/pending/confirmed/locked)
4. ✅ **Nomenclatura inconsistente** → SOLVED via FASE 5 (movements → transactions en 50+ archivos)
5. ✅ **Auditoría incompleta** → SOLVED via columnas `created_by`, `updated_by`, `locked_at`, `locked_by`
6. ✅ **Conexión ajustes débil** → SOLVED via `source_type` (manual/adjustment/recurring/import) + `source_id`
7. ✅ **Cierre mensual** → SOLVED via FASE 8 (ClosePeriodModal, ReopenPeriodModal, PeriodActions)

### ⚠️ Problemas PENDIENTES (2/9)

8. ⏳ **Split de gastos** → Decisión "B - Complejo/Flexible" aprobada pero NO implementada
   - Columnas existen: `split_type` (none/equal/proportional/custom), `split_data` JSONB
   - Falta: UI para configurar split, lógica para calcular shares, reportes por miembro
   - **Recomendación**: Posponer a core adjustments después de testing manual

9. ⏳ **RLS policies exhaustivo** → Policies existen pero NO testeadas con múltiples usuarios
   - Políticas implementadas: Transactions locked NO editables, household_id validation
   - Falta: Testing exhaustivo con 2+ usuarios, intentos de acceso cross-household
   - **Recomendación**: Validar durante testing manual con fumetas.sik + caballeropomes  

---

## 📋 Tabla de Contenidos

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Problemas Identificados](#problemas-identificados)
3. [Solución Propuesta](#solución-propuesta)
4. [Análisis del Estado Actual](#análisis-del-estado-actual)
5. [Nuevo Modelo de Datos](#nuevo-modelo-de-datos)
6. [Plan de Migración](#plan-de-migración)
7. [Cambios en la Aplicación](#cambios-en-la-aplicación)
8. [Testing y Validación](#testing-y-validación)
9. [Preguntas Pendientes](#preguntas-pendientes)

---

## Resumen Ejecutivo

### Objetivo
Transformar el sistema actual de transacciones en una solución robusta, escalable y profesional que permita:
- **Tracking completo** de quién paga qué
- **Auditoría completa** de todos los cambios
- **Estados claros** para transacciones, ajustes, hogares y períodos mensuales
- **Conexiones explícitas** entre ajustes y transacciones generadas
- **Sistema de cierre mensual** con bloqueo de ediciones
- **Estadísticas precisas** por miembro y período

### Impacto
- ✅ **Escalabilidad**: Preparado para múltiples miembros por hogar
- ✅ **Auditoría**: Registro completo de quién hace qué y cuándo
- ✅ **Integridad**: Conexiones explícitas con validación DB
- ✅ **UX Profesional**: Estados claros, permisos granulares
- ⚠️ **Breaking Change**: Requiere wipe completo de datos (aceptado por usuario)

---

## Problemas Identificados

### 1. ⚠️ Campo `description` usado para identificar usuario
**Problema actual**:
```sql
SELECT description FROM transactions;
-- "Contribución mensual 10/2025 - fumetas.sik@gmail.com"
-- "Contribución mensual 10/2025 - caballeropomes@gmail.com"
```
- No escalable
- No query-able eficientemente
- Propenso a errores humanos
- Dificulta estadísticas

**Impacto**: Imposible saber fácilmente cuánto ha aportado cada miembro.

### 2. ❌ Falta sistema de ownership robusto
**Problema**: Columna `profile_id` existe pero:
- No se usa consistentemente (NULL en muchos casos)
- No hay validación de que pertenezca al household
- No hay selector en UI

### 3. ❌ Estados no robustos
**Problema**: 
- `transactions` NO tiene columna `status`
- `contribution_adjustments.status` existe pero solo: `pending`, `approved`, `rejected`
- No hay estado `locked` para cierre mensual
- No hay `draft` para transacciones en progreso

### 4. ❌ Nomenclatura inconsistente
**Problema**:
- DB: `transactions` ✅
- Código: `movements`, `MovementForm`, `app/expenses/` ❌
- UI: "Movimientos" ❌

**Impacto**: Confusión en desarrollo, búsquedas fallidas, inconsistencia.

### 5. ❌ Auditoría incompleta
**Problema**: Faltan columnas críticas:
- `created_by` (quién creó la transacción)
- `updated_by` (quién la editó última vez)
- `locked_at` / `locked_by` (cuándo/quién bloqueó en cierre mensual)

### 6. ❌ Conexión ajustes ↔ transacciones débil
**Problema actual**:
```sql
-- contribution_adjustments tiene:
movement_id UUID -- ¿Cuál movimiento? ¿Gasto o ingreso?
income_movement_id UUID -- OK, pero no hay reverse lookup fácil
```
**Solución necesaria**: Agregar en `transactions`:
- `source_type` (manual, adjustment, recurring, import)
- `source_id` (UUID del ajuste que lo generó)

### 7. ❌ No hay sistema de cierre mensual robusto
**Problema**: 
- Tabla `monthly_periods` existe pero NO se usa
- No hay lógica de bloqueo automático
- Transacciones pueden editarse indefinidamente

---

## Solución Propuesta

### Principios de Diseño

**Inspiración de proyectos exitosos**:
- **Splitwise**: `paid_by` + `split_between[]` → Quién pagó + quién se beneficia
- **Tricount**: Estados claros + reconciliación mensual
- **YNAB**: Budgets + locked transactions tras reconciliación
- **Mint**: Categorización automática + auditoría completa

**Nuestro enfoque**:
1. ✅ **Ownership explícito**: Cada transacción tiene `paid_by` (quién pagó)
2. ✅ **Estados del ciclo de vida**: draft → pending → confirmed → locked
3. ✅ **Auditoría completa**: created_by, updated_by, locked_by con timestamps
4. ✅ **Cierre mensual automático**: monthly_periods activo + locking
5. ✅ **Conexiones explícitas**: source_type + source_id bidireccional
6. ✅ **Nomenclatura unificada**: "transactions" en todos lados

---

## Análisis del Estado Actual

### Datos Existentes (5 oct 2025)
```
transactions: 7 filas
  - 1 household
  - 2 usuarios involucrados
  - Rango: 5 oct 02:44 → 5 oct 03:42

contribution_adjustments: 1 fila
  - 1 ajuste de tipo prepayment
  - Genera 2 movimientos (expense + income virtual)

contributions: 2 filas
  - 1 por cada miembro del hogar
  - Mes actual: 10/2025
```

### Columnas Existentes en `transactions`
✅ Ya tenemos:
- `id`, `household_id`, `category_id`
- `type` (expense/income)
- `amount`, `currency`, `description`
- `occurred_at` (DATE)
- `created_at`, `updated_at` (TIMESTAMPTZ)
- `profile_id` (UUID → profiles.id) ⚠️ Poco usado
- `period_id` (UUID → monthly_periods.id) ⚠️ NO usado

❌ Faltan:
- `paid_by` (quién pagó realmente)
- `status` (draft, pending, confirmed, locked)
- `created_by`, `updated_by` (auditoría)
- `locked_at`, `locked_by` (cierre mensual)
- `source_type`, `source_id` (rastreo origen)

---

## Nuevo Modelo de Datos

### 🔄 Cambios en `transactions`

```sql
-- FASE 1: Agregar columnas de ownership y estados
ALTER TABLE transactions
  -- Ownership (quién pagó)
  ADD COLUMN paid_by UUID REFERENCES profiles(id) ON DELETE SET NULL
    COMMENT 'Miembro que pagó/recibió esta transacción',
  
  -- Estados del ciclo de vida
  ADD COLUMN status TEXT NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('draft', 'pending', 'confirmed', 'locked'))
    COMMENT 'Estado: draft (borrador), pending (esperando validación), confirmed (validado), locked (cerrado con mensualidad)',
  
  -- Rastreo de origen
  ADD COLUMN source_type TEXT
    CHECK (source_type IN ('manual', 'adjustment', 'recurring', 'import'))
    COMMENT 'Origen de la transacción: manual (creada por usuario), adjustment (generada por ajuste), recurring (regla recurrente), import (importada)',
  
  ADD COLUMN source_id UUID
    COMMENT 'ID del recurso que generó esta transacción (ej: contribution_adjustment.id)',
  
  -- Auditoría completa
  ADD COLUMN created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
    COMMENT 'Usuario que creó la transacción',
  
  ADD COLUMN updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL
    COMMENT 'Usuario que editó la transacción por última vez',
  
  ADD COLUMN locked_at TIMESTAMPTZ
    COMMENT 'Fecha y hora de bloqueo (cierre mensual)',
  
  ADD COLUMN locked_by UUID REFERENCES profiles(id) ON DELETE SET NULL
    COMMENT 'Usuario que bloqueó la transacción (owner que cerró el mes)';

-- FASE 2: Migrar datos existentes
-- profile_id → paid_by (renombrado conceptualmente)
UPDATE transactions
SET paid_by = profile_id
WHERE profile_id IS NOT NULL;

-- Marcar origen de transacciones existentes
UPDATE transactions
SET 
  source_type = CASE
    WHEN description LIKE '%Contribución mensual%' THEN 'adjustment'
    ELSE 'manual'
  END,
  status = 'confirmed',
  created_by = paid_by; -- Asumir que quien pagó también creó

-- FASE 3: Crear índices optimizados
CREATE INDEX idx_transactions_paid_by ON transactions(paid_by);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_source ON transactions(source_type, source_id);
CREATE INDEX idx_transactions_locked ON transactions(locked_at) WHERE locked_at IS NOT NULL;
CREATE INDEX idx_transactions_household_occurred ON transactions(household_id, occurred_at DESC);
```

### 🔄 Cambios en `contribution_adjustments`

```sql
-- Mejorar estados de ajustes
ALTER TABLE contribution_adjustments
  DROP CONSTRAINT IF EXISTS contribution_adjustments_status_check,
  ADD CONSTRAINT contribution_adjustments_status_check
    CHECK (status IN ('pending', 'active', 'applied', 'cancelled', 'locked'));

-- Actualizar comentario
COMMENT ON COLUMN contribution_adjustments.status IS 
  'Estado del ajuste: 
   - pending: Creado, esperando aprobación (si hay workflow)
   - active: Aprobado y activo, movimientos generados
   - applied: Aplicado a la contribución del mes
   - cancelled: Cancelado, movimientos eliminados
   - locked: Cerrado con mensualidad, NO editable';

-- Agregar columna de auditoría faltante
ALTER TABLE contribution_adjustments
  ADD COLUMN updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL
    COMMENT 'Usuario que editó el ajuste por última vez',
  
  ADD COLUMN locked_at TIMESTAMPTZ
    COMMENT 'Fecha y hora de bloqueo (cierre mensual)',
  
  ADD COLUMN locked_by UUID REFERENCES profiles(id) ON DELETE SET NULL
    COMMENT 'Usuario que bloqueó el ajuste';
```

### 🆕 Activar y mejorar `monthly_periods`

```sql
-- La tabla ya existe, mejoramos su uso
ALTER TABLE monthly_periods
  ADD COLUMN auto_close_enabled BOOLEAN NOT NULL DEFAULT false
    COMMENT 'Si true, se cierra automáticamente el día 1 del siguiente mes',
  
  ADD COLUMN reconciled BOOLEAN NOT NULL DEFAULT false
    COMMENT 'Si true, todas las transacciones y ajustes están revisadas';

-- Índice para búsquedas de período activo
CREATE INDEX idx_monthly_periods_household_date 
  ON monthly_periods(household_id, year, month);

-- Constraint único: un solo período por household/year/month
CREATE UNIQUE INDEX idx_monthly_periods_unique
  ON monthly_periods(household_id, year, month);
```

### 🔄 Cambios en `households`

```sql
-- Agregar estado de hogar
ALTER TABLE households
  ADD COLUMN status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'archived'))
    COMMENT 'Estado del hogar: active (en uso), inactive (pausado), archived (histórico)';

CREATE INDEX idx_households_status ON households(status);
```

### 🆕 Función de cierre mensual automático

```sql
-- Función para cerrar un mes y bloquear sus transacciones
CREATE OR REPLACE FUNCTION close_monthly_period(
  p_household_id UUID,
  p_year INT,
  p_month INT,
  p_closed_by UUID
) RETURNS void AS $$
DECLARE
  v_period_id UUID;
  v_start_date DATE;
  v_end_date DATE;
BEGIN
  -- Calcular rango de fechas
  v_start_date := make_date(p_year, p_month, 1);
  v_end_date := (v_start_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
  
  -- Obtener o crear período
  SELECT id INTO v_period_id
  FROM monthly_periods
  WHERE household_id = p_household_id
    AND year = p_year
    AND month = p_month;
  
  IF v_period_id IS NULL THEN
    RAISE EXCEPTION 'Período mensual no encontrado: %/%', p_month, p_year;
  END IF;
  
  -- Actualizar período
  UPDATE monthly_periods
  SET 
    status = 'closed',
    closed_at = NOW(),
    closed_by = p_closed_by,
    reconciled = true
  WHERE id = v_period_id;
  
  -- Bloquear todas las transacciones del mes
  UPDATE transactions
  SET 
    status = 'locked',
    locked_at = NOW(),
    locked_by = p_closed_by
  WHERE household_id = p_household_id
    AND occurred_at BETWEEN v_start_date AND v_end_date
    AND status != 'locked'; -- No re-bloquear
  
  -- Bloquear todos los ajustes del mes
  UPDATE contribution_adjustments ca
  SET 
    status = 'locked',
    locked_at = NOW(),
    locked_by = p_closed_by
  FROM contributions c
  WHERE ca.contribution_id = c.id
    AND c.household_id = p_household_id
    AND c.year = p_year
    AND c.month = p_month
    AND ca.status != 'locked';
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 🔒 RLS Policies Actualizadas

```sql
-- Transacciones: locked NO editables
CREATE POLICY "locked_transactions_readonly"
  ON transactions FOR UPDATE
  USING (status != 'locked');

-- Ajustes: locked NO editables
CREATE POLICY "locked_adjustments_readonly"
  ON contribution_adjustments FOR UPDATE
  USING (status != 'locked');

-- Períodos: Solo owners pueden cerrar
CREATE POLICY "owners_can_close_periods"
  ON monthly_periods FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = monthly_periods.household_id
        AND hm.profile_id = auth.uid()
        AND hm.role = 'owner'
    )
  );
```

---

## Plan de Migración

### Pre-requisitos
- ✅ Usuario confirmó: **wipe completo de datos** aceptado
- ✅ Mantener estructura de tablas
- ✅ Mantener usuarios (auth.users, profiles)
- ❌ NO mantener: transactions, contributions, adjustments, categories

### Migraciones Secuenciales

#### Migration 1: `add_transaction_ownership_and_status.sql`
```sql
-- Agregar paid_by, status, source_*
-- Crear índices
-- Ver código completo arriba
```

#### Migration 2: `add_audit_columns.sql`
```sql
-- Agregar created_by, updated_by, locked_at, locked_by
-- A transactions, contribution_adjustments
```

#### Migration 3: `improve_monthly_periods.sql`
```sql
-- Agregar auto_close_enabled, reconciled
-- Crear índices y constraints
```

#### Migration 4: `add_household_status.sql`
```sql
-- Agregar status a households
```

#### Migration 5: `close_monthly_period_function.sql`
```sql
-- Crear función close_monthly_period()
```

#### Migration 6: `update_rls_policies.sql`
```sql
-- Actualizar policies para respetar locked status
```

---

## Cambios en la Aplicación

### FASE A: Renombrar "movements" → "transactions"

**Archivos a renombrar/modificar**:
1. `app/expenses/` → `app/transactions/`
2. `app/app/components/MovementsList.tsx` → `TransactionsList.tsx`
3. `app/app/components/EditMovementDialog.tsx` → `EditTransactionDialog.tsx`
4. `app/app/components/AddMovementDialog.tsx` → `AddTransactionDialog.tsx`
5. Todos los textos en UI: "Movimiento" → "Transacción"
6. Variables en código: `movement` → `transaction`, `MovementForm` → `TransactionForm`

**Impacto estimado**: 50+ archivos modificados

### FASE B: Actualizar tipos TypeScript

```typescript
// types/database.ts (auto-generado)
// Regenerar tras migraciones

// lib/types.ts (custom types)
export type TransactionStatus = 'draft' | 'pending' | 'confirmed' | 'locked';
export type TransactionSourceType = 'manual' | 'adjustment' | 'recurring' | 'import';

export type AdjustmentStatus = 'pending' | 'active' | 'applied' | 'cancelled' | 'locked';

export type MonthlyPeriodStatus = 'open' | 'pending_close' | 'closed';

export type HouseholdStatus = 'active' | 'inactive' | 'archived';

export interface Transaction {
  id: string;
  household_id: string;
  
  // Ownership
  paid_by: string | null; // profile_id
  
  // Core data
  category_id: string | null;
  type: 'expense' | 'income';
  amount: number;
  currency: string;
  description: string | null;
  occurred_at: string; // DATE
  
  // Status & Source
  status: TransactionStatus;
  source_type: TransactionSourceType | null;
  source_id: string | null;
  
  // Audit trail
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
  locked_at: string | null;
  locked_by: string | null;
  
  // Relations
  period_id: string | null;
}
```

### FASE C: Actualizar Server Actions

**Nuevos parámetros en `createTransaction()`**:
```typescript
// app/app/transactions/actions.ts
export async function createTransaction(formData: FormData): Promise<Result> {
  const schema = z.object({
    household_id: z.string().uuid(),
    paid_by: z.string().uuid().nullable(), // ⭐ NUEVO
    category_id: z.string().uuid().nullable(),
    type: z.enum(['expense', 'income']),
    amount: z.coerce.number().positive(),
    currency: z.string().default('EUR'),
    description: z.string().optional(),
    occurred_at: z.coerce.date(),
    status: z.enum(['draft', 'pending', 'confirmed']).default('confirmed'), // ⭐ NUEVO
  });
  
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
  }
  
  const supabase = supabaseServer();
  const user = await supabase.auth.getUser();
  
  if (!user.data.user) {
    return fail('No autenticado');
  }
  
  // Obtener profile_id del usuario actual
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.data.user.id)
    .single();
  
  if (!profile) {
    return fail('Perfil no encontrado');
  }
  
  // Insertar con auditoría completa
  const { error } = await supabase
    .from('transactions')
    .insert({
      ...parsed.data,
      source_type: 'manual', // ⭐ Transacciones creadas por usuario
      created_by: profile.id, // ⭐ Auditoría
      updated_by: profile.id,
    });
  
  if (error) return fail(error.message);
  
  revalidatePath('/app');
  return ok();
}
```

**Validar locked status en `updateTransaction()`**:
```typescript
export async function updateTransaction(
  id: string,
  formData: FormData
): Promise<Result> {
  // ... validación Zod ...
  
  const supabase = supabaseServer();
  
  // Verificar que NO esté locked
  const { data: existing } = await supabase
    .from('transactions')
    .select('status, household_id')
    .eq('id', id)
    .single();
  
  if (!existing) {
    return fail('Transacción no encontrada');
  }
  
  if (existing.status === 'locked') {
    return fail('Esta transacción está bloqueada porque el mes ya se cerró');
  }
  
  // Obtener profile_id del usuario actual
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', (await supabase.auth.getUser()).data.user!.id)
    .single();
  
  // Actualizar con auditoría
  const { error } = await supabase
    .from('transactions')
    .update({
      ...parsed.data,
      updated_by: profile!.id, // ⭐ Auditoría
    })
    .eq('id', id);
  
  if (error) return fail(error.message);
  
  revalidatePath('/app');
  return ok();
}
```

### FASE D: UI - Selector "Pagado por"

**Componente nuevo**: `components/shared/MemberSelector.tsx`
```typescript
'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Member {
  id: string;
  display_name: string;
  email: string;
}

interface MemberSelectorProps {
  members: Member[];
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
}

export function MemberSelector({
  members,
  value,
  onChange,
  placeholder = 'Seleccionar miembro'
}: MemberSelectorProps) {
  return (
    <Select
      value={value ?? 'none'}
      onValueChange={(val) => onChange(val === 'none' ? null : val)}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Gasto común (sin asignar)</SelectItem>
        {members.map((member) => (
          <SelectItem key={member.id} value={member.id}>
            {member.display_name} ({member.email})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

**Uso en formularios**:
```typescript
// app/app/transactions/components/TransactionForm.tsx
<FormField
  control={form.control}
  name="paid_by"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Pagado por</FormLabel>
      <FormControl>
        <MemberSelector
          members={householdMembers}
          value={field.value}
          onChange={field.onChange}
        />
      </FormControl>
      <FormDescription>
        Selecciona quién pagó este gasto (déjalo en "común" si fue compartido)
      </FormDescription>
      <FormMessage />
    </FormItem>
  )}
/>
```

### FASE E: UI - Badges de Estado

```typescript
// components/shared/StatusBadge.tsx
import { Badge } from '@/components/ui/badge';
import type { TransactionStatus } from '@/lib/types';

const statusConfig: Record<TransactionStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Borrador', variant: 'outline' },
  pending: { label: 'Pendiente', variant: 'secondary' },
  confirmed: { label: 'Confirmado', variant: 'default' },
  locked: { label: 'Cerrado', variant: 'destructive' },
};

export function TransactionStatusBadge({ status }: { status: TransactionStatus }) {
  const config = statusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
```

### FASE F: Dashboard con Tabs

**Reorganizar `app/app/page.tsx`**:
```typescript
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default async function DashboardPage() {
  // ... fetch data ...
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <MonthSelector />
      </div>
      
      <Tabs defaultValue="transactions" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="transactions">Transacciones</TabsTrigger>
          <TabsTrigger value="stats">Estadísticas</TabsTrigger>
        </TabsList>
        
        <TabsContent value="transactions" className="space-y-6">
          <TransactionsList 
            transactions={recentTransactions}
            categories={categories}
            members={householdMembers}
            onUpdate={refreshData}
          />
        </TabsContent>
        
        <TabsContent value="stats" className="space-y-6">
          <ExpensesByCategoryChart data={expensesByCategory} />
          <MonthlyTrendChart data={monthlyTrends} />
          <MemberContributionsChart data={memberContributions} />
          <BalanceByMemberCard data={balanceByMember} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

### FASE G: Sistema de Cierre Mensual

**Nueva página**: `app/app/periods/page.tsx`
```typescript
// Lista de períodos mensuales con botón "Cerrar Mes"
// Solo owners pueden cerrar
// Muestra warning: "Esto bloqueará TODAS las transacciones y ajustes del mes"
```

**Server Action**:
```typescript
// app/app/periods/actions.ts
'use server';

export async function closeMonthlyPeriod(
  year: number,
  month: number
): Promise<Result> {
  const supabase = supabaseServer();
  
  // Verificar que el usuario es owner
  const householdId = await getUserHouseholdId();
  const { data: member } = await supabase
    .from('household_members')
    .select('role')
    .eq('household_id', householdId)
    .eq('profile_id', (await getCurrentProfile()).id)
    .single();
  
  if (!member || member.role !== 'owner') {
    return fail('Solo los owners pueden cerrar períodos mensuales');
  }
  
  // Llamar función DB
  const { error } = await supabase.rpc('close_monthly_period', {
    p_household_id: householdId,
    p_year: year,
    p_month: month,
    p_closed_by: (await getCurrentProfile()).id,
  });
  
  if (error) return fail(error.message);
  
  revalidatePath('/app/periods');
  return ok({ message: `Mes ${month}/${year} cerrado exitosamente` });
}
```

---

## Testing y Validación

### Test Plan

#### Unit Tests
- [ ] `formatCurrency()` con privacyMode
- [ ] `TransactionStatusBadge` renderiza correctamente
- [ ] `MemberSelector` permite NULL

#### Integration Tests
- [ ] Crear transacción manual → `source_type='manual'`, `created_by` correcto
- [ ] Crear ajuste prepago → 2 transacciones con `source_type='adjustment'`, `source_id` apuntando al ajuste
- [ ] Editar transacción confirmed → Actualiza `updated_by`
- [ ] Intentar editar transacción locked → Devuelve error
- [ ] Cerrar mes → Bloquea todas las transacciones del período
- [ ] Filtrar transacciones por `paid_by` → Solo muestra las del miembro

#### E2E Tests (Playwright)
- [ ] Smoke test: Login → Dashboard → Crear transacción → Asignar "Pagado por" → Guardar
- [ ] Cierre mensual: Owner cierra mes → Intentar editar transacción → Muestra error "bloqueada"

---

## Preguntas Pendientes

### ❓ Pregunta 1: Split de Gastos
**¿Los gastos se dividen entre TODOS los miembros o es personalizable?**

**Opciones**:
- **A) Siempre entre todos** (más simple)
  - Gastos comunes se dividen automáticamente
  - Cada miembro ve su "parte"
  
- **B) Personalizable por transacción** (más flexible, más complejo)
  - Agregar columna `split_type`: `'none'`, `'equal'`, `'proportional'`, `'custom'`
  - Agregar columna `split_data JSONB`: `{ member_id: amount }`
  - UI más compleja

**Recomendación**: Empezar con **A** (más simple), agregar **B** en fase 2 si es necesario.

---

### ❓ Pregunta 2: Cierre Mensual
**¿Debe ser automático (día 1 de cada mes) o manual?**

**Opciones**:
- **A) Manual** (más control, más trabajo)
  - Owner clickea "Cerrar Mes" cuando está listo
  - Permite revisar antes de bloquear
  
- **B) Automático** (más automatizado, menos control)
  - Cron job diario verifica si es día 1
  - Cierra automáticamente con parámetro `auto_close_enabled=true`
  
- **C) Híbrido** (recomendado)
  - Opción en household_settings: `auto_close_enabled BOOLEAN`
  - Si true → cierra automáticamente día 1
  - Si false → requiere acción manual

**Recomendación**: **C (Híbrido)** - Mejor UX con flexibilidad.

---

### ❓ Pregunta 3: Transacciones Locked
**¿Son 100% read-only o pueden "reabrirse"?**

**Opciones**:
- **A) 100% read-only** (más estricto, auditoría limpia)
  - Una vez locked, NUNCA editable
  - Correcciones = nueva transacción con nota "corrección de..."
  
- **B) Reapertura permitida** (más flexible, auditoría compleja)
  - Owner puede "reabrir período"
  - Desbloquea transacciones
  - Registra en auditoría: "reabierto por X el Y"

**Recomendación**: **A (100% read-only)** - Mantiene integridad auditoría.

---

### ❓ Pregunta 4: Ingresos Adicionales
**¿Cómo detectar y registrar "ingresos adicionales al objetivo común"?**

**Contexto**: Si la meta es 2000€ y un miembro aporta 2500€, los 500€ extra deben:
- Registrarse como "contribución extra"
- Aparecer en estadísticas
- ¿Acumularse como crédito para meses futuros?

**Opciones**:
- **A) Campo calculado en `contributions`**: `overpayment_amount`
  - Se calcula automáticamente: `paid_amount - expected_amount`
  - Solo lectura
  
- **B) Sistema de créditos/débitos**:
  - Nueva tabla `member_balances`
  - Acumula excedentes/déficits mes a mes
  - Permite "compensar" meses futuros

**Recomendación**: **A** para MVP, **B** en fase 2.

---

### ❓ Pregunta 5: Permisos de Edición
**"Todos los elementos pueden editarse por owner O por el miembro propietario"**

**Clarificación necesaria**:
- ¿Member puede editar transacciones de OTROS members?
- ¿Member puede editar ajustes creados por owner?

**Propuesta RLS**:
```sql
-- Transacciones: Owner puede todo, member solo las suyas (donde paid_by = su profile_id)
CREATE POLICY "members_can_edit_own_transactions"
  ON transactions FOR UPDATE
  USING (
    status != 'locked' AND (
      -- Owner puede todo
      EXISTS (
        SELECT 1 FROM household_members hm
        WHERE hm.household_id = transactions.household_id
          AND hm.profile_id = auth.uid()
          AND hm.role = 'owner'
      )
      OR
      -- Member solo sus transacciones
      paid_by = auth.uid()
    )
  );

-- Ajustes: Owner puede todo, member solo los que creó
CREATE POLICY "members_can_edit_own_adjustments"
  ON contribution_adjustments FOR UPDATE
  USING (
    status != 'locked' AND (
      -- Owner puede todo
      EXISTS (
        SELECT 1 FROM contributions c
        JOIN household_members hm ON hm.household_id = c.household_id
        WHERE c.id = contribution_adjustments.contribution_id
          AND hm.profile_id = auth.uid()
          AND hm.role = 'owner'
      )
      OR
      -- Member solo sus ajustes
      created_by = auth.uid()
    )
  );
```

---

## Siguiente Paso

### ✅ Confirmar con Usuario

**Antes de implementar, necesito confirmación del usuario en**:
1. ✅ Wipe completo de datos confirmado
2. ❓ Split de gastos: ¿Siempre entre todos (A) o personalizable (B)?
3. ❓ Cierre mensual: ¿Manual (A), Automático (B) o Híbrido (C)?
4. ❓ Transacciones locked: ¿100% read-only (A) o reapertura permitida (B)?
5. ❓ Ingresos adicionales: ¿Campo calculado (A) o sistema créditos (B)?
6. ❓ Permisos: Confirmar RLS propuesto

### 🚀 Tras Confirmación

**Orden de implementación**:
1. **Día 1-2**: Migraciones DB (6 migrations)
2. **Día 3**: Renombrar movements → transactions (50+ archivos)
3. **Día 4**: Actualizar Server Actions con auditoría
4. **Día 5**: UI - Selector "Pagado por" + Badges estados
5. **Día 6**: Dashboard con tabs
6. **Día 7**: Sistema cierre mensual
7. **Día 8**: Testing completo + wipe + seed datos prueba

**Tiempo estimado**: 7-8 días de desarrollo full-time.

---

**Documento creado**: 5 de octubre de 2025, 04:30 UTC  
**Última actualización**: 5 de octubre de 2025, 04:30 UTC  
**Estado**: 🎯 Esperando confirmación usuario
