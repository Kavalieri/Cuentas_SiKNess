# FASE 1: Análisis Completo de Rename `/transactions` → `/expenses`

**Fecha**: 7 octubre 2025  
**Propósito**: Auditoría exhaustiva antes de renombrar rutas para evitar romper referencias

---

## 🔍 HISTORIA DEL NAMING

### Evolución del concepto "Transacción":

1. **Origen (fase inicial)**: `movements` (movimientos)
   - Tabla DB: `movements`
   - Ruta: No existía ruta dedicada inicialmente
   - Estado: ⚠️ **DEPRECATED** pero referencias aún existen en:
     - `db/schema.sql` (tabla original)
     - `db/wipe_preserve_structure.sql`
     - Scripts PowerShell de migración
     - Documentación antigua (50+ archivos)

2. **Primera migración**: `movements` → `transactions`
   - Tabla DB: Renombrada a `transactions` ✅
   - Scripts: `migrate-code.ps1`, `migrate-code-phase2.ps1`
   - Estado: ✅ **ACTIVO** en código y DB
   - Referencias: 50+ en código TypeScript

3. **Migración propuesta (v2)**: `transactions` → `/app/expenses` (RUTA SOLO)
   - Tabla DB: **NO CAMBIA** (sigue siendo `transactions`)
   - Código: **NO CAMBIA** (sigue usando `from('transactions')`)
   - Solo cambio: **Rutas UI** `/app/transactions` → `/app/expenses`

---

## 📊 ESTADO ACTUAL (7 octubre 2025)

### Estructura de Carpetas Existente:

```
app/app/
├── expenses/              ✅ EXISTE (funcional, usado en nav)
│   ├── actions.ts         → CRUD completo, exports, validaciones
│   ├── edit-actions.ts    → updateTransaction, deleteTransaction
│   ├── components/        → AddTransactionDialog, EditTransactionDialog
│   ├── page.tsx           → Página principal de gastos
│   └── loading.tsx
│
└── transactions/          ✅ EXISTE (nueva ruta v1, conflicto)
    ├── components/        → TransactionsHeader, TransactionsList, FilterPanel
    └── page.tsx           → Página alternativa creada en sesión v1
```

**⚠️ PROBLEMA**: Existen **DOS rutas** con funcionalidad duplicada:
- `/app/expenses` → Ruta original funcional (CRUD completo)
- `/app/transactions` → Ruta nueva v1 (solo lista, sin CRUD)

---

## 🔗 REFERENCIAS EN NAVEGACIÓN

### 1. Desktop Navigation (`app/app/layout.tsx`):
```tsx
// Línea 13: Import de getTotalBalance
import { getTotalBalance } from '@/app/app/expenses/actions';

// NO HAY links directos a /transactions o /expenses en desktop nav
```

### 2. Mobile Navigation (`components/shared/navigation/MobileBottomNav.tsx`):
```tsx
// Línea 21: Link activo
href: '/app/transactions',  // ⚠️ Apunta a ruta nueva (sin CRUD)
```

### 3. Dashboard Links (`app/app/components/DashboardContent.tsx`):
```tsx
// Línea 292: Link "Ver todas las transacciones"
href="/app/transactions"  // ⚠️ Apunta a ruta nueva
```

### 4. Breadcrumbs (`app/app/transactions/components/TransactionsHeader.tsx`):
```tsx
// Línea 28: Self-reference
{ label: 'Transacciones', href: '/app/transactions' }
```

### 5. Recent Transactions Component (`app/app/components/dashboard/RecentTransactions.tsx`):
```tsx
// Línea 39: Link en componente reutilizable
<Link href="/app/transactions">
  Ver todas las transacciones
</Link>
```

---

## 💾 REFERENCIAS EN BASE DE DATOS

### Estado de la tabla:

| Concepto | Nombre Actual | Estado |
|----------|---------------|--------|
| **Tabla principal** | `transactions` | ✅ Activa |
| **Tabla antigua** | `movements` | ❌ NO EXISTE (renombrada) |
| **Referencias SQL** | `from('transactions')` | ✅ 50+ referencias correctas |
| **Foreign keys** | `*_transaction_id`, `*_movement_id` | ⚠️ MIXTO |

### Foreign Keys con nombre legacy:

```sql
-- En contribution_adjustments:
movement_id UUID REFERENCES transactions(id)           -- ⚠️ Nombre legacy
income_movement_id UUID REFERENCES transactions(id)    -- ⚠️ Nombre legacy
readjustment_transaction_id UUID REFERENCES transactions(id)  -- ✅ Nombre correcto

-- En savings_transactions:
destination_transaction_id UUID REFERENCES transactions(id)  -- ✅ Nombre correcto
```

**Decisión**: NO cambiar nombres de columnas DB (breaking change innecesario)

---

## 📝 REFERENCIAS EN CÓDIGO TYPESCRIPT

### Queries Supabase correctas (50+ archivos):
```typescript
supabase.from('transactions')  // ✅ Correcto en 50+ lugares
```

### Variables con nombres legacy (100+ ocurrencias):
```typescript
// En actions.ts (múltiples archivos):
const movementsToDelete: string[] = [];        // ⚠️ Variable legacy
const movementsByDescription = await ...        // ⚠️ Variable legacy
const movementId = adjustment.movement_id       // ⚠️ Variable legacy

// Schemas Zod:
const EditMovementSchema = z.object({ ... })    // ⚠️ Schema legacy
```

**Decisión**: Variables internas pueden mantener nombres legacy (no afecta funcionalidad)

---

## 📖 REFERENCIAS EN DOCUMENTACIÓN

### Documentos con referencias a `movements` (50+ archivos):

**Deprecated pero con info histórica valiosa**:
- `docs/ACCOUNTING_SYSTEM_DESIGN.md` → ALTER TABLE movements...
- `docs/ACCOUNTING_SYSTEM_PROGRESS.md` → migrateExistingMovements()
- `docs/BUG_FIX_SELECT_CATEGORIES_2025-10-05.md` → MovementsList component
- `docs/CODE_MIGRATION_CHECKLIST.md` → Checklist completo de migración
- `docs/DATABASE_REFACTORING.md` → Documentación de rename movements→transactions

**Documentos activos con referencias mixtas**:
- `docs/SESSION_SUMMARY_2025-10-07_UI_REFACTOR.md` → Creación de /app/transactions
- `docs/UI_REFACTOR_V2_COMPLETE.md` → Plan de rename a /app/expenses
- `.github/copilot-instructions.md` → Instrucciones actualizadas

**Decisión**: Marcar docs deprecated con header, NO borrar (historial valioso)

---

## 🎯 PLAN DE MIGRACIÓN INCREMENTAL

### OPCIÓN A: Mantener `/app/expenses` (RECOMENDADO)

**Ventajas**:
- ✅ Ya funcional con CRUD completo
- ✅ Código estable y testeado
- ✅ Menos cambios = menos riesgo
- ✅ Nombre más específico ("expenses" vs genérico "transactions")

**Acciones**:
1. **Eliminar** `/app/transactions` (ruta duplicada v1)
2. **Actualizar** links de navegación → `/app/expenses`
3. **Actualizar** documentación v2 → cambiar plan de rename
4. **Validar** build y rutas

**Archivos a modificar** (5 archivos):
```
components/shared/navigation/MobileBottomNav.tsx      → href: '/app/expenses'
app/app/components/DashboardContent.tsx               → href="/app/expenses"
app/app/components/dashboard/RecentTransactions.tsx  → href="/app/expenses"
docs/UI_REFACTOR_V2_COMPLETE.md                      → Actualizar plan
app/app/transactions/                                 → DELETE carpeta
```

**Tiempo estimado**: 15 minutos

---

### OPCIÓN B: Renombrar `/app/expenses` → `/app/transactions`

**Ventajas**:
- ✅ Alinea ruta con nombre de tabla DB (`transactions`)
- ✅ Más genérico (puede incluir income en futuro)

**Desventajas**:
- ❌ Más cambios (40+ archivos)
- ❌ Conflicto con ruta existente `/app/transactions`
- ❌ Rompe imports absolutos (`@/app/app/expenses/actions`)
- ❌ Rompe revalidatePath() (6+ lugares)

**Archivos a modificar** (40+ archivos):
```
# Renombrar carpeta
mv app/app/expenses app/app/transactions_new
rm -rf app/app/transactions  # Eliminar ruta v1
mv app/app/transactions_new app/app/transactions

# Actualizar imports (20+ archivos)
@/app/app/expenses/actions → @/app/app/transactions/actions
@/app/app/expenses/edit-actions → @/app/app/transactions/edit-actions

# Actualizar revalidatePath (6 archivos)
revalidatePath('/app/expenses') → revalidatePath('/app/transactions')

# Actualizar navegación (5 archivos)
# Actualizar documentación (10+ archivos)
```

**Tiempo estimado**: 90 minutos + testing extensivo

---

## 💡 RECOMENDACIÓN FINAL

### ✅ **OPCIÓN A: Mantener `/app/expenses`**

**Razones**:
1. **Funcionalidad completa**: CRUD, exports, validaciones ya implementadas
2. **Estabilidad**: Código testeado y funcional
3. **Menor riesgo**: Solo 5 archivos vs 40+ archivos
4. **Semántica clara**: "Expenses" es más específico que "Transactions"
5. **DB consistency**: Tabla sigue siendo `transactions` (separación ruta/DB es válida)

**Analogía válida**:
- Tabla DB: `transactions` (genérico, incluye income/expense)
- Ruta UI: `/app/expenses` (específica para gestión de gastos)
- Similar a: `/users` (DB) vs `/profile` (UI)

---

## 🚀 PLAN DE EJECUCIÓN (OPCIÓN A)

### PASO 1: Backup y Validación (5 min)
```bash
# 1. Verificar estado actual
git status
npm run build  # Debe pasar

# 2. Crear branch
git checkout -b fix/consolidate-expenses-route
```

### PASO 2: Eliminar Ruta Duplicada (2 min)
```bash
# Eliminar /app/transactions (ruta v1 sin CRUD)
rm -rf app/app/transactions
```

### PASO 3: Actualizar Links de Navegación (5 min)

**A. MobileBottomNav.tsx**:
```typescript
// ANTES:
href: '/app/transactions',

// DESPUÉS:
href: '/app/expenses',
```

**B. DashboardContent.tsx**:
```typescript
// ANTES:
href="/app/transactions"

// DESPUÉS:
href="/app/expenses"
```

**C. RecentTransactions.tsx**:
```typescript
// ANTES:
<Link href="/app/transactions">

// DESPUÉS:
<Link href="/app/expenses">
```

### PASO 4: Actualizar Documentación (3 min)

**docs/UI_REFACTOR_V2_COMPLETE.md**:
```markdown
# ANTES:
| **Transacciones** | `/app/transactions` ✅ | `/app/expenses` (rename) |

# DESPUÉS:
| **Gastos/Transacciones** | `/app/expenses` ✅ | Mantener (funcional) |
```

### PASO 5: Validación Final (5 min)
```bash
# 1. Build
npm run build  # Verificar 0 errores

# 2. Verificar rutas generadas
# Debe incluir: /app/expenses
# NO debe incluir: /app/transactions

# 3. Commit
git add -A
git commit -m "fix(routes): consolidate to /app/expenses, remove duplicate /app/transactions"
git push origin fix/consolidate-expenses-route
```

---

## 📋 CHECKLIST DE VALIDACIÓN POST-MIGRACIÓN

- [ ] Build exitoso (`npm run build`)
- [ ] Ruta `/app/expenses` accesible
- [ ] Ruta `/app/transactions` da 404
- [ ] Navegación móvil funciona
- [ ] Links desde dashboard funcionan
- [ ] CRUD transacciones funciona (create, edit, delete)
- [ ] Exports funcionan
- [ ] No errores en consola

---

## 🔮 FUTURO: Separación Income/Expense (FASE 2+)

Si en el futuro se quiere una ruta específica para ingresos:

```
/app/expenses   → Solo gastos (type='expense')
/app/income     → Solo ingresos (type='income')
/app/reports    → Consolidado (ambos tipos)
```

La tabla `transactions` soporta esto perfectamente con la columna `type`.

---

## 📚 REFERENCIAS CLAVE

- **Schema DB actual**: `db/schema.sql` línea 29 (`CREATE TABLE transactions`)
- **Acciones funcionales**: `app/app/expenses/actions.ts` (CRUD completo)
- **Plan v2 original**: `docs/UI_REFACTOR_V2_COMPLETE.md` (requiere actualización)
- **Sesión v1**: `docs/SESSION_SUMMARY_2025-10-07_UI_REFACTOR.md` (creó ruta duplicada)

---

**Conclusión**: Mantener `/app/expenses` es la opción más pragmática, estable y rápida. La ruta `/app/transactions` creada en v1 fue experimental y puede eliminarse sin impacto.
