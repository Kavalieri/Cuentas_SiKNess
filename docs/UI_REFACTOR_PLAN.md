# 🎨 Plan de Refactorización UI - CuentasSiK

**Fecha**: 7 octubre 2025  
**Objetivo**: Modularizar UI, eliminar redundancias, dividir responsabilidades, mejorar UX móvil/web

---

## 📊 Análisis de Situación Actual

### **Dashboard** (`app/app/page.tsx` + `DashboardContent.tsx`)
**Tamaño**: 7 archivos, ~62.8 KB  
**Responsabilidades actuales**:
- ✅ Resumen financiero mensual (ingresos, gastos, balance)
- ✅ Gráficos (pie chart categorías, line chart histórico)
- ✅ Lista de últimas 10 transacciones
- ✅ Filtros avanzados (categorías, tipo, rango fechas)
- ✅ Navegación mensual (MonthSelector)
- ✅ Botón exportar (PDF/CSV)
- ✅ Onboarding para usuarios nuevos

**Componentes**:
```
app/app/
├── page.tsx (Server Component - 150 líneas)
├── components/
│   ├── DashboardContent.tsx (Client - 350 líneas) ⚠️ MONOLÍTICO
│   ├── TransactionsList.tsx (180 líneas)
│   ├── TransactionFilters.tsx (120 líneas)
│   ├── AdvancedFilters.tsx (90 líneas)
│   ├── EditTransactionDialog.tsx (250 líneas)
│   ├── DashboardOnboarding.tsx (80 líneas)
│   └── PendingInvitationsCard.tsx (60 líneas)
```

**Problemas identificados**:
1. ❌ **DashboardContent.tsx es monolítico** (350 líneas):
   - Mezcla lógica de estado, queries, filtros, gráficos
   - Difícil de mantener y testear
   - No es reusable
2. ❌ **Filtros distribuidos**: `TransactionFilters` + `AdvancedFilters` (duplicación)
3. ❌ **TransactionsList duplicado**: Existe en Dashboard, Expenses, y Contributions
4. ❌ **Sin navegación móvil optimizada**: Header con botones pequeños

---

### **Contribuciones** (`app/app/contributions/`)
**Tamaño**: 13 archivos, ~113.6 KB  
**Responsabilidades actuales**:
- ✅ Gestión de ingresos mensuales por miembro
- ✅ Configuración de meta mensual del hogar
- ✅ Cálculo de contribuciones proporcionales
- ✅ Seguimiento de pagos realizados
- ✅ Sistema de ajustes manuales (pre-pagos)
- ✅ Sistema de créditos/débitos con decisión mensual
- ✅ Panel de aprobaciones pendientes (owners)

**Componentes**:
```
app/app/contributions/
├── page.tsx (Server Component - 163 líneas)
├── actions.ts (Server Actions - 450 líneas)
├── components/
│   ├── ContributionsContent.tsx (Orchestrator - 90 líneas)
│   ├── HeroContribution.tsx (Hero section - 120 líneas)
│   ├── ContributionMembersList.tsx (Lista - 80 líneas)
│   ├── ContributionCard.tsx (Card individual - 90 líneas)
│   ├── IncomesSection.tsx (Configurar ingresos - 150 líneas)
│   ├── ConfigurationSection.tsx (Meta + tipo cálculo - 180 líneas)
│   ├── GoalForm.tsx (Formulario meta - 100 líneas)
│   ├── CalculateButton.tsx (Botón calcular - 60 líneas)
│   ├── MyAdjustmentsPanel.tsx (Ajustes del usuario - 350 líneas) ⚠️ GRANDE
│   ├── CreditsPanel.tsx (Créditos del usuario - 280 líneas) ⚠️ GRANDE
│   ├── PendingApprovalsPanel.tsx (Aprobaciones owner - 200 líneas)
│   ├── HouseholdSummary.tsx (Resumen hogar - 100 líneas)
│   └── ManageCreditDialog.tsx (Dialog créditos - 250 líneas)
```

**Problemas identificados**:
1. ❌ **MyAdjustmentsPanel.tsx demasiado grande** (350 líneas):
   - Mezcla listado, creación, edición, eliminación
   - No hay separación de responsabilidades
2. ❌ **CreditsPanel.tsx demasiado grande** (280 líneas):
   - Similar problema: todo en un componente
3. ❌ **ContributionsContent.tsx es orquestador simple** pero bien diseñado ✅
4. ❌ **Sin navegación clara entre secciones**: Todo scroll en una página
5. ❌ **Redundancia con Dashboard**: Ambos muestran transacciones y balance

---

## 🎯 Principios de Diseño

### **1. Arquitectura de Páginas**
Cada módulo debe tener **su propia página** con navegación clara:

```
/app → Dashboard (Resumen + Gráficos + Últimas transacciones)
/app/transactions → Listado completo con filtros avanzados
/app/contributions → Sistema de contribuciones completo
/app/contributions/adjustments → Gestión de ajustes
/app/contributions/credits → Gestión de créditos
/app/savings → Fondo de ahorro del hogar
/app/household → Gestión del hogar
/app/settings → Configuración (categories, etc.)
```

### **2. Separación de Responsabilidades**
**Patrón Container/Presentational**:
- **Server Components** (`page.tsx`): Fetch data, auth, RLS
- **Client Orchestrators** (`*Content.tsx`): Estado global, coordinación
- **Presentational Components**: UI pura, props tipadas, reusables

### **3. Componentes Compartidos**
Crear librería de componentes reusables:

```
components/shared/
├── navigation/
│   ├── MobileNav.tsx (Bottom navigation móvil)
│   └── BreadcrumbNav.tsx (Navegación de contexto)
├── data-display/
│   ├── StatCard.tsx (Tarjeta de estadística)
│   ├── TransactionItem.tsx (Item de transacción reutilizable)
│   ├── MemberCard.tsx (Card de miembro)
│   └── EmptyState.tsx (Estado vacío genérico)
├── forms/
│   ├── FormSection.tsx (Sección de formulario)
│   └── CurrencyInput.tsx (Input de moneda)
└── filters/
    ├── FilterBar.tsx (Barra de filtros genérica)
    └── DateRangeFilter.tsx (Filtro de rango de fechas)
```

### **4. Módulos Independientes**
Cada módulo debe ser **auto-contenido**:
- Sus propios Server Actions
- Sus propios componentes locales
- Sus propias validaciones Zod
- Sin dependencias cruzadas

---

## 📐 Arquitectura Propuesta

### **Estructura de Carpetas Objetivo**

```
app/app/
├── (dashboard)/              # Route group
│   ├── page.tsx              # Dashboard principal (Server)
│   └── components/
│       ├── DashboardHeader.tsx           # Header con MonthSelector + Export
│       ├── FinancialSummary.tsx          # Cards: Income, Expenses, Balance
│       ├── BalanceBreakdown.tsx          # Desglose del balance (nuevo)
│       ├── CategoryChart.tsx             # Gráfico pie categorías
│       ├── TrendChart.tsx                # Gráfico línea tendencia
│       └── RecentTransactions.tsx        # Últimas 10 transacciones
│
├── transactions/             # Nueva ruta dedicada
│   ├── page.tsx              # Listado completo (Server)
│   ├── actions.ts            # CRUD transacciones
│   └── components/
│       ├── TransactionsHeader.tsx        # Filtros + Botón añadir
│       ├── TransactionsList.tsx          # Lista con virtualización
│       ├── TransactionItem.tsx           # Item individual (compartido)
│       ├── AddTransactionDialog.tsx      # Dialog crear
│       ├── EditTransactionDialog.tsx     # Dialog editar
│       └── FilterPanel.tsx               # Panel filtros avanzados
│
├── contributions/
│   ├── page.tsx              # Overview contribuciones (Server)
│   ├── actions.ts            # Server Actions
│   ├── adjustments/          # Sub-ruta para ajustes
│   │   ├── page.tsx
│   │   └── components/
│   │       ├── AdjustmentsHeader.tsx
│   │       ├── AdjustmentsList.tsx
│   │       ├── AdjustmentItem.tsx
│   │       └── AddAdjustmentDialog.tsx
│   ├── credits/              # Sub-ruta para créditos
│   │   ├── page.tsx
│   │   └── components/
│   │       ├── CreditsHeader.tsx
│   │       ├── CreditsList.tsx
│   │       ├── CreditItem.tsx
│   │       └── ManageCreditDialog.tsx
│   └── components/           # Componentes principales
│       ├── ContributionsHeader.tsx       # Navegación tabs
│       ├── HeroContribution.tsx          # Tu contribución (mejorado)
│       ├── MembersList.tsx               # Lista miembros
│       ├── MemberCard.tsx                # Card miembro (compartido)
│       ├── ConfigurationPanel.tsx        # Meta + cálculo
│       ├── IncomesPanel.tsx              # Configurar ingresos
│       └── PendingApprovalsPanel.tsx     # Aprobaciones owner
│
├── savings/                  # Sistema de ahorro
│   ├── page.tsx              # Overview ahorro (Server)
│   ├── actions.ts            # Server Actions (withdraw, deposit, transfer)
│   └── components/
│       ├── SavingsHeader.tsx
│       ├── SavingsBalance.tsx            # Balance + meta + progreso
│       ├── SavingsTransactionsList.tsx   # Historial movimientos
│       └── SavingsActions.tsx            # Botones: deposit, withdraw, transfer
│
└── layout.tsx                # Layout con navegación mejorada

components/shared/            # Librería compartida
├── navigation/
│   ├── MobileBottomNav.tsx               # Navegación inferior móvil ⭐ NUEVO
│   ├── BreadcrumbNav.tsx                 # Navegación de contexto
│   └── TabsNav.tsx                       # Tabs genérico
├── data-display/
│   ├── StatCard.tsx                      # Tarjeta estadística reutilizable
│   ├── TransactionItem.tsx               # Item transacción compartido
│   ├── MemberCard.tsx                    # Card miembro compartido
│   ├── EmptyState.tsx                    # Estado vacío genérico
│   ├── LoadingState.tsx                  # Estado carga genérico
│   └── ErrorState.tsx                    # Estado error genérico
├── forms/
│   ├── FormSection.tsx                   # Sección formulario
│   ├── CurrencyInput.tsx                 # Input moneda
│   └── DatePicker.tsx                    # Selector fecha
├── filters/
│   ├── FilterBar.tsx                     # Barra filtros genérica
│   ├── DateRangeFilter.tsx               # Filtro rango fechas
│   └── CategoryFilter.tsx                # Filtro categorías
└── dialogs/
    ├── ConfirmDialog.tsx                 # Dialog confirmación genérico
    └── FormDialog.tsx                    # Dialog formulario genérico
```

---

## 🔄 Plan de Migración

### **FASE 1: Preparación (30 min)**

#### **1.1. Crear estructura de carpetas**
```bash
mkdir app/app/transactions
mkdir app/app/transactions/components
mkdir app/app/contributions/adjustments
mkdir app/app/contributions/adjustments/components
mkdir app/app/contributions/credits
mkdir app/app/contributions/credits/components
mkdir components/shared/navigation
mkdir components/shared/data-display
mkdir components/shared/forms
mkdir components/shared/filters
mkdir components/shared/dialogs
```

#### **1.2. Crear componentes base compartidos**
Archivos a crear:
- `components/shared/data-display/StatCard.tsx` (50 líneas)
- `components/shared/data-display/EmptyState.tsx` (40 líneas)
- `components/shared/data-display/LoadingState.tsx` (30 líneas)
- `components/shared/data-display/ErrorState.tsx` (40 líneas)
- `components/shared/navigation/TabsNav.tsx` (80 líneas)
- `components/shared/navigation/BreadcrumbNav.tsx` (60 líneas)

---

### **FASE 2: Dashboard Refactor (90 min)**

#### **2.1. Dividir DashboardContent.tsx**

**Estado actual**: 1 archivo monolítico de 350 líneas  
**Estado objetivo**: 7 componentes especializados

**Componentes a crear**:

1. **`DashboardHeader.tsx`** (60 líneas):
   ```tsx
   // Props: selectedMonth, setSelectedMonth, onExport
   // UI: MonthSelector + ExportButton
   ```

2. **`FinancialSummary.tsx`** (80 líneas):
   ```tsx
   // Props: income, expenses, balance, transactionCount, avgDaily
   // UI: 4 StatCards en grid responsive
   ```

3. **`BalanceBreakdown.tsx`** (100 líneas) ⭐ NUEVO:
   ```tsx
   // Props: totalBalance, freeBalance, activeCredits, reservedCredits
   // UI: Card con breakdown visual (progress bars)
   ```

4. **`CategoryChart.tsx`** (120 líneas):
   ```tsx
   // Props: categories (con totales calculados)
   // UI: Recharts PieChart + Legend
   // Lógica: Top 5 categorías + "Otros"
   ```

5. **`TrendChart.tsx`** (150 líneas):
   ```tsx
   // Props: historicalData (últimos 6 meses)
   // UI: Recharts LineChart
   // Lógica: Calcular promedios, mostrar tendencia
   ```

6. **`RecentTransactions.tsx`** (80 líneas):
   ```tsx
   // Props: transactions (últimas 10)
   // UI: Lista con TransactionItem compartido
   // Footer: Link "Ver todas las transacciones" → /app/transactions
   ```

7. **`DashboardContent.tsx`** (refactorizado - 100 líneas):
   ```tsx
   // Solo orquestación:
   // - Estado: selectedMonth, filters
   // - Queries: useQuery con filtros
   // - Composición: Header + Summary + Breakdown + Charts + Recent
   ```

**Migrations**:
- ✅ Mover lógica de cálculos a Server Actions
- ✅ Extraer lógica de gráficos a componentes especializados
- ✅ Usar componentes compartidos (StatCard, EmptyState)

---

### **FASE 3: Nueva Ruta Transactions (60 min)**

#### **3.1. Crear `/app/transactions/page.tsx`** (Server Component - 100 líneas)

**Responsabilidad**: Listado completo con filtros avanzados

**Queries**:
```tsx
// 1. Get all transactions (con paginación)
// 2. Get categories (para filtros)
// 3. Get members (para filtro "pagado por")
```

**Props pasadas al cliente**:
```tsx
{
  transactions: Transaction[],
  categories: Category[],
  members: Member[],
  totalCount: number,
  currentPage: number
}
```

#### **3.2. Componentes de Transactions**

1. **`TransactionsHeader.tsx`** (80 líneas):
   ```tsx
   // Props: onFilter, onAdd, activeFilters
   // UI: SearchBar + FilterButton + AddButton
   ```

2. **`TransactionsList.tsx`** (refactorizado - 100 líneas):
   ```tsx
   // Props: transactions, onEdit, onDelete
   // UI: Virtualización con react-window si >100 items
   // Responsive: Cards móvil, Table desktop
   ```

3. **`FilterPanel.tsx`** (150 líneas):
   ```tsx
   // Props: filters, setFilters, categories, members
   // UI: Sheet (drawer) con todos los filtros
   // Filtros: Categoría, Tipo, Rango fechas, Pagado por, Monto
   ```

**Mejoras**:
- ✅ Paginación server-side (50 items por página)
- ✅ Virtualización para listas grandes
- ✅ Búsqueda con debounce
- ✅ Ordenamiento por columna

---

### **FASE 4: Contributions Refactor (120 min)**

#### **4.1. Dividir MyAdjustmentsPanel.tsx**

**Estado actual**: 1 archivo de 350 líneas  
**Estado objetivo**: Ruta dedicada `/app/contributions/adjustments`

**Nueva estructura**:

1. **`app/contributions/adjustments/page.tsx`** (Server - 80 líneas):
   ```tsx
   // Query: Get user adjustments + related transactions
   // Props: adjustments, categories, currentUserProfileId
   ```

2. **`AdjustmentsHeader.tsx`** (50 líneas):
   ```tsx
   // UI: Title + AddButton + BackButton
   ```

3. **`AdjustmentsList.tsx`** (100 líneas):
   ```tsx
   // Props: adjustments, onEdit, onDelete
   // UI: Lista con AdjustmentItem
   // Responsive: Cards móvil, Table desktop
   ```

4. **`AdjustmentItem.tsx`** (80 líneas):
   ```tsx
   // Props: adjustment, onEdit, onDelete
   // UI: Card con status badge, amount, date, reason
   // Actions: Edit (if pending), Delete (if active)
   ```

5. **`AddAdjustmentDialog.tsx`** (120 líneas):
   ```tsx
   // Form: reason, amount, category, type (prepayment/other)
   // Validation: Zod schema
   // Submit: addContributionAdjustment() action
   ```

**Beneficios**:
- ✅ URL dedicada: `/app/contributions/adjustments`
- ✅ Separación clara de responsabilidades
- ✅ Más fácil de mantener y testear
- ✅ Navegación más clara

#### **4.2. Dividir CreditsPanel.tsx**

**Estado actual**: 1 archivo de 280 líneas  
**Estado objetivo**: Ruta dedicada `/app/contributions/credits`

**Nueva estructura**:

1. **`app/contributions/credits/page.tsx`** (Server - 80 líneas):
   ```tsx
   // Query: Get user credits + monthly decision status
   // Props: credits, availableDecisions
   ```

2. **`CreditsHeader.tsx`** (50 líneas):
   ```tsx
   // UI: Title + InfoCard (explicación) + BackButton
   ```

3. **`CreditsList.tsx`** (100 líneas):
   ```tsx
   // Props: credits, onManage
   // UI: Lista con CreditItem
   // Grouping: Active, Applied, Transferred, Expired
   ```

4. **`CreditItem.tsx`** (80 líneas):
   ```tsx
   // Props: credit, onManage
   // UI: Card con status, amount, origin date, decision
   // Actions: Manage decision (if active)
   ```

5. **`ManageCreditDialog.tsx`** (refactorizado - 150 líneas):
   ```tsx
   // Form: monthly_decision (apply_to_month | keep_active | transfer_to_savings)
   // UI: RadioGroup con explicaciones
   // Submit: updateCreditDecision() action
   ```

**Beneficios**:
- ✅ URL dedicada: `/app/contributions/credits`
- ✅ Flujo más claro para gestionar créditos
- ✅ Separación de responsabilidades

#### **4.3. Refactorizar ContributionsContent.tsx**

**Estado actual**: Orquestador simple (90 líneas) ✅ bien diseñado  
**Mejoras propuestas**:

1. **Agregar navegación por tabs**:
   ```tsx
   <TabsNav
     tabs={[
       { label: 'Resumen', href: '/app/contributions', icon: <Home /> },
       { label: 'Ajustes', href: '/app/contributions/adjustments', icon: <Edit /> },
       { label: 'Créditos', href: '/app/contributions/credits', icon: <DollarSign /> },
     ]}
   />
   ```

2. **Reorganizar secciones**:
   ```tsx
   // Orden propuesto:
   1. Header con Tabs
   2. HeroContribution (tu contribución)
   3. MembersList (otros miembros)
   4. ConfigurationPanel (solo owners)
   5. PendingApprovalsPanel (solo owners)
   ```

3. **Extraer IncomesSection**:
   - Actualmente dentro de ConfigurationSection
   - Mover a componente independiente: `IncomesPanel.tsx`

---

### **FASE 5: Navegación Móvil (45 min)**

#### **5.1. Crear MobileBottomNav.tsx** ⭐ NUEVO

**Ubicación**: `components/shared/navigation/MobileBottomNav.tsx`  
**Inspiración**: iOS/Android bottom navigation

**UI**:
```tsx
<nav className="fixed bottom-0 left-0 right-0 bg-background border-t md:hidden z-50">
  <div className="grid grid-cols-5 gap-1 px-2 py-1">
    <NavItem href="/app" icon={<Home />} label="Inicio" />
    <NavItem href="/app/transactions" icon={<Receipt />} label="Transacciones" />
    <NavItem href="/app/contributions" icon={<Wallet />} label="Contribuciones" />
    <NavItem href="/app/savings" icon={<PiggyBank />} label="Ahorro" />
    <NavItem href="/app/settings" icon={<Settings />} label="Más" />
  </div>
</nav>
```

**Features**:
- ✅ Active state con color highlight
- ✅ Solo visible en móvil (`md:hidden`)
- ✅ Fixed bottom con z-index alto
- ✅ Icons + labels pequeños

#### **5.2. Actualizar Layout**

**Cambios en `app/app/layout.tsx`**:

1. **Header móvil simplificado**:
   ```tsx
   // Ocultar nav desktop en móvil
   <nav className="hidden md:flex gap-2">
     {/* Botones existentes */}
   </nav>
   ```

2. **Agregar padding bottom en móvil**:
   ```tsx
   <main className="flex-1 bg-muted/30 pb-16 md:pb-0">
     {/* pb-16 para espacio del bottom nav */}
     {children}
   </main>
   ```

3. **Renderizar MobileBottomNav**:
   ```tsx
   <MobileBottomNav />
   <footer className="hidden md:block border-t bg-background">
     {/* Footer solo en desktop */}
   </footer>
   ```

---

### **FASE 6: Componentes Compartidos (60 min)**

#### **6.1. StatCard.tsx** (reutilizable)

**Ubicación**: `components/shared/data-display/StatCard.tsx`

**Props**:
```tsx
interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: { value: number; direction: 'up' | 'down' };
  subtitle?: string;
  variant?: 'default' | 'success' | 'danger' | 'warning';
}
```

**Uso**:
```tsx
<StatCard
  title="Ingresos"
  value={formatCurrency(income)}
  icon={<TrendingUp />}
  trend={{ value: 5.2, direction: 'up' }}
  subtitle="vs mes anterior"
  variant="success"
/>
```

**Beneficios**:
- ✅ Usado en Dashboard, Contributions, Savings
- ✅ Estilos consistentes
- ✅ Trends opcionales

#### **6.2. TransactionItem.tsx** (componente atómico)

**Ubicación**: `components/shared/data-display/TransactionItem.tsx`

**Props**:
```tsx
interface TransactionItemProps {
  transaction: Transaction & { category?: Category; profile?: Profile };
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  variant?: 'compact' | 'detailed';
}
```

**Uso**:
```tsx
// Dashboard (compact)
<TransactionItem transaction={t} variant="compact" />

// Transactions page (detailed con actions)
<TransactionItem 
  transaction={t} 
  variant="detailed"
  onEdit={handleEdit}
  onDelete={handleDelete}
/>
```

**Beneficios**:
- ✅ Elimina duplicación (3 lugares actuales)
- ✅ Estilos consistentes
- ✅ Fácil de testear

#### **6.3. MemberCard.tsx** (componente compartido)

**Ubicación**: `components/shared/data-display/MemberCard.tsx`

**Props**:
```tsx
interface MemberCardProps {
  member: {
    profile_id: string;
    email: string;
    income?: number | null;
    contribution?: Contribution | null;
    role?: 'owner' | 'member';
  };
  variant?: 'compact' | 'detailed';
  showActions?: boolean;
  onEdit?: (profileId: string) => void;
}
```

**Uso**:
```tsx
// Contributions page
<MemberCard member={m} variant="detailed" showActions={isOwner} />

// Settings page
<MemberCard member={m} variant="compact" />
```

---

### **FASE 7: Testing & Polish (30 min)**

#### **7.1. Testing Checklist**

**Responsiveness**:
- [ ] Dashboard: Verificar en móvil (< 768px), tablet (768-1024px), desktop (> 1024px)
- [ ] Transactions: Tabla → Cards en móvil
- [ ] Contributions: Tabs → Scroll horizontal en móvil
- [ ] Bottom nav: Solo visible en móvil, posición fixed correcta

**Navigation**:
- [ ] Breadcrumbs funcionales en todas las rutas
- [ ] Active state correcto en tabs y bottom nav
- [ ] Back buttons en sub-rutas

**Performance**:
- [ ] Virtualización en listas >50 items
- [ ] Lazy loading de gráficos (dynamic import)
- [ ] Debounce en búsqueda/filtros

**Accesibilidad**:
- [ ] Focus visible en todos los elementos interactivos
- [ ] Labels en inputs
- [ ] ARIA labels en iconos
- [ ] Keyboard navigation funcional

#### **7.2. Build Verification**

```bash
npm run build
# Verificar: 0 errores TypeScript, 0 warnings ESLint
```

---

## 📊 Métricas de Éxito

### **Antes (Estado Actual)**

| Métrica | Valor |
|---------|-------|
| **Dashboard** | 1 componente monolítico (350 líneas) |
| **Contributions** | 2 componentes grandes (350 + 280 líneas) |
| **Componentes compartidos** | 0 (duplicación) |
| **Rutas dedicadas** | 2 (Dashboard, Contributions) |
| **Navegación móvil** | Header genérico |
| **Responsabilidades** | Mezcladas (fetch + render + estado) |

### **Después (Estado Objetivo)**

| Métrica | Valor | Mejora |
|---------|-------|--------|
| **Dashboard** | 7 componentes especializados (60-150 líneas c/u) | ✅ Modular |
| **Contributions** | 3 rutas dedicadas + 12 componentes pequeños | ✅ Separado |
| **Componentes compartidos** | 12 componentes reutilizables | ✅ DRY |
| **Rutas dedicadas** | 6 (Dashboard, Transactions, Contributions, Adjustments, Credits, Savings) | ✅ +300% |
| **Navegación móvil** | Bottom nav dedicado iOS/Android style | ✅ UX móvil |
| **Responsabilidades** | Separadas (Server → Orchestrator → Presentational) | ✅ Clean |

---

## 🚀 Orden de Implementación

### **Sprint 1: Preparación + Dashboard** (2 horas)
1. ✅ Crear estructura de carpetas (FASE 1)
2. ✅ Crear componentes base compartidos (FASE 1)
3. ✅ Refactorizar Dashboard (FASE 2)
4. ✅ Crear ruta Transactions (FASE 3)

### **Sprint 2: Contributions Refactor** (2 horas)
5. ✅ Dividir MyAdjustmentsPanel → `/adjustments` (FASE 4.1)
6. ✅ Dividir CreditsPanel → `/credits` (FASE 4.2)
7. ✅ Refactorizar ContributionsContent (FASE 4.3)

### **Sprint 3: Navegación + Polish** (1.5 horas)
8. ✅ Crear MobileBottomNav (FASE 5)
9. ✅ Actualizar Layout (FASE 5)
10. ✅ Crear componentes compartidos finales (FASE 6)
11. ✅ Testing completo (FASE 7)

---

## 📋 Próximos Pasos Inmediatos

1. **Revisar este plan con el usuario**
2. **Aprobar arquitectura propuesta**
3. **Comenzar FASE 1**: Crear estructura de carpetas
4. **Crear componentes base compartidos** (StatCard, EmptyState, etc.)
5. **Comenzar FASE 2**: Refactorizar Dashboard

---

## 🎯 Resultado Final

**Una aplicación**:
- ✅ **Modular**: Componentes pequeños, especializados, reutilizables
- ✅ **Escalable**: Fácil agregar nuevas features sin tocar código existente
- ✅ **Mantenible**: Responsabilidades claras, testing sencillo
- ✅ **Responsive**: Optimizada para móvil (bottom nav) y desktop (header nav)
- ✅ **Performante**: Virtualización, lazy loading, server components
- ✅ **Coherente**: Estilos y patrones consistentes en toda la app

**Sin romper nada**: Toda la lógica actual se preserva, solo se reorganiza.

---

**¿Aprobamos este plan y comenzamos?** 🚀
