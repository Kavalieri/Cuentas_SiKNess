# 🔍 Validación de Lógica de Negocio - CuentasSiK

**Fecha**: 7 octubre 2025  
**Objetivo**: Validar que la aplicación soporte correctamente todos los requisitos de negocio

---

## ✅ Requisitos del Usuario

### **1. Contribución Proporcional por Ingresos**
**Requisito**: Calcular la contribución de cada miembro proporcionalmente a sus ingresos.

**Estado actual**: ✅ **IMPLEMENTADO**

**Evidencia**:
```sql
-- Tabla: member_incomes
-- Almacena ingresos con historial (effective_from)
-- Función SQL: get_member_income(household_id, profile_id, date)
-- Función SQL: calculate_monthly_contributions(household_id, year, month)
```

**Ejemplo**:
- Hogar con meta 2000€/mes
- Miembro A: 1500€ ingreso → 750€ contribución (37.5%)
- Miembro B: 2500€ ingreso → 1250€ contribución (62.5%)

**Ubicación código**:
- `db/contributions-schema.sql` (líneas 8-20, función L180-220)
- `app/app/contributions/actions.ts` → `calculateAndCreateContributions()`

---

### **2. Soporte para Más de 2 Miembros**
**Requisito**: Un hogar puede tener N miembros (3, 4, 5, etc.)

**Estado actual**: ✅ **SOPORTADO**

**Evidencia**:
```sql
-- Tabla: household_members
-- Relación N:N entre households y users
-- NO hay constraint de máximo de miembros
-- PK: (household_id, user_id)
```

**Prueba**:
```sql
-- Un hogar puede tener múltiples miembros
SELECT * FROM household_members WHERE household_id = 'xxx';
-- Retorna: N filas (sin límite)
```

**Cálculo de contribuciones**:
```typescript
// La función calculate_monthly_contributions() itera sobre TODOS los miembros
const members = await supabase
  .from('household_members')
  .select('user_id')
  .eq('household_id', householdId);

// Para cada miembro:
const totalIncome = members.reduce((sum, m) => sum + m.income, 0);
const memberContribution = (memberIncome / totalIncome) * monthlyGoal;
```

**Ajuste necesario**: ❌ **NO HAY**

---

### **3. Hogar con 1 Solo Miembro**
**Requisito**: Si un hogar tiene 1 solo miembro, eliminar el sistema de contribuciones proporcionales.

**Estado actual**: ⚠️ **LÓGICA FALTA**

**Problema**:
```typescript
// Actualmente, si hay 1 miembro con ingreso 2000€:
totalIncome = 2000€
memberContribution = (2000 / 2000) * monthlyGoal = 100% * monthlyGoal

// Si monthlyGoal = 2000€, contribución = 2000€
// Funciona matemáticamente pero es redundante
```

**Solución propuesta**:

**Opción A - Deshabilitar contribuciones**:
```typescript
// En ConfigurationSection.tsx y calculateAndCreateContributions()
const membersCount = await supabase
  .from('household_members')
  .select('user_id', { count: 'exact' })
  .eq('household_id', householdId);

if (membersCount.count === 1) {
  return fail('Las contribuciones solo aplican para hogares con 2+ miembros');
}
```

**Opción B - Permitir pero simplificar UI**:
```typescript
// Mostrar mensaje en UI:
if (membersCount === 1) {
  return (
    <Alert>
      <Info className="h-4 w-4" />
      <AlertDescription>
        Este hogar tiene un solo miembro. Las contribuciones no son necesarias.
        Puedes agregar miembros en Configuración.
      </AlertDescription>
    </Alert>
  );
}
```

**Recomendación**: **Opción B** (permitir pero avisar)
- Usuario puede crear hogar solo y luego invitar a su pareja
- Evita bloqueos innecesarios
- UI clara con mensaje informativo

**Ajuste necesario**: ✅ **AGREGAR validación en ConfigurationSection + mensaje UI**

---

### **4. Tipos de Reparto: Igual, Proporcional, Personalizado**
**Requisito**: Seleccionar tipo de cálculo de contribuciones.

**Estado actual**: ❌ **NO IMPLEMENTADO**

**Evidencia**:
```sql
-- household_settings NO tiene columna 'calculation_type'
-- Solo tiene: monthly_contribution_goal, currency

-- FALTA:
calculation_type ENUM('equal', 'proportional', 'custom')
```

**Lógica de cada tipo**:

**A. Equal (Igual)**:
```typescript
// Dividir meta entre número de miembros
const contribution = monthlyGoal / membersCount;

// Ejemplo: Meta 2000€, 2 miembros
// Miembro A: 1000€
// Miembro B: 1000€
// (sin importar ingresos)
```

**B. Proportional (Proporcional - actual)**:
```typescript
// Ya implementado
const contribution = (memberIncome / totalIncome) * monthlyGoal;
```

**C. Custom (Personalizado)**:
```typescript
// Permitir editar manualmente la contribución de cada miembro
// Validación: SUM(contributions) = monthlyGoal

// UI: Input editable en cada MemberCard
// Server Action: updateCustomContribution(userId, amount)
```

**Schema propuesto**:
```sql
ALTER TABLE household_settings 
ADD COLUMN calculation_type VARCHAR(20) NOT NULL DEFAULT 'proportional'
CHECK (calculation_type IN ('equal', 'proportional', 'custom'));

-- Migración:
-- supabase/migrations/YYYYMMDDHHMMSS_add_calculation_type.sql
```

**Ajuste necesario**: ✅ **MIGRACIÓN SQL + lógica en calculateAndCreateContributions()**

---

### **5. Perfil de Usuario Editable**
**Requisito**: Espacio donde el usuario pueda editar:
- Nombre para mostrar en la app
- Email
- Ingresos mensuales

**Estado actual**: ⚠️ **PARCIALMENTE IMPLEMENTADO**

**Evidencia**:
```tsx
// app/app/profile/page.tsx - YA EXISTE
<ProfileForm /> // Para editar perfil
<IncomeForm />  // Para editar ingreso
```

**Tabla actual**:
```sql
-- profiles (tabla existente)
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  auth_user_id UUID REFERENCES auth.users(id),
  email TEXT,  -- ¿Editable? ⚠️
  created_at TIMESTAMPTZ
);
```

**Problema**: 
1. **NO hay campo `display_name`** en profiles
2. **Email viene de auth.users** (no editable directamente)
3. **Ingresos están en member_incomes** (relación con household)

**Schema propuesto**:
```sql
ALTER TABLE profiles 
ADD COLUMN display_name TEXT;

-- Permitir NULL para migración, luego hacer NOT NULL
UPDATE profiles SET display_name = SPLIT_PART(email, '@', 1);
ALTER TABLE profiles ALTER COLUMN display_name SET NOT NULL;
```

**Lógica de negocio**:
```typescript
// Editar nombre:
export async function updateDisplayName(displayName: string): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return fail('No autenticado');
  
  const { error } = await supabase
    .from('profiles')
    .update({ display_name: displayName })
    .eq('auth_user_id', user.id);
  
  if (error) return fail(error.message);
  revalidatePath('/app/profile');
  return ok();
}

// Editar email:
// NO permitir desde la app, solo desde Supabase Auth Settings
// (requiere verificación de email nuevo)

// Editar ingreso:
// YA EXISTE en IncomeForm.tsx
```

**UI propuesta**:
```tsx
// ProfileForm.tsx (mejorado)
<FormSection title="Información Personal">
  <Input 
    label="Nombre para mostrar" 
    name="display_name"
    defaultValue={profile.display_name}
  />
  <Input 
    label="Email" 
    name="email"
    value={user.email}
    disabled
    helperText="Para cambiar tu email, contacta soporte"
  />
</FormSection>
```

**Ajuste necesario**: ✅ **MIGRACIÓN SQL + updateDisplayName() action + mejorar ProfileForm**

---

### **6. Control de Cierre Mensual (Snapshot)**
**Requisito**: Al cerrar un mes, crear un snapshot para no recalcular meses anteriores.

**Estado actual**: ✅ **IMPLEMENTADO**

**Evidencia**:
```sql
-- Tabla: monthly_periods
-- Estados: future, active, closing, closed, historical
-- Columnas: closed_at, closed_by, reopened_count

-- Tabla: transactions
-- Columna: status ('draft', 'pending', 'confirmed', 'locked')
-- locked = período cerrado, NO editable

-- Función SQL: close_monthly_period(period_id, closed_by, notes)
-- Función SQL: reopen_monthly_period(period_id, reopened_by, reason)
```

**Lógica actual**:
```typescript
// Al cerrar mes:
1. UPDATE monthly_periods SET status = 'closed', closed_at = NOW()
2. UPDATE transactions SET status = 'locked' WHERE period_id = X
3. UPDATE contribution_adjustments SET status = 'locked' WHERE ...
4. Calcular snapshot de balances finales (opcional)

// Al reabrir mes:
1. UPDATE monthly_periods SET status = 'active', reopened_count += 1
2. UPDATE transactions SET status = 'confirmed' WHERE period_id = X && status = 'locked'
```

**Snapshot de Balances** (opcional pero recomendado):
```sql
-- Nueva tabla propuesta:
CREATE TABLE monthly_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id),
  period_id UUID NOT NULL REFERENCES monthly_periods(id),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  
  -- Balances finales del mes
  total_income NUMERIC(10,2) NOT NULL,
  total_expenses NUMERIC(10,2) NOT NULL,
  net_balance NUMERIC(10,2) NOT NULL,
  
  -- Contribuciones del mes
  contributions_data JSONB NOT NULL, -- Array de {user_id, expected, paid, status}
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT monthly_snapshots_household_period_key UNIQUE (household_id, period_id)
);
```

**Beneficio del snapshot**:
```typescript
// SIN snapshot (query pesado):
const stats = await supabase
  .from('transactions')
  .select('amount, type')
  .eq('household_id', householdId)
  .eq('year', 2024)
  .eq('month', 5);

// Calcular totales cada vez (lento si hay muchas transactions)

// CON snapshot (query rápido):
const stats = await supabase
  .from('monthly_snapshots')
  .select('total_income, total_expenses, net_balance')
  .eq('household_id', householdId)
  .eq('year', 2024)
  .eq('month', 5)
  .single();

// 1 row, instantáneo
```

**Ajuste necesario**: ⚠️ **OPCIONAL - crear tabla monthly_snapshots + función create_snapshot()**

**Recomendación**: **Implementar en FASE 8** (optimización, no crítico para MVP)

---

### **7. Gestión de Contribuciones Compatible con Cierre**
**Requisito**: Las contribuciones deben respetar el cierre mensual.

**Estado actual**: ✅ **IMPLEMENTADO**

**Evidencia**:
```typescript
// En calculateAndCreateContributions()
1. Se llama a ensure_monthly_period(household_id, year, month)
   - Valida que mes anterior esté cerrado
   - Crea período si no existe (status = 'active')

2. Se calculan contribuciones y se guardan en 'contributions' table
   - Cada contribución tiene: expected_amount, paid_amount, status

3. Al cerrar mes:
   - Contribuciones quedan "congeladas"
   - NO se recalculan en meses futuros
   - Si hay overpaid → se crea credit automáticamente

4. Al cambiar de mes:
   - Se crean nuevas contribuciones para el mes nuevo
   - Se aplican créditos activos (si auto_apply = true)
```

**Flujo completo**:
```
Mes 1 (Octubre):
├─ Calcular contribuciones (esperadas)
├─ Usuario paga gastos (paid_amount aumenta)
├─ Al 31/10: Cerrar mes
│  ├─ Contributions.status final: 'paid', 'partial', 'overpaid'
│  └─ Si overpaid → crear credit

Mes 2 (Noviembre):
├─ ensure_monthly_period() valida que Octubre esté cerrado
├─ Calcular nuevas contribuciones
├─ Aplicar créditos activos (si auto_apply)
└─ Ciclo continúa
```

**RLS Policies** (protección contra ediciones):
```sql
-- Transactions locked NO editables:
CREATE POLICY "Members cannot edit locked transactions"
  ON transactions FOR UPDATE
  USING (
    household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())
    AND status != 'locked'  -- ⚠️ CRÍTICO
  );

-- Similar para contribution_adjustments
```

**Ajuste necesario**: ✅ **NO HAY - ya está implementado**

---

## 📊 Resumen de Ajustes Necesarios

| # | Requisito | Estado | Ajuste | Prioridad |
|---|-----------|--------|--------|-----------|
| 1 | Contribución proporcional | ✅ OK | Ninguno | - |
| 2 | Soporte N miembros | ✅ OK | Ninguno | - |
| 3 | Hogar con 1 miembro | ⚠️ Parcial | Mensaje UI + validación | Media |
| 4 | Tipos de reparto | ❌ Falta | Migración SQL + lógica | **Alta** |
| 5 | Perfil editable | ⚠️ Parcial | Migración display_name + form | **Alta** |
| 6 | Cierre mensual snapshot | ✅ OK | Opcional: tabla snapshots | Baja |
| 7 | Contribuciones + cierre | ✅ OK | Ninguno | - |

---

## 🛠️ Plan de Ajustes

### **Ajuste 1: Agregar Tipo de Cálculo de Contribuciones** ⭐ CRÍTICO

**Archivo**: `supabase/migrations/YYYYMMDDHHMMSS_add_calculation_type.sql`

```sql
-- Agregar columna calculation_type a household_settings
ALTER TABLE household_settings 
ADD COLUMN calculation_type VARCHAR(20) NOT NULL DEFAULT 'proportional'
CHECK (calculation_type IN ('equal', 'proportional', 'custom'));

-- Migración de datos existentes (default: proportional)
-- Ya aplicado con DEFAULT

COMMENT ON COLUMN household_settings.calculation_type IS 
  'Tipo de cálculo: equal (partes iguales), proportional (por ingresos), custom (manual)';
```

**Archivo**: `app/app/contributions/actions.ts`

```typescript
export async function calculateAndCreateContributions(
  householdId: string,
  year: number,
  month: number
): Promise<Result> {
  // ... código existente ...
  
  // 1. Obtener calculation_type
  const { data: settings } = await supabase
    .from('household_settings')
    .select('monthly_contribution_goal, calculation_type')
    .eq('household_id', householdId)
    .single();
  
  if (!settings) return fail('Configuración del hogar no encontrada');
  
  const { monthly_contribution_goal, calculation_type } = settings;
  
  // 2. Obtener miembros
  const { data: members } = await supabase
    .from('household_members')
    .select('profile_id, profiles!inner(display_name)')
    .eq('household_id', householdId);
  
  const membersCount = members?.length ?? 0;
  
  // 3. Calcular según tipo
  const contributionsToCreate = [];
  
  if (calculation_type === 'equal') {
    // Dividir en partes iguales
    const equalAmount = monthly_contribution_goal / membersCount;
    
    for (const member of members) {
      contributionsToCreate.push({
        household_id: householdId,
        profile_id: member.profile_id,
        year,
        month,
        expected_amount: equalAmount,
        calculation_method: 'equal'
      });
    }
    
  } else if (calculation_type === 'proportional') {
    // Lógica actual (ya implementada)
    const totalIncome = /* calcular total */;
    
    for (const member of members) {
      const memberIncome = /* obtener ingreso */;
      const proportion = memberIncome / totalIncome;
      const expectedAmount = proportion * monthly_contribution_goal;
      
      contributionsToCreate.push({
        household_id: householdId,
        profile_id: member.profile_id,
        year,
        month,
        expected_amount: expectedAmount,
        calculation_method: 'proportional'
      });
    }
    
  } else if (calculation_type === 'custom') {
    // Crear contribuciones con amount = 0
    // Usuario las editará manualmente
    for (const member of members) {
      contributionsToCreate.push({
        household_id: householdId,
        profile_id: member.profile_id,
        year,
        month,
        expected_amount: 0,
        calculation_method: 'custom'
      });
    }
  }
  
  // 4. Insertar contribuciones
  const { error } = await supabase
    .from('contributions')
    .insert(contributionsToCreate);
  
  if (error) return fail(error.message);
  
  revalidatePath('/app/contributions');
  return ok();
}
```

**Archivo**: `app/app/contributions/components/ConfigurationSection.tsx`

```tsx
// Agregar selector de tipo de cálculo
<FormSection title="Tipo de Contribución">
  <Select
    value={calculationType}
    onValueChange={setCalculationType}
  >
    <SelectItem value="equal">
      <div>
        <div className="font-medium">Partes Iguales</div>
        <div className="text-xs text-muted-foreground">
          Cada miembro contribuye lo mismo
        </div>
      </div>
    </SelectItem>
    <SelectItem value="proportional">
      <div>
        <div className="font-medium">Proporcional a Ingresos</div>
        <div className="text-xs text-muted-foreground">
          Contribución basada en % de ingresos
        </div>
      </div>
    </SelectItem>
    <SelectItem value="custom">
      <div>
        <div className="font-medium">Personalizado</div>
        <div className="text-xs text-muted-foreground">
          Editar manualmente cada contribución
        </div>
      </div>
    </SelectItem>
  </Select>
</FormSection>
```

---

### **Ajuste 2: Agregar display_name a Profiles** ⭐ CRÍTICO

**Archivo**: `supabase/migrations/YYYYMMDDHHMMSS_add_display_name.sql`

```sql
-- Agregar columna display_name
ALTER TABLE profiles 
ADD COLUMN display_name TEXT;

-- Migración de datos existentes: usar parte antes del @ del email
UPDATE profiles 
SET display_name = SPLIT_PART(email, '@', 1)
WHERE display_name IS NULL;

-- Hacer NOT NULL después de migración
ALTER TABLE profiles 
ALTER COLUMN display_name SET NOT NULL;

COMMENT ON COLUMN profiles.display_name IS 
  'Nombre para mostrar en la app (editable por usuario)';
```

**Archivo**: `app/app/profile/actions.ts` (nuevo o agregar)

```typescript
'use server';
import { supabaseServer, getCurrentUser } from '@/lib/supabaseServer';
import { ok, fail, type Result } from '@/lib/result';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const DisplayNameSchema = z.object({
  display_name: z.string().min(2, 'Nombre debe tener al menos 2 caracteres').max(50)
});

export async function updateDisplayName(formData: FormData): Promise<Result> {
  const parsed = DisplayNameSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return fail('Nombre inválido', parsed.error.flatten().fieldErrors);
  }
  
  const user = await getCurrentUser();
  if (!user) return fail('No autenticado');
  
  const supabase = await supabaseServer();
  
  const { error } = await supabase
    .from('profiles')
    .update({ display_name: parsed.data.display_name })
    .eq('auth_user_id', user.id);
  
  if (error) return fail(error.message);
  
  revalidatePath('/app/profile');
  return ok({ message: 'Nombre actualizado correctamente' });
}
```

**Archivo**: `app/app/profile/components/ProfileForm.tsx` (mejorar)

```tsx
'use client';
import { updateDisplayName } from '../actions';
import { toast } from 'sonner';

export function ProfileForm({ profile }: { profile: Profile }) {
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const result = await updateDisplayName(formData);
    if (!result.ok) {
      toast.error(result.message);
    } else {
      toast.success('Perfil actualizado');
    }
  }
  
  return (
    <form onSubmit={handleSubmit}>
      <FormSection title="Información Personal">
        <Input
          label="Nombre para mostrar"
          name="display_name"
          defaultValue={profile.display_name}
          required
        />
        <Input
          label="Email"
          value={profile.email}
          disabled
          helperText="Para cambiar tu email, contacta soporte"
        />
        <Button type="submit">Guardar Cambios</Button>
      </FormSection>
    </form>
  );
}
```

---

### **Ajuste 3: Validación Hogar con 1 Miembro** (Media prioridad)

**Archivo**: `app/app/contributions/components/ConfigurationSection.tsx`

```tsx
export function ConfigurationSection({ householdId, isOwner, membersCount }: Props) {
  // Si solo 1 miembro, mostrar alerta informativa
  if (membersCount === 1) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Configuración de Contribuciones</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Hogar Individual</AlertTitle>
            <AlertDescription>
              Este hogar tiene un solo miembro. Las contribuciones proporcionales
              solo aplican cuando hay 2 o más miembros.
              <br />
              <Link href="/app/household/invitations" className="underline mt-2 inline-block">
                Invitar miembros →
              </Link>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }
  
  // Resto del componente normal
  return (
    <Card>
      {/* ... configuración normal ... */}
    </Card>
  );
}
```

---

## ✅ Checklist de Validación

Antes de comenzar la implementación, confirmar:

- [x] **Contribución proporcional** → Ya funciona
- [x] **Soporte N miembros** → Ya funciona
- [ ] **Tipo de cálculo (equal/proportional/custom)** → Migración + lógica
- [ ] **display_name editable** → Migración + form
- [ ] **Validación 1 miembro** → Mensaje UI
- [x] **Cierre mensual** → Ya funciona
- [x] **Contribuciones + cierre** → Ya funciona

**Estimación de ajustes**: 90 minutos
- Migración calculation_type: 20 min
- Lógica equal/custom: 30 min
- Migración display_name: 15 min
- ProfileForm mejorado: 20 min
- Validación 1 miembro: 5 min

---

## 🚀 Integración con Plan v2

Estos ajustes se integran en **FASE 0** (antes de comenzar la reestructuración):

```
FASE 0: Ajustes de Lógica de Negocio (90 min)
├─ Migración: add_calculation_type.sql
├─ Migración: add_display_name.sql
├─ Server Action: updateDisplayName()
├─ Lógica: equal/custom en calculateAndCreateContributions()
├─ UI: ConfigurationSection mejorado
└─ UI: ProfileForm mejorado

FASE 1: Reestructuración de Rutas (60 min)
...
```

**¿Aprobamos estos ajustes y comenzamos con FASE 0?** 🎯
