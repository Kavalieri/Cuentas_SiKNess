# Sistema de Administración y Contribuciones - Plan de Implementación

## Fecha: 2 de Octubre 2025

---

## 🎯 Objetivos

### 1. Panel de Administración
- ✅ Acceso solo para usuarios con rol `owner`
- ✅ Gestión de miembros del household
- ✅ Cambio de roles (owner, member)
- ✅ Función "wipe" para limpiar datos de testing

### 2. Sistema de Contribuciones (UI)
- ✅ Configurar meta mensual del hogar
- ✅ Configurar ingresos individuales de cada miembro
- ✅ Cálculo automático de contribución proporcional
- ✅ Marcar contribuciones como "pagadas"
- ✅ Dashboard de estado de contribuciones
- ✅ Editable por el propio usuario o por admin

### 3. Sistema de Ajustes y Saldo Real
- ✅ Ajustes manuales a contribuciones
- ✅ Cálculo de saldo disponible considerando:
  - Contribuciones pagadas
  - Gastos anticipados (antes de pagar)
  - Ajustes manuales
- ✅ Indicador visual de "saldo real" vs "saldo proyectado"

---

## 📊 Modelo de Datos (Ya Existe)

### Tablas Actuales

```sql
-- Sistema de contribuciones (ya creado en migración anterior)
member_incomes         -- Ingresos mensuales por miembro
household_settings     -- Meta de contribución mensual
contributions          -- Contribuciones calculadas por miembro/mes
contribution_adjustments -- Ajustes manuales
```

### Campos Clave

**`household_members.role`**:
- `owner` → Admin total (puede hacer wipe, cambiar roles)
- `member` → Usuario normal (solo puede editar su perfil)

**`contributions.status`**:
- `pending` → No pagado
- `partial` → Pagado parcialmente
- `paid` → Pagado completamente
- `overpaid` → Pagado de más

**`contributions.paid_amount`**:
- Monto realmente aportado hasta ahora
- Se actualiza cuando el miembro marca como "pagado"

---

## 🗂️ Estructura de Rutas

```
app/
├─ app/
│  ├─ admin/                    # 🆕 Panel de administración
│  │  ├─ page.tsx              # Dashboard admin
│  │  ├─ layout.tsx            # Verificar rol owner
│  │  ├─ members/              # Gestión de miembros
│  │  │  └─ page.tsx
│  │  ├─ wipe/                 # Herramienta de limpieza
│  │  │  └─ page.tsx
│  │  └─ actions.ts            # Server Actions admin
│  │
│  ├─ contributions/            # 🆕 Sistema de contribuciones
│  │  ├─ page.tsx              # Dashboard principal
│  │  ├─ actions.ts            # Ya existe (creado antes)
│  │  └─ components/
│  │     ├─ ConfigurationTab.tsx    # Configurar meta e ingresos
│  │     ├─ StatusTab.tsx            # Estado mensual de contribuciones
│  │     ├─ HistoryTab.tsx           # Historial de meses anteriores
│  │     ├─ IncomeForm.tsx           # Formulario de ingreso individual
│  │     ├─ GoalForm.tsx             # Formulario de meta mensual
│  │     └─ ContributionCard.tsx     # Card de contribución por miembro
│  │
│  ├─ profile/                  # 🆕 Perfil personal
│  │  ├─ page.tsx              # Ver/editar propio ingreso
│  │  └─ actions.ts
│  │
│  └─ layout.tsx               # Añadir enlaces admin/contributions
```

---

## 🔐 Sistema de Permisos

### Middleware de Admin

```typescript
// lib/adminCheck.ts
export async function isOwner(): Promise<boolean> {
  const supabase = await supabaseServer();
  const user = await getCurrentUser();
  if (!user) return false;

  const { data } = await supabase
    .from('household_members')
    .select('role')
    .eq('user_id', user.id)
    .single();

  return data?.role === 'owner';
}
```

### Layout Admin

```typescript
// app/app/admin/layout.tsx
export default async function AdminLayout({ children }) {
  const isAdmin = await isOwner();
  
  if (!isAdmin) {
    redirect('/app');
  }

  return <>{children}</>;
}
```

---

## 🎨 UI de Contribuciones

### Dashboard Principal (Tabs)

```typescript
// app/app/contributions/page.tsx
<Tabs defaultValue="status">
  <TabsList>
    <TabsTrigger value="status">Estado Actual</TabsTrigger>
    <TabsTrigger value="config">Configuración</TabsTrigger>
    <TabsTrigger value="history">Historial</TabsTrigger>
  </TabsList>

  <TabsContent value="status">
    <StatusTab /> {/* Estado del mes actual */}
  </TabsContent>

  <TabsContent value="config">
    <ConfigurationTab /> {/* Meta e ingresos */}
  </TabsContent>

  <TabsContent value="history">
    <HistoryTab /> {/* Meses anteriores */}
  </TabsContent>
</Tabs>
```

### Tab de Estado (Mes Actual)

```typescript
// Muestra:
- Meta mensual: 2000€
- Ingresos totales: 4000€
- Contribuciones por miembro:
  - Usuario A (1500€ ingreso) → 750€ (37.5%) [✅ PAGADO]
  - Usuario B (2500€ ingreso) → 1250€ (62.5%) [⏳ PENDIENTE]
- Saldo disponible: 750€ (solo lo pagado)
- Gastos del mes: 500€
- Saldo restante: 250€
```

### Tab de Configuración

```typescript
// Sección 1: Meta Mensual
<GoalForm 
  currentGoal={2000}
  onSave={updateGoal}
/>

// Sección 2: Ingresos Individuales
<div>
  {members.map(member => (
    <IncomeForm
      member={member}
      currentIncome={member.income}
      onSave={updateIncome}
      canEdit={isOwner || member.id === currentUserId}
    />
  ))}
</div>
```

### Card de Contribución

```typescript
<ContributionCard
  member={member}
  contribution={{
    expected: 750,
    paid: 750,
    status: 'paid',
    percentage: 37.5
  }}
  onMarkPaid={markAsPaid}
  canMarkPaid={isOwner || member.id === currentUserId}
/>

// Muestra:
// [Avatar] Usuario A
// Ingreso mensual: 1500€
// Contribución: 750€ (37.5%)
// Estado: ✅ Pagado
// [Botón: Marcar como no pagado]
```

---

## 🧮 Lógica de Saldo Real

### Concepto

```
SALDO DISPONIBLE = 
  Σ(Contribuciones PAGADAS) 
  - Σ(Gastos del mes)
  + Σ(Ajustes positivos)
  - Σ(Ajustes negativos)
```

### Implementación

```typescript
// lib/balance.ts
export async function calculateRealBalance(
  householdId: string,
  month: Date
): Promise<{
  contributionsPaid: number;
  contributionsPending: number;
  expenses: number;
  adjustments: number;
  realBalance: number;
  projectedBalance: number;
}> {
  // 1. Obtener contribuciones del mes
  const contributions = await getMonthContributions(householdId, month);
  const paid = contributions.filter(c => c.status === 'paid' || c.status === 'overpaid');
  const contributionsPaid = sum(paid.map(c => c.paid_amount));
  const contributionsPending = sum(contributions.map(c => c.expected_amount - c.paid_amount));

  // 2. Obtener gastos del mes
  const expenses = await getMonthExpenses(householdId, month);
  const totalExpenses = sum(expenses.map(e => e.amount));

  // 3. Obtener ajustes del mes
  const adjustments = await getMonthAdjustments(householdId, month);
  const totalAdjustments = sum(adjustments.map(a => a.amount));

  // 4. Calcular balances
  const realBalance = contributionsPaid - totalExpenses + totalAdjustments;
  const projectedBalance = (contributionsPaid + contributionsPending) - totalExpenses + totalAdjustments;

  return {
    contributionsPaid,
    contributionsPending,
    expenses: totalExpenses,
    adjustments: totalAdjustments,
    realBalance,
    projectedBalance
  };
}
```

---

## 🔄 Flujo de Uso

### Configuración Inicial (Admin)

1. Admin va a `/app/contributions`
2. Tab "Configuración"
3. Establece meta mensual: 2000€
4. Para cada miembro, establece ingreso:
   - Usuario A: 1500€/mes
   - Usuario B: 2500€/mes
5. Sistema calcula automáticamente:
   - A debe aportar: 750€ (37.5%)
   - B debe aportar: 1250€ (62.5%)

### Uso Mensual (Usuarios)

1. Inicio de mes → Contribuciones en estado `pending`
2. Usuario A hace su ingreso bancario
3. Usuario A va a `/app/contributions` o `/app/profile`
4. Marca su contribución como "Pagada" (750€)
5. Sistema actualiza:
   - `contributions.paid_amount = 750`
   - `contributions.status = 'paid'`
   - Saldo disponible += 750€
6. Usuario B aún no ha pagado
7. Dashboard muestra:
   - Saldo real: 750€ (solo A)
   - Saldo proyectado: 2000€ (A + B)
   - Disponible para gastar: 750€

### Gastos Anticipados

1. Usuario B hace un gasto de 300€ ANTES de pagar su contribución
2. Sistema registra el gasto normalmente
3. Saldo real: 750€ - 300€ = 450€
4. Cuando B pague su contribución (1250€):
   - Saldo real: 450€ + 1250€ = 1700€

### Ajustes Manuales (Admin)

1. Admin necesita hacer un ajuste (ej: reembolso)
2. Va a `/app/contributions`
3. Añade ajuste: +100€ (Reembolso de compra)
4. Saldo real += 100€

---

## 🗑️ Sistema de Wipe (Admin)

### Función SQL

```sql
-- Migración: create_wipe_function.sql
create or replace function wipe_household_data(p_household_id uuid)
returns json
language plpgsql
security definer
as $$
begin
  -- Verificar que el usuario es owner
  if not exists (
    select 1 from household_members
    where household_id = p_household_id
    and user_id = auth.uid()
    and role = 'owner'
  ) then
    raise exception 'Solo el owner puede hacer wipe';
  end if;

  -- Eliminar datos (en orden de dependencias)
  delete from contribution_adjustments where household_id = p_household_id;
  delete from contributions where household_id = p_household_id;
  delete from member_incomes where household_id = p_household_id;
  delete from household_settings where household_id = p_household_id;
  delete from movements where household_id = p_household_id;
  delete from categories where household_id = p_household_id;

  -- Recrear categorías por defecto
  perform create_default_categories(p_household_id);

  return json_build_object(
    'success', true,
    'message', 'Datos limpiados correctamente'
  );
end;
$$;

grant execute on function wipe_household_data(uuid) to authenticated;
```

### UI de Wipe

```typescript
// app/app/admin/wipe/page.tsx
<Card className="border-destructive">
  <CardHeader>
    <CardTitle>⚠️ Limpiar Datos del Hogar</CardTitle>
    <CardDescription>
      Esta acción eliminará TODOS los datos del hogar excepto miembros.
      Solo para testing. NO SE PUEDE DESHACER.
    </CardDescription>
  </CardHeader>
  <CardContent>
    <ul>
      <li>✓ Movimientos (gastos/ingresos)</li>
      <li>✓ Contribuciones</li>
      <li>✓ Ingresos configurados</li>
      <li>✓ Ajustes</li>
      <li>✗ Miembros (se mantienen)</li>
      <li>✓ Categorías (se recrean las por defecto)</li>
    </ul>
  </CardContent>
  <CardFooter>
    <Button 
      variant="destructive"
      onClick={handleWipe}
      disabled={!confirmed}
    >
      🗑️ Limpiar Datos
    </Button>
  </CardFooter>
</Card>
```

---

## 📋 Orden de Implementación

### Fase 1: Panel Admin Básico ✅
1. Crear `lib/adminCheck.ts`
2. Crear `app/app/admin/layout.tsx`
3. Crear `app/app/admin/page.tsx` (dashboard simple)
4. Añadir enlace en navegación (solo si es owner)

### Fase 2: Wipe Function ✅
1. Crear migración con función `wipe_household_data()`
2. Crear `app/app/admin/wipe/page.tsx`
3. Crear Server Action para ejecutar wipe
4. Añadir confirmación con input de texto

### Fase 3: UI de Contribuciones ✅
1. Crear estructura de tabs en `/app/contributions/page.tsx`
2. Crear `ConfigurationTab` (meta + ingresos)
3. Crear `StatusTab` (estado actual)
4. Crear componentes auxiliares (forms, cards)
5. Integrar con Server Actions existentes

### Fase 4: Sistema de Saldo Real ✅
1. Crear `lib/balance.ts` con lógica de cálculo
2. Añadir al StatusTab indicadores de saldo
3. Mostrar en dashboard principal
4. Añadir alertas si saldo es negativo

### Fase 5: Gestión de Miembros (Admin) 🔄
1. Crear `app/app/admin/members/page.tsx`
2. Listar miembros con roles
3. Permitir cambiar roles (owner ↔ member)
4. Permitir eliminar miembros (con confirmación)

---

## 🎨 Componentes Nuevos Necesarios

- `AdminLayout` - Layout con verificación de permisos
- `AdminNav` - Navegación específica de admin
- `GoalForm` - Formulario de meta mensual
- `IncomeForm` - Formulario de ingreso individual
- `ContributionCard` - Card de estado de contribución
- `BalanceIndicator` - Indicador visual de saldo
- `StatusBadge` - Badge de estado (paid, pending, etc.)
- `WipeConfirmDialog` - Dialog de confirmación para wipe
- `MemberRoleSelect` - Select para cambiar rol

---

## 🚀 Empezamos

¿Por dónde quieres que empiece?

1. **Fase 1: Panel Admin** (estructura base, verificación de permisos)
2. **Fase 2: Wipe Function** (función de limpieza para testing)
3. **Fase 3: UI de Contribuciones** (la más compleja, la estrella)
4. **Todo junto** (implementación completa en orden)

Recomiendo empezar por **Fase 1 + Fase 2** (admin + wipe), y luego hacer **Fase 3** (contribuciones) que es la más importante.
