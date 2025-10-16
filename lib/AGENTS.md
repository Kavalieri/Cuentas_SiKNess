# lib/AGENTS.md

> Helpers de servidor, acceso a DB y utilidades puras. TypeScript estricto.

## Reglas clave

- Todas las consultas a DB deben filtrar por `household_id` (sistema multi-hogar).
- Usa `query()` para SQL nativo parametrizado; no ejecutes CLI desde código.
- Valida inputs con Zod en Server Actions; retorna `Result` (`ok`/`fail`).
- Gestiona compatibilidad de esquema con `information_schema` antes de usar columnas/tablas nuevas.
- **IMPORTANTE**: PostgreSQL devuelve valores `numeric` como **strings**. Usa `toNumber()` de `lib/format.ts` para convertir.
- No hagas build de prod desde aquí; operaciones se manejan por tareas.

## Tipos numéricos de PostgreSQL

### ⚠️ Conversión obligatoria: `numeric` → `number`

PostgreSQL usa el tipo `numeric` para valores monetarios (precisión exacta), pero lo devuelve como **string** en las queries para preservar precisión.

**Siempre usa `toNumber()` al leer campos numéricos:**

```ts
import { toNumber } from '@/lib/format';

const result = await query<RawRow>('SELECT monthly_income FROM member_incomes WHERE id = $1', [id]);
const income = toNumber(result.rows[0]?.monthly_income); // string → number
```

**Tipos de datos numéricos en el esquema:**

- `member_incomes.monthly_income`: `numeric` (sin precisión)
- `transactions.amount`: `numeric` (sin precisión)
- `contributions.expected_amount`: `numeric` (sin precisión)
- `contributions.adjustments_paid_amount`: `numeric(10,2)` (con precisión)

**Por qué `numeric` y no `real`/`double`:**

- ✅ Precisión exacta para valores monetarios (no pierde céntimos)
- ✅ Soporta valores muy grandes sin límites arbitrarios
- ✅ Operaciones matemáticas exactas en SQL

## Patrones

- `lib/result.ts`: contrato estándar de acciones del servidor.
- `lib/date.ts`, `lib/format.ts`: utilidades puras testeables (Vitest).
- `supabaseServer.ts`: nombre legacy; internamente usa PostgreSQL nativo.

## Ejemplo breve

```ts
import { z } from 'zod';
import { query } from '@/lib/supabaseServer';
import { ok, fail, type Result } from '@/lib/result';

const Schema = z.object({ householdId: z.string().uuid() });

export async function getMembers(input: unknown): Promise<Result> {
  const parsed = Schema.safeParse(input);
  if (!parsed.success) return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
  const { householdId } = parsed.data;

  const res = await query(`select * from get_household_members_optimized($1)`, [householdId]);
  return ok(res.rows ?? []);
}
```

## Prohibiciones

- ❌ No usar `run_in_terminal` para DB; nunca desde código de app.
- ❌ No retornar tipos implícitos; exporta tipos cuando apliquen.
