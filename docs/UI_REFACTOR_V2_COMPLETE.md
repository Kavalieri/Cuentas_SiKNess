# 🎨 Plan de Refactorización UI v2 - CuentasSiK
## **Sesión Completa: Arquitectura + Funcionalidad + UX**

**Fecha**: 7 octubre 2025  
**Contexto**: Refactor v1 creó componentes modulares pero la navegación es confusa y faltan funcionalidades clave  
**Objetivo**: Crear una arquitectura de información intuitiva + implementar TODAS las interacciones

---

## 🔍 Análisis: ¿Qué Falló en v1?

### **Problemas Identificados**

1. **❌ Navegación Confusa**:
   - Contribuciones dentro de Hogar (no es intuitivo)
   - 3 niveles de tabs (Hogar → Contribuciones → Ajustes/Créditos)
   - Usuario no sabe dónde encontrar cada cosa

2. **❌ Funcionalidades Incompletas**:
   - Transacciones: NO se pueden editar ni eliminar
   - Ajustes: NO se pueden aprobar ni rechazar
   - Créditos: Dialog vacío, no hace nada
   - Ahorro: Sistema completo invisible (NO hay UI)
   - Filtros: Solo UI, no filtran realmente

3. **❌ UX Fragmentada**:
   - Información importante escondida en sub-rutas
   - No hay vista general clara del estado del hogar
   - Demasiados clicks para acciones comunes

---

## 🎯 Benchmarking: Apps de Gastos Compartidos

### **Splitwise** (Líder del mercado)
```
Estructura:
├─ Dashboard → Balance total + deudas
├─ Groups → Lista de grupos
├─ Activity → Historial de transacciones
└─ Account → Configuración

UX clave:
✅ Balance siempre visible en hero
✅ 3 clicks máximo para cualquier acción
✅ Navegación plana (no tabs anidados)
✅ Quick actions en dashboard
```

### **Tricount** (Viajes/Eventos)
```
Estructura:
├─ Trip Dashboard → Balance + participantes + gastos
├─ Add Expense → Form simple
├─ Balances → Quién debe a quién
└─ Settings → Moneda, categorías

UX clave:
✅ Todo el trip en UNA página (scroll largo pero claro)
✅ Add expense siempre accesible (FAB)
✅ Balance visual con colores (verde/rojo)
```

### **YNAB** (Presupuesto personal)
```
Estructura:
├─ Budget → Categorías + asignaciones
├─ Accounts → Cuentas bancarias
├─ Reports → Gráficos
└─ Settings

UX clave:
✅ Vista principal es lo más importante (budget)
✅ Acciones inline (no dialogs innecesarios)
✅ Todo editable directamente
```

### **Patrón Común Identificado**

**3 Principios Universales**:
1. **Jerarquía Plana**: Máximo 2 niveles de navegación
2. **Información Crítica Arriba**: Balance/estado siempre visible
3. **Acciones Rápidas**: Añadir gasto en ≤2 clicks

---

## 🏗️ Nueva Arquitectura de Información

### **Estructura Propuesta: "Hub Central + Satélites"**

```
┌─────────────────────────────────────────────────────────────┐
│  NIVEL 1: Main Navigation (5 rutas principales)             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. 💰 Balance      → /app                                  │
│     └─ Dashboard con info crítica + quick actions          │
│                                                              │
│  2. 💸 Gastos       → /app/expenses                         │
│     └─ Lista completa + filtros + add/edit/delete          │
│                                                              │
│  3. 🤝 Hogar        → /app/household                        │
│     └─ Contribuciones + Ajustes + Créditos + Ahorro        │
│        (TODO en UNA página con sections)                    │
│                                                              │
│  4. 📊 Reportes     → /app/reports                          │
│     └─ Gráficos + análisis + export                        │
│                                                              │
│  5. ⚙️ Ajustes      → /app/settings                         │
│     └─ Categorías + miembros + preferencias                │
│                                                              │
└─────────────────────────────────────────────────────────────┘

Mobile Bottom Nav (5 items):
┌──────┬──────┬──────┬──────┬──────┐
│ 💰   │ 💸   │ 🏠   │ 📊   │ ⚙️   │
│Balance│Gastos│Hogar │Report│Ajust │
└──────┴──────┴──────┴──────┴──────┘
```

### **Comparación: Antes vs Después**

| Ruta | v1 (Confuso) | v2 (Intuitivo) |
|------|--------------|----------------|
| **Balance** | `/app` (gráficos pesados) | `/app` (hero + breakdown + recent) |
| **Transacciones** | `/app/transactions` ✅ | `/app/expenses` (rename) |
| **Contribuciones** | `/app/contributions` → tabs | `/app/household` → sections |
| **Ajustes** | `/app/contributions/adjustments` | `/app/household#adjustments` |
| **Créditos** | `/app/contributions/credits` | `/app/household#credits` |
| **Ahorro** | ❌ NO EXISTE | `/app/household#savings` |
| **Reportes** | `/app` (mezclado) | `/app/reports` (dedicado) |
| **Configuración** | `/app/settings` ✅ | `/app/settings` (mejorado) |

---

## 📐 Diseño Detallado de Cada Ruta

### **1. /app (Balance Central)** ⭐ PÁGINA PRINCIPAL

**Objetivo**: Vista rápida del estado financiero personal

**Secciones**:

```tsx
┌─────────────────────────────────────────┐
│  Header                                  │
│  - MonthSelector (izq)                  │
│  - AddTransactionButton (der)           │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Hero: Mi Balance                       │
│  ┌─────────────────────────────────┐   │
│  │  TU BALANCE ACTUAL              │   │
│  │  +350,00 € (verde si +, rojo -)│   │
│  │  ↑ +12% vs mes anterior         │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Balance Breakdown (4 cards grid)       │
│  ┌─────────┐ ┌─────────┐               │
│  │Ingresos │ │ Gastos  │               │
│  │2.500 €  │ │-1.800 € │               │
│  └─────────┘ └─────────┘               │
│  ┌─────────┐ ┌─────────┐               │
│  │Mi Contr.│ │ Pagado  │               │
│  │1.000 €  │ │ 950 €   │               │
│  └─────────┘ └─────────┘               │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Quick Actions (3 botones grandes)      │
│  [+ Añadir Gasto] [Ver Desglose]       │
│  [Ver Contribución]                     │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Últimas Transacciones (5 items)        │
│  → TransactionItem (compact variant)    │
│  Footer: [Ver todas →]                  │
└─────────────────────────────────────────┘
```

**Componentes**:
- `BalanceHero.tsx` (100 líneas) - Hero con balance principal
- `BalanceBreakdown.tsx` (80 líneas) - 4 StatCards
- `QuickActions.tsx` (50 líneas) - Botones rápidos
- `RecentTransactionsList.tsx` (60 líneas) - Últimas 5

**NO incluir**:
- ❌ Gráficos pesados (van en /reports)
- ❌ Filtros avanzados (van en /expenses)
- ❌ Onboarding cards (ya completado)

---

### **2. /app/expenses (Gestión de Gastos)** ⭐ FUNCIONALIDAD COMPLETA

**Objetivo**: CRUD completo de transacciones con filtros

**Secciones**:

```tsx
┌─────────────────────────────────────────┐
│  Header                                  │
│  - SearchBar (busca por descripción)    │
│  - FilterButton (abre panel lateral)    │
│  - AddButton (dialog crear)             │
│  - ExportButton (PDF/CSV)               │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Active Filters (pills removibles)      │
│  [Categoría: Supermercado X]            │
│  [Tipo: Gasto X] [Limpiar Todo]         │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Transactions List                       │
│  - Mobile: Cards (TransactionItem)      │
│  - Desktop: Table con sorting           │
│  - Cada item: [Edit] [Delete] buttons   │
│  - Paginación: 50 items/página          │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Dialogs (modales)                       │
│  - AddTransactionDialog ✅ (existente)  │
│  - EditTransactionDialog ⭐ NUEVO       │
│  - DeleteConfirmDialog ⭐ NUEVO         │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  FilterPanel (Sheet lateral)             │
│  - Tipo: expense/income                 │
│  - Categoría: Select multiple           │
│  - Rango fechas: from/to                │
│  - Monto: min/max                       │
│  - Pagado por: Select member            │
│  - [Limpiar] [Aplicar] buttons          │
└─────────────────────────────────────────┘
```

**Componentes Nuevos a Crear**:
1. **EditTransactionDialog.tsx** (200 líneas) ⭐ CRÍTICO
   - Carga datos actuales de la transacción
   - Form con React Hook Form + Zod
   - Validación de fechas (no editar si período locked)
   - Submit: `updateTransaction()` Server Action

2. **DeleteTransactionDialog.tsx** (80 líneas) ⭐ CRÍTICO
   - Confirmación con detalles de la transacción
   - Warning si es transaction de ajuste (dual transaction)
   - Submit: `deleteTransaction()` Server Action

3. **TransactionsHeader.tsx** (mejorado - 100 líneas)
   - SearchBar con debounce (500ms)
   - FilterButton con badge (contador de filtros activos)
   - AddButton
   - ExportButton con dropdown (PDF/CSV)

4. **ActiveFilters.tsx** (60 líneas) ⭐ NUEVO
   - Pills para cada filtro activo
   - Click en X para remover filtro individual
   - Botón "Limpiar Todo"

**Funcionalidad a Implementar**:

```typescript
// Server Actions (ya existen pero mejorar)
export async function updateTransaction(
  transactionId: string, 
  formData: FormData
): Promise<Result> {
  // 1. Validar ownership (solo quien creó puede editar)
  // 2. Verificar status !== 'locked'
  // 3. Validar datos con Zod
  // 4. UPDATE en Supabase
  // 5. revalidatePath('/app/expenses')
}

export async function deleteTransaction(
  transactionId: string
): Promise<Result> {
  // 1. Verificar ownership
  // 2. Verificar status !== 'locked'
  // 3. Si es adjustment dual, avisar (no permitir o borrar ambas)
  // 4. DELETE en Supabase
  // 5. revalidatePath('/app/expenses')
}
```

**Mejoras de Filtros** (hacerlos funcionales):

```typescript
// En page.tsx (Server Component)
export default async function ExpensesPage({
  searchParams
}: {
  searchParams: {
    search?: string;
    type?: 'expense' | 'income';
    category?: string;
    from?: string;
    to?: string;
    min?: string;
    max?: string;
    paid_by?: string;
    page?: string;
  }
}) {
  const householdId = await getUserHouseholdId();
  
  // Construir query con filtros
  let query = supabase
    .from('transactions')
    .select('*, category:categories(*), profile:profiles(*)', { count: 'exact' })
    .eq('household_id', householdId)
    .order('occurred_at', { ascending: false });
  
  // Aplicar filtros si existen
  if (searchParams.search) {
    query = query.ilike('description', `%${searchParams.search}%`);
  }
  if (searchParams.type) {
    query = query.eq('type', searchParams.type);
  }
  if (searchParams.category) {
    query = query.eq('category_id', searchParams.category);
  }
  if (searchParams.from) {
    query = query.gte('occurred_at', searchParams.from);
  }
  if (searchParams.to) {
    query = query.lte('occurred_at', searchParams.to);
  }
  if (searchParams.min) {
    query = query.gte('amount', parseFloat(searchParams.min));
  }
  if (searchParams.max) {
    query = query.lte('amount', parseFloat(searchParams.max));
  }
  if (searchParams.paid_by) {
    query = query.eq('paid_by', searchParams.paid_by);
  }
  
  // Paginación
  const page = parseInt(searchParams.page || '1');
  const limit = 50;
  const from = (page - 1) * limit;
  query = query.range(from, from + limit - 1);
  
  const { data, count } = await query;
  
  return <ExpensesContent 
    transactions={data}
    totalCount={count}
    currentPage={page}
    activeFilters={searchParams}
  />;
}
```

---

### **3. /app/household (Hub Central del Hogar)** ⭐ TODO EN UNA PÁGINA

**Objetivo**: Vista completa de contribuciones, ajustes, créditos y ahorro

**Filosofía**: Inspirado en Tricount - scroll largo pero TODO visible

**Secciones** (orden de importancia):

```tsx
┌─────────────────────────────────────────┐
│  1. HERO: Tu Contribución                │
│  ┌─────────────────────────────────┐   │
│  │  TU CONTRIBUCIÓN ESTE MES       │   │
│  │  1.000,00 € / 1.000,00 €        │   │
│  │  Progress bar: 95% (950€ pagado)│   │
│  │  ⚠️ Faltan 50€ por pagar        │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  2. Miembros del Hogar                   │
│  ┌─────────────────────────────────┐   │
│  │  MIEMBRO 1 (tú)                 │   │
│  │  Ingreso: 2.500€ | Contr: 1.000€│   │
│  │  Pagado: 950€ | Falta: 50€      │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │  MIEMBRO 2 (pareja)             │   │
│  │  Ingreso: 1.500€ | Contr: 600€  │   │
│  │  Pagado: 650€ | Sobra: +50€     │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  3. Configuración (solo owners)          │
│  - Meta mensual: 2.000€                 │
│  - Tipo cálculo: Proporcional           │
│  - [Editar Meta] [Calcular Contribuc.]  │
│  - Ingresos por miembro (inline edit)   │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  4. Ajustes Pendientes ⚠️                │
│  (solo si hay pending adjustments)       │
│  ┌─────────────────────────────────┐   │
│  │  Pre-pago Supermercado - 50€    │   │
│  │  Solicitado por: Miembro 2      │   │
│  │  [Aprobar] [Rechazar]           │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  5. Mis Ajustes (historial)              │
│  (agrupados por estado)                  │
│  - Activos (2)                          │
│  - Aplicados (5)                        │
│  - Cancelados (1)                       │
│  [+ Crear Ajuste]                       │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  6. Mis Créditos                         │
│  (solo si hay créditos activos)          │
│  ┌─────────────────────────────────┐   │
│  │  Crédito de octubre              │   │
│  │  +50,00 €                        │   │
│  │  Decisión: Aplicar al mes       │   │
│  │  [Gestionar]                     │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  7. Fondo de Ahorro del Hogar 💰         │
│  ┌─────────────────────────────────┐   │
│  │  Balance: 1.250,00 €            │   │
│  │  Meta: 5.000€ (Vacaciones)      │   │
│  │  Progress: 25%                   │   │
│  │  [Depositar] [Retirar]          │   │
│  └─────────────────────────────────┘   │
│                                          │
│  Últimos Movimientos:                   │
│  - Depósito manual: +200€ (5 oct)      │
│  - Transfer crédito: +50€ (3 oct)      │
│  [Ver Historial Completo]              │
└─────────────────────────────────────────┘
```

**Componentes a Crear**:

1. **HouseholdContent.tsx** (Orchestrator - 200 líneas)
   - Carga TODOS los datos necesarios
   - Estado: contributions, adjustments, credits, savings
   - Coordina las 7 secciones

2. **ContributionHero.tsx** (mejorado - 120 líneas)
   - Tu contribución con progress bar animada
   - Warning si falta pagar
   - Success si completado

3. **MembersGrid.tsx** (nuevo - 100 líneas)
   - Grid responsive (1 col móvil, 2 col desktop)
   - MemberCard mejorado con inline editing (owners)

4. **ConfigurationSection.tsx** (refactorizado - 150 líneas)
   - Meta + tipo cálculo
   - Ingresos inline (no dialog separado)
   - Botón calcular contribuciones

5. **PendingAdjustmentsAlert.tsx** (nuevo - 100 líneas) ⭐ CRÍTICO
   - Solo visible si isOwner && hay pending adjustments
   - Cada adjustment con [Aprobar] [Rechazar]
   - Approve/Reject inline (no dialog)

6. **MyAdjustmentsSection.tsx** (refactorizado - 180 líneas)
   - Lista agrupada por estado (Activos, Aplicados, Cancelados)
   - [+ Crear Ajuste] abre AddAdjustmentDialog
   - Cada item con badge de estado

7. **MyCreditsSection.tsx** (refactorizado - 150 líneas)
   - Solo visible si hay créditos activos
   - Lista con CreditItem
   - [Gestionar] abre ManageCreditDialog FUNCIONAL

8. **SavingsFundSection.tsx** (nuevo - 200 líneas) ⭐ CRÍTICO
   - Balance + meta + progress bar
   - [Depositar] [Retirar] abren dialogs
   - Últimos 5 movimientos
   - Link "Ver Historial Completo" → expande lista inline

**Funcionalidad a Implementar**:

```typescript
// Approve/Reject Adjustments (Server Actions)
export async function approveAdjustment(
  adjustmentId: string
): Promise<Result> {
  // 1. Verificar isOwner
  // 2. Verificar adjustment.status === 'pending'
  // 3. UPDATE status = 'active'
  // 4. Crear notification para el miembro
  // 5. revalidatePath('/app/household')
}

export async function rejectAdjustment(
  adjustmentId: string,
  reason: string
): Promise<Result> {
  // 1. Verificar isOwner
  // 2. Verificar adjustment.status === 'pending'
  // 3. UPDATE status = 'cancelled'
  // 4. Crear notification con reason
  // 5. revalidatePath('/app/household')
}

// Manage Credit Decision
export async function updateCreditDecision(
  creditId: string,
  decision: 'apply_to_month' | 'keep_active' | 'transfer_to_savings'
): Promise<Result> {
  // 1. Verificar ownership del credit
  // 2. UPDATE monthly_decision
  // 3. Si es transfer_to_savings, ejecutar transferCreditToSavings()
  // 4. revalidatePath('/app/household')
}

// Savings Actions (ya existen en app/savings/actions.ts, mover a household)
export async function depositToSavings(
  amount: number,
  description: string
): Promise<Result> { /* ... */ }

export async function withdrawFromSavings(
  amount: number,
  reason: string,
  createTransaction: boolean
): Promise<Result> { /* ... */ }
```

---

### **4. /app/reports (Análisis y Gráficos)** ⭐ NUEVO

**Objetivo**: Visualización de datos históricos

**Secciones**:

```tsx
┌─────────────────────────────────────────┐
│  Header                                  │
│  - DateRangePicker (últimos 3/6/12 m)  │
│  - ExportButton (PDF con gráficos)      │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  1. Resumen del Período                  │
│  (4 StatCards con comparativas)          │
│  - Total Ingresos (vs período anterior) │
│  - Total Gastos (vs período anterior)   │
│  - Balance (vs período anterior)        │
│  - Ahorro neto (nuevo vs anterior)      │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  2. Tendencia de Gastos                  │
│  (Recharts LineChart)                    │
│  - Línea: Gastos mensuales              │
│  - Línea: Ingresos mensuales            │
│  - Área: Balance (zona verde/roja)      │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  3. Gastos por Categoría                 │
│  (Recharts PieChart)                     │
│  - Top 5 categorías + "Otros"           │
│  - Porcentajes y montos                 │
│  - Click → drill-down a transacciones   │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  4. Contribuciones Históricas            │
│  (Recharts BarChart)                     │
│  - Por miembro                           │
│  - Esperado vs Real                      │
│  - Últimos 6 meses                       │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  5. Top Categorías (Table)               │
│  - Ranking de categorías más usadas     │
│  - Total gastado + % del total           │
│  - Transacciones count                   │
└─────────────────────────────────────────┘
```

**Componentes**:
- `ReportsContent.tsx` (Orchestrator - 150 líneas)
- `PeriodSummary.tsx` (4 StatCards - 80 líneas)
- `TrendChart.tsx` (LineChart - 120 líneas)
- `CategoryPieChart.tsx` (PieChart - 100 líneas)
- `ContributionsBarChart.tsx` (BarChart - 120 líneas)
- `TopCategoriesTable.tsx` (Table - 80 líneas)

---

### **5. /app/settings (Configuración)** ⭐ MEJORAR

**Objetivo**: Gestión de categorías, miembros, preferencias

**Secciones actuales** (ya existen):
- Categorías (CRUD)
- Miembros del hogar (invitaciones, roles)
- Preferencias (moneda, zona horaria)

**Mejoras a implementar**:
- ✅ Inline editing de categorías (no dialog)
- ✅ Drag & drop para reordenar categorías
- ✅ Archive categories en vez de delete (con confirmation)

---

## 🔧 Funcionalidades Faltantes - Checklist Completo

### **Alta Prioridad** (CRÍTICAS)

- [ ] **Edit Transaction** (`EditTransactionDialog.tsx`)
  - Form con datos precargados
  - Validación de período locked
  - Server Action: `updateTransaction()`

- [ ] **Delete Transaction** (`DeleteTransactionDialog.tsx`)
  - Confirmación con detalles
  - Warning si es dual transaction
  - Server Action: `deleteTransaction()`

- [ ] **Approve/Reject Adjustments** (`PendingAdjustmentsAlert.tsx`)
  - Botones inline para owners
  - Server Actions: `approveAdjustment()`, `rejectAdjustment()`

- [ ] **Manage Credit Decision** (`ManageCreditDialog.tsx` funcional)
  - Form con RadioGroup de decisiones
  - Toggle auto_apply
  - Server Action: `updateCreditDecision()`

- [ ] **Savings Module** (Sistema completo)
  - `SavingsFundSection.tsx` en `/app/household`
  - Dialogs: `DepositDialog.tsx`, `WithdrawDialog.tsx`
  - Server Actions: `depositToSavings()`, `withdrawFromSavings()`
  - Historial de movimientos con paginación

- [ ] **Filtros Reales** (`/app/expenses`)
  - Query con searchParams en `page.tsx`
  - `ActiveFilters.tsx` component
  - SearchBar con debounce

### **Media Prioridad** (IMPORTANTES)

- [ ] **Reports Module** (`/app/reports`)
  - 5 componentes de visualización
  - Integración Recharts con datos reales
  - Export PDF con gráficos

- [ ] **Inline Editing** (varios lugares)
  - Ingresos de miembros (en `/app/household`)
  - Categorías (en `/app/settings`)
  - Meta mensual (en `/app/household`)

- [ ] **Notifications System** (futuro)
  - Toast notifications para acciones (ya existe con sonner)
  - Persistencia de notificaciones importantes

### **Baja Prioridad** (NICE TO HAVE)

- [ ] **Virtualización** (listas >100 items)
  - react-window en `/app/expenses`

- [ ] **Drag & Drop** (categorías)
  - dnd-kit en `/app/settings`

- [ ] **Keyboard Shortcuts**
  - `Cmd+K` → Quick search
  - `N` → New transaction

---

## 🗺️ Plan de Implementación

### **FASE 1: Reestructuración de Rutas** (60 min)

**Objetivos**:
- Renombrar y reorganizar rutas existentes
- Crear estructura de `/app/household`
- Eliminar tabs anidados

**Pasos**:

1. **Renombrar `/app/transactions` → `/app/expenses`**
   ```bash
   mv app/app/transactions app/app/expenses
   ```

2. **Crear `/app/household` consolidado**
   ```bash
   mkdir -p app/app/household/components
   ```

3. **Mover componentes de contributions**
   ```bash
   # Mover ContributionsContent → HouseholdContent
   # Integrar adjustments y credits inline (NO sub-rutas)
   ```

4. **Actualizar navegación**
   - `MobileBottomNav.tsx`: Cambiar items
   - `layout.tsx`: Header links

5. **Crear `/app/reports`**
   ```bash
   mkdir -p app/app/reports/components
   ```

**Resultado**: Estructura plana, navegación clara

---

### **FASE 2: Funcionalidad de Transacciones** (90 min)

**Objetivos**:
- Edit/Delete transacciones funcionales
- Filtros reales con searchParams
- ActiveFilters component

**Pasos**:

1. **Crear `EditTransactionDialog.tsx`** (60 min)
   - Cargar datos de transaction existente
   - Form con React Hook Form + Zod
   - Validación de fecha (no editar si locked)
   - Submit: `updateTransaction()` Server Action
   - Testing: Editar varias transacciones

2. **Crear `DeleteTransactionDialog.tsx`** (20 min)
   - Confirmación simple con detalles
   - Warning si es dual transaction
   - Submit: `deleteTransaction()` Server Action

3. **Implementar filtros reales** (30 min)
   - Modificar `page.tsx` para leer `searchParams`
   - Construir query Supabase con filtros
   - Crear `ActiveFilters.tsx` component
   - SearchBar con debounce (useTransition)

**Testing**:
- [ ] Editar transacción: success, validation errors
- [ ] Delete transacción: confirmation, cascade
- [ ] Filtros: combinar múltiples, limpiar, persist en URL

---

### **FASE 3: Sistema de Ajustes Completo** (60 min)

**Objetivos**:
- Approve/Reject ajustes (owners)
- Cancel ajustes (propios)
- UI inline en `/app/household`

**Pasos**:

1. **Crear `PendingAdjustmentsAlert.tsx`** (30 min)
   - Solo visible para owners
   - Lista de pending adjustments
   - Botones [Aprobar] [Rechazar] inline
   - Server Actions: `approveAdjustment()`, `rejectAdjustment()`

2. **Refactorizar `MyAdjustmentsSection.tsx`** (20 min)
   - Agrupar por estado (Activos, Aplicados, Cancelados)
   - Botón [+ Crear Ajuste]
   - Cada item con badge de estado

3. **Server Actions** (10 min)
   ```typescript
   export async function approveAdjustment(adjustmentId: string): Promise<Result>
   export async function rejectAdjustment(adjustmentId: string, reason: string): Promise<Result>
   export async function cancelAdjustment(adjustmentId: string): Promise<Result>
   ```

**Testing**:
- [ ] Owner ve pending adjustments
- [ ] Approve: status cambia a 'active'
- [ ] Reject: status cambia a 'cancelled', notifica
- [ ] Member cancela su propio ajuste pending

---

### **FASE 4: Sistema de Créditos Funcional** (60 min)

**Objetivos**:
- ManageCreditDialog completo
- Cambiar decisión mensual
- Transfer to savings funcional

**Pasos**:

1. **Refactorizar `ManageCreditDialog.tsx`** (40 min)
   - Form con RadioGroup: apply_to_month | keep_active | transfer_to_savings
   - Toggle auto_apply
   - Botón [Aplicar al Próximo Mes] (manual)
   - Botón [Transferir a Ahorros] (ejecuta transfer)
   - Server Action: `updateCreditDecision()`

2. **Integrar con Savings** (20 min)
   - `transferCreditToSavings()` ya existe (app/savings/actions.ts)
   - Conectar botón → acción → actualizar UI
   - Toast success "Crédito transferido a ahorros"

**Testing**:
- [ ] Cambiar decisión: persiste en DB
- [ ] Auto-apply toggle: funciona
- [ ] Transfer to savings: crea savings_transaction + actualiza credit

---

### **FASE 5: Módulo de Ahorro** (120 min)

**Objetivos**:
- Sistema completo de ahorro visible en `/app/household`
- Deposit/Withdraw funcionales
- Historial de movimientos

**Pasos**:

1. **Crear `SavingsFundSection.tsx`** (60 min)
   - Balance actual + meta + progress bar
   - Botones [Depositar] [Retirar]
   - Últimos 5 movimientos inline
   - Link "Ver Historial Completo" → expande lista

2. **Crear dialogs** (40 min)
   - `DepositToSavingsDialog.tsx` (150 líneas)
     * Form: amount, description, category (opcional)
     * Submit: `depositToSavings()` Server Action
   - `WithdrawFromSavingsDialog.tsx` (180 líneas)
     * Form: amount, reason, createTransaction (checkbox)
     * Validación: balance suficiente
     * Submit: `withdrawFromSavings()` Server Action

3. **Server Actions** (20 min)
   - Mover de `app/savings/actions.ts` → `app/household/actions.ts`
   - Ya existen: `depositToSavings()`, `withdrawFromSavings()`, `transferCreditToSavings()`
   - Solo ajustar paths y revalidatePath

**Testing**:
- [ ] Ver balance y meta
- [ ] Depositar: actualiza balance, crea transaction
- [ ] Retirar: valida balance, crea transaction opcional
- [ ] Transfer from credit: conecta ambos sistemas

---

### **FASE 6: Módulo de Reportes** (90 min)

**Objetivos**:
- Ruta `/app/reports` con gráficos funcionales
- Integración Recharts con datos reales
- Export PDF (opcional)

**Pasos**:

1. **Crear `page.tsx` + `ReportsContent.tsx`** (20 min)
   - Server Component: queries para datos históricos
   - Orchestrator: coordina 5 visualizaciones

2. **Crear visualizaciones** (60 min)
   - `TrendChart.tsx` (LineChart) - 20 min
   - `CategoryPieChart.tsx` (PieChart) - 15 min
   - `ContributionsBarChart.tsx` (BarChart) - 15 min
   - `TopCategoriesTable.tsx` (Table) - 10 min

3. **Export PDF** (10 min - opcional)
   - Botón "Exportar PDF"
   - Usa librería `jspdf` o `react-to-pdf`
   - Incluye gráficos como imágenes

**Testing**:
- [ ] Gráficos cargan con datos reales
- [ ] DateRangePicker filtra correctamente
- [ ] Export PDF funciona (opcional)

---

### **FASE 7: Polish y Testing Final** (60 min)

**Objetivos**:
- Testing completo de navegación
- Responsive en 3 breakpoints
- Accesibilidad
- Performance

**Checklist**:

**Navegación**:
- [ ] MobileBottomNav: active states correctos
- [ ] Desktop nav: links funcionan
- [ ] Breadcrumbs: no necesarios (navegación plana)
- [ ] Back buttons: no necesarios

**Responsive**:
- [ ] Móvil (<768px): Cards, bottom nav visible, acciones accesibles
- [ ] Tablet (768-1024px): Grid 2 cols, mix de cards/tables
- [ ] Desktop (>1024px): Tables, header nav, layouts complejos

**Funcionalidad**:
- [ ] CRUD transacciones: create, edit, delete
- [ ] Approve/reject adjustments: solo owners
- [ ] Manage credits: cambiar decisión, transfer
- [ ] Savings: deposit, withdraw, ver historial
- [ ] Filtros: aplicar, limpiar, combinar

**Performance**:
- [ ] Build: 0 errores, <10s
- [ ] Lighthouse: >90 Performance, Accessibility
- [ ] No console errors en dev

**Accesibilidad**:
- [ ] Focus visible en todos los elementos
- [ ] Labels en inputs
- [ ] ARIA labels en iconos
- [ ] Keyboard navigation

---

## 📊 Comparación: v1 vs v2

| Aspecto | v1 (Actual) | v2 (Propuesta) | Mejora |
|---------|-------------|----------------|--------|
| **Navegación** | 3 niveles (confuso) | 1 nivel (plano) | ✅ +200% claridad |
| **Rutas principales** | 4 (Dashboard, Transactions, Contributions, Settings) | 5 (Balance, Expenses, Household, Reports, Settings) | ✅ +25% |
| **Editar transacciones** | ❌ NO funciona | ✅ Dialog funcional | ✅ CRÍTICO |
| **Eliminar transacciones** | ❌ NO funciona | ✅ Dialog funcional | ✅ CRÍTICO |
| **Aprobar ajustes** | ❌ NO funciona | ✅ Inline para owners | ✅ CRÍTICO |
| **Gestionar créditos** | ❌ Dialog vacío | ✅ Form completo | ✅ CRÍTICO |
| **Sistema de ahorro** | ❌ Invisible | ✅ Section en Household + dialogs | ✅ CRÍTICO |
| **Filtros** | ❌ Solo UI | ✅ Query real con searchParams | ✅ IMPORTANTE |
| **Reportes** | ❌ Mezclado en Dashboard | ✅ Ruta dedicada con gráficos | ✅ IMPORTANTE |
| **Tiempo implementación** | 5 horas (v1) | +7 horas (v2) | 12 horas total |

---

## 🎯 Resultado Final Esperado

**Una app de gastos compartidos**:
- ✅ **Intuitiva**: Navegación clara, jerarquía plana
- ✅ **Completa**: TODAS las funcionalidades implementadas
- ✅ **Funcional**: Edit/Delete/Approve/Manage REALES
- ✅ **Integrada**: Créditos ↔ Ahorro conectados
- ✅ **Eficiente**: Filtros, búsqueda, paginación
- ✅ **Profesional**: Gráficos, reportes, export
- ✅ **Accesible**: Responsive, keyboard, ARIA

**Sin romper nada**: Toda la lógica de Server Actions se preserva, solo se reorganiza la UI.

---

## 🚀 Próximo Paso

**¿Aprobamos esta arquitectura v2 y comenzamos la implementación?**

Propongo empezar por **FASE 1 + FASE 2** (reestructuración + transacciones funcionales) en esta sesión.

Tiempo estimado: **2.5 horas**

**¿Adelante?** 🎯
