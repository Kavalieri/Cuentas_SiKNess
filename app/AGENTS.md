# Next.js App - Instrucciones Específicas

> **Contexto**: Parte de CuentasSiK (ver `/AGENTS.md` principal)
> **Área**: Frontend + Backend integrados en Next.js App Router

---

## 🏗️ **Arquitectura Next.js 15**

### App Router Structure

```
/app/
├── layout.tsx              # Root layout (global providers)
├── page.tsx               # Dashboard (Server Component)
├── components/
│   ├── DashboardContent.tsx    # Client component con tabs
│   ├── MonthlyFundCard.tsx     # Nuevo en Phase 5
│   ├── PersonalBalanceCard.tsx
│   ├── MyCreditsCard.tsx
│   └── TopBar.tsx              # Navigation + user menu
├── contributions/
│   ├── page.tsx                # Contributions list
│   ├── actions.ts              # Server actions
│   └── components/
├── credits/
│   ├── page.tsx
│   └── actions.ts
├── expenses/
│   ├── page.tsx
│   ├── actions.ts
│   └── components/
├── savings/
│   ├── page.tsx
│   └── actions.ts
└── settings/
    ├── page.tsx                # Server Component
    ├── actions.ts              # Household management actions
    └── components/
        ├── HouseholdConfigSection.tsx
        ├── MembersSection.tsx
        ├── CategoriesDialog.tsx
        └── HouseholdManagement.tsx
```

---

## 🎨 **Patrones de Componentes**

### 1. Server Components (Default)

```typescript
// app/page.tsx
export default async function DashboardPage() {
  // ✅ Fetch data directamente
  const [summary, transactions, members] = await Promise.all([
    getMonthSummary(householdId),
    getTransactions(householdId),
    query(`SELECT * FROM get_household_members_optimized($1)`, [householdId]),
  ]);

  // ✅ Pass data a Client Components via props
  return <DashboardContent summary={summary} transactions={transactions} members={members} />;
}
```

### 2. Client Components (Explicit)

```typescript
// app/components/DashboardContent.tsx
'use client';

import { useState } from 'react';

interface Props {
  summary: MonthSummary;
  transactions: Transaction[];
  members: Member[];
}

export function DashboardContent({ summary, transactions, members }: Props) {
  const [activeTab, setActiveTab] = useState('overview');

  // ✅ Interactividad, state, effects
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      ...
    </Tabs>
  );
}
```

### 3. Server Actions

```typescript
// app/contributions/actions.ts
'use server';

import { query, getCurrentUser, getUserHouseholdId } from '@/lib/supabaseServer';

export async function getMonthlyContributions(householdId: string, year: number, month: number) {
  // ✅ SQL nativo con query()
  const result = await query(
    `
    SELECT
      c.*,
      p.email as user_email
    FROM contributions c
    LEFT JOIN profiles p ON p.id = c.profile_id
    WHERE c.household_id = $1
      AND c.year = $2
      AND c.month = $3
    ORDER BY c.created_at DESC
    `,
    [householdId, year, month],
  );

  if (!result.rows) {
    console.error('[getMonthlyContributions] No data returned');
    return [];
  }

  return result.rows;
}

// ✅ Mutations con revalidatePath
export async function updateContribution(id: string, data: Partial<Contribution>) {
  await query('UPDATE contributions SET ... WHERE id = $1', [id]);

  revalidatePath('/app/contributions');
  return { success: true };
}
```

---

## 🎯 **Dashboard Grid (Fase 5)**

### Estructura Actual

```typescript
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
  {/* Col 1 - Conditional */}
  {balanceBreakdown && (
    <BalanceBreakdown
      totalBalance={balanceBreakdown.totalBalance}
      freeBalance={balanceBreakdown.freeBalance}
      activeCredits={balanceBreakdown.activeCredits}
      reservedCredits={balanceBreakdown.reservedCredits}
    />
  )}

  {/* Col 2 - NEW (Phase 5) */}
  {monthlyFundData && (
    <MonthlyFundCard
      householdId={householdId}
      members={monthlyFundData.members}
      contributions={monthlyFundData.contributions}
      monthlyFund={monthlyFundData.monthlyFund}
      expenses={summary.expenses}
      currency={monthlyFundData.currency} // ⚠️ Pending fix
    />
  )}

  {/* Col 3 */}
  <PersonalBalanceCard householdId={householdId} />

  {/* Col 4 */}
  <MyCreditsCard householdId={householdId} />
</div>
```

### Diseño Compacto para Cards

```typescript
// ✅ Card que se adapta al grid
<Card className="h-full flex flex-col">
  <CardHeader className="pb-3">
    <CardTitle className="text-base">Título</CardTitle>
  </CardHeader>

  <CardContent className="flex-1 overflow-hidden">
    {/* Contenido scrollable si es necesario */}
    <div className="max-h-[200px] overflow-y-auto">...</div>
  </CardContent>
</Card>
```

---

## 🎨 **Estilos con Tailwind**

### Convenciones

```typescript
// ✅ Utility classes, composición
<div className="flex items-center gap-2 rounded-lg border bg-card p-4">
  <Icon className="h-5 w-5 text-muted-foreground" />
  <span className="text-sm font-medium">Texto</span>
</div>

// ❌ NO inline styles
<div style={{ display: 'flex', gap: '8px' }}>

// ❌ NO CSS modules
import styles from './Component.module.css';
```

### Responsive Design

```typescript
// ✅ Mobile-first
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
// Base: 1 col
// md: 2 cols (≥768px)
// lg: 3 cols (≥1024px)

// ✅ Texto responsive
<h1 className="text-xl md:text-2xl lg:text-3xl">

// ✅ Padding responsive
<div className="p-4 md:p-6 lg:p-8">
```

### shadcn/ui Components

```typescript
// ✅ Usar components de shadcn/ui
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

// ✅ Customizar con className
<Button className="bg-green-600 hover:bg-green-700">Acción</Button>;
```

---

## 💾 **Data Loading Patterns**

### Server Component with Multiple Queries

```typescript
export default async function Page() {
  const user = await getCurrentUser();
  const householdId = await getUserHouseholdId();

  // ✅ Promise.all para queries paralelas
  const [summary, transactions, categories, members, contributions, settings] = await Promise.all([
    getMonthSummary(householdId),
    getTransactions(householdId),
    getCategories(householdId),
    query(`SELECT * FROM get_household_members_optimized($1)`, [householdId]),
    getMonthlyContributions(householdId, year, month),
    getHouseholdSettings(householdId),
  ]);

  // ✅ Transformar datos si es necesario
  const monthlyFundData = {
    members: members.rows || [],
    contributions: contributions || [],
    monthlyFund: settings?.monthly_contribution_goal || 0,
    currency: settings?.currency || 'EUR',
  };

  return <ClientComponent data={monthlyFundData} />;
}
```

### Error Handling

```typescript
try {
  const result = await query(...);

  if (!result.rows) {
    console.error('[Component] No data returned');
    return <EmptyState />;
  }

  return <DataComponent data={result.rows} />;
} catch (error) {
  console.error('[Component] Error loading data:', error);
  return <ErrorState error={error} />;
}
```

---

## 🎭 **TypeScript Types**

### Interfaces para Props

```typescript
// ✅ Definir interfaces claras
interface MonthlyFundCardProps {
  householdId: string;
  members: Array<{
    profile_id: string;
    email: string;
    current_income: number | null;
  }>;
  contributions: Array<{
    id: string;
    profile_id: string;
    paid_amount: number;
    expected_amount: number | null;
    status: string;
    adjustments_total?: number | null;
  }>;
  monthlyFund: number;
  expenses: number;
  currency: string;  // ISO 4217 code
}

export function MonthlyFundCard({
  householdId,
  members,
  contributions,
  monthlyFund,
  expenses,
  currency
}: MonthlyFundCardProps) {
  ...
}
```

### Database Types

```typescript
// ✅ Tipos para queries
interface Contribution {
  id: string;
  household_id: string;
  profile_id: string;
  year: number;
  month: number;
  expected_amount: number | null;
  paid_amount: number;
  status: 'pending' | 'paid' | 'overpaid';
  adjustments_total: number | null;
  created_at: string;
  user_email?: string; // From JOIN
}
```

---

## ♊ **Dual-Flow Guidance**

### Esquemas Híbridos

- Detecta columnas nuevas (`monthly_periods.phase`, `monthly_periods.is_current`, `member_monthly_income.amount`) antes de usarlas.
- Usa `information_schema.columns` para validar existencia y ofrece fallback a columnas legacy (`status`, `member_incomes`).
- Evita joins con tablas eliminadas (`users`); usa `household_members` + vistas activas.

```typescript
const metadata = await query<{
  hasPhase: boolean;
  hasIncome: boolean;
}>(
  `
    select
      bool_or(column_name = 'phase') as "hasPhase",
      bool_or(table_name = 'member_monthly_income') as "hasIncome"
    from information_schema.columns
    where table_schema = 'public'
      and table_name in ('monthly_periods', 'member_monthly_income')
  `,
);

const selectPeriod = metadata.rows[0]?.hasPhase
  ? 'select id, phase from monthly_periods order by starts_at desc limit 1'
  : 'select id, status as phase from monthly_periods order by starts_at desc limit 1';

const periodResult = await query(selectPeriod);
```

### API de Notificaciones

- Calcula recuentos sólo desde miembros activos; controla que las CTEs de montos usen la tabla disponible.
- Si `member_monthly_income` no existe, consulta `member_incomes` y castea `null` a `0` en el JSON final.
- Mantén los tipos enteros/decimales consistentes entre DEV y PROD.

### Server Components

- Carga la metadata de compatibilidad en el server y pásala como `caps` a componentes cliente.
- Sigue usando `Suspense` + skeletons en `/app/dual-flow/*` para preservar UX.
- Revalida `/app/dual-flow/*` tras mutaciones que impactan períodos, notificaciones o contribuciones.

---

## 🧮 **Cálculos Comunes**

### Contribuciones con Ajustes

```typescript
const totalContributed = contributions.reduce((sum, c) => {
  // ✅ adjustments_total puede ser negativo
  const adjustments = Math.abs(c.adjustments_total || 0);
  return sum + c.paid_amount + adjustments;
}, 0);
```

### Progreso Porcentual

```typescript
const progress = goal > 0 ? Math.min(100, (current / goal) * 100) : 0;

// ✅ Limitar a 100% para barra de progreso
const clampedProgress = Math.min(progress, 100);
```

### Formateo de Moneda

```typescript
import { formatCurrency } from '@/lib/format';

// ✅ Usar código ISO
const formatted = formatCurrency(amount, 'EUR'); // "1.200,00 €"

// ❌ NO usar símbolo
const wrong = formatCurrency(amount, '€'); // Error!
```

---

## 🎨 **UI Patterns**

### Loading States

```typescript
// ✅ Suspense boundaries
<Suspense fallback={<LoadingSkeleton />}>
  <DataComponent />
</Suspense>;

// ✅ Loading in client component
{
  isLoading ? (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  ) : (
    <DataDisplay data={data} />
  );
}
```

### Empty States

```typescript
{
  items.length === 0 ? (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
      <p className="text-sm text-muted-foreground">No hay datos para mostrar</p>
    </div>
  ) : (
    <ItemsList items={items} />
  );
}
```

### Alert Banners

```typescript
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

<Alert className="border-yellow-500/50 bg-yellow-500/10">
  <AlertTriangle className="h-4 w-4 text-yellow-600" />
  <AlertDescription className="text-yellow-800 dark:text-yellow-200">
    Advertencia importante
  </AlertDescription>
</Alert>;
```

---

## 🔄 **Revalidation**

### Después de Mutations

```typescript
import { revalidatePath } from 'next/cache';

export async function createExpense(data: ExpenseData) {
  await query('INSERT INTO expenses ...', [...]);

  // ✅ Revalidar rutas afectadas
  revalidatePath('/app');              // Dashboard
  revalidatePath('/app/expenses');     // Lista de gastos

  return { success: true };
}
```

### Redirect después de Action

```typescript
import { redirect } from 'next/navigation';

export async function deleteHousehold(id: string) {
  await query('DELETE FROM households WHERE id = $1', [id]);

  revalidatePath('/app/settings');
  redirect('/app'); // Redirigir a dashboard
}
```

---

## 🐛 **Debug en Desarrollo**

### Console Logs Temporales

```typescript
// ✅ Durante desarrollo (ELIMINAR después)
console.log('[DashboardPage] 💰 MonthlyFund Data:', {
  members: members.length,
  contributions: contributions.length,
  monthlyFund,
  currency: settings?.currency,
});

// ✅ En componente
console.log('[MonthlyFundCard] Props recibidas:', {
  members,
  contributions,
  monthlyFund,
  expenses,
  currency,
});
```

### React DevTools

- Ver props en tiempo real
- Inspeccionar state
- Profiler para performance

---

## 📱 **Responsive Cards**

### Height Management

```typescript
// ✅ Card que se adapta al contenedor
<Card className="h-full flex flex-col">
  <CardHeader className="flex-none">
    ...
  </CardHeader>

  <CardContent className="flex-1 overflow-hidden">
    {/* Contenido scrollable */}
    <div className="max-h-[140px] overflow-y-auto pr-1">
      {items.map(item => ...)}
    </div>
  </CardContent>
</Card>
```

### Grid Auto-fit

```typescript
// ✅ Auto-fit en grids
<div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
  {cards.map((card) => (
    <Card key={card.id} />
  ))}
</div>
```

---

## 🎯 **Next Steps (Phase 5 → Phase 6)**

### Pending Phase 5 (5 min)

1. Fix currency prop chain (page.tsx, DashboardContent.tsx)
2. Remove debug logs
3. Test in browser

### Phase 6 (20 min)

1. Verificar que todas las features de `/app/household` están migradas
2. Buscar referencias con grep
3. Eliminar directorio `/app/household`
4. Verificar app funciona sin errores

---

**Última actualización**: 2025-01-15
**Fase actual**: 5 (95% complete)
