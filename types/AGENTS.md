# types/AGENTS.md

> Contratos y DTOs de TypeScript. Sin lógica.

---

## 🎯 Tipos de Base de Datos: Source of Truth

### ✅ USAR: `database.generated.ts` (Auto-generado)

**Archivo**: `types/database.generated.ts`
- **Formato**: Kysely (interfaces TypeScript)
- **Generación**: Automática desde PostgreSQL schema
- **Mantenimiento**: CERO (regeneración automática en migraciones)
- **Líneas**: ~1,013 (43 tablas + enums)

```typescript
// ✅ CORRECTO: Usar database.generated.ts
import type { Transactions, Categories, Households } from '@/types/database.generated';

async function getTransactions(householdId: string): Promise<Transactions[]> {
  const result = await query<Transactions>(`...`, [householdId]);
  return result.rows;
}
```

### ❌ NO USAR: `database.ts` (Legacy Manual)

**Archivo**: `types/database.ts`
- **Formato**: Supabase (nested Row/Insert/Update)
- **Generación**: Manual (obsoleto)
- **Estado**: 🔴 EN PROCESO DE ELIMINACIÓN (Issue #11)
- **Líneas**: 1,951 (mantenimiento pesado)

```typescript
// ❌ OBSOLETO: NO usar database.ts
import type { Database } from '@/types/database';
type Transaction = Database['public']['Tables']['transactions']['Row'];
```

---

## 🔄 Migración Gradual (Issue #11) - REGLA OBLIGATORIA

**Si tocas un archivo que importa `@/types/database`, DEBES migrarlo primero.**

### Proceso de Migración:

#### Paso 1: Detectar archivo legacy

```bash
# Buscar import de database.ts
grep -n "from '@/types/database'" archivo.ts
```

#### Paso 2: Migrar tipos

```typescript
// ❌ ANTES:
import type { Database } from '@/types/database';
type Transaction = Database['public']['Tables']['transactions']['Row'];
type Category = Database['public']['Tables']['categories']['Row'];

// ✅ DESPUÉS:
import type { Transactions, Categories } from '@/types/database.generated';
// Nota: Nombre tabla en PascalCase (transaction → Transactions)
```

#### Paso 3: Actualizar referencias

```typescript
// ❌ ANTES:
function processTransaction(tx: Transaction) { ... }
const rows: Transaction[] = result.rows;

// ✅ DESPUÉS:
function processTransaction(tx: Transactions) { ... }
const rows: Transactions[] = result.rows;
```

#### Paso 4: Validar compilación

```bash
npm run typecheck  # Debe pasar
npm run lint       # Debe pasar
```

#### Paso 5: Commit independiente

```bash
git add archivo.ts
git commit -m "refactor(types): migrar [archivo] a database.generated.ts"
```

### Convenciones de Nombres:

| PostgreSQL (snake_case) | TypeScript (PascalCase) |
|-------------------------|-------------------------|
| `transactions` | `Transactions` |
| `categories` | `Categories` |
| `category_parents` | `CategoryParents` |
| `household_members` | `HouseholdMembers` |
| `monthly_periods` | `MonthlyPeriods` |

### Archivos Pendientes de Migrar:

**Ver**: `docs/MIGRATION_TYPES_PROGRESS.md`

**Progreso actual**: 1/5 archivos (20%)

---

## 🎨 Otros Tipos (Dominio)

Para tipos específicos de dominio (DTOs, contratos de API, etc.):

### Reglas clave

- Exporta solo tipos (`export type`, `export interface`). No implementaciones.
- Nombres en PascalCase para tipos e interfaces.
- Tipos derivados o utilidades (`Pick`, `Omit`) en archivos cercanos al dominio.
- Evita `any`; usa `unknown` + refinamiento cuando haga falta.

### Ejemplo

```typescript
// types/dualFlow.ts
export interface TransactionDTO {
  id: string;
  householdId: string;
  amount: number;
  description: string;
  occurredAt: string; // ISO
}

// Derivado de database.generated.ts
import type { Transactions } from './database.generated';
export type TransactionWithCategory = Transactions & {
  category_name?: string;
  parent_name?: string;
};
```

---

## 📚 Referencias

- **Issue #8**: Auto-generación de types (✅ Completado)
- **Issue #11**: Migración gradual database.ts → database.generated.ts (🔄 En progreso)
- **database/README.md**: Sección "Auto-generación de Types"
