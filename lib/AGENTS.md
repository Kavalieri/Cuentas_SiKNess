# lib/AGENTS.md

> Helpers de servidor, acceso a DB y utilidades puras. TypeScript estricto.

## Reglas clave

- Todas las consultas a DB deben filtrar por `household_id` (sistema multi-hogar).
- Usa `query()` para SQL nativo parametrizado; no ejecutes CLI desde código.
- Valida inputs con Zod en Server Actions; retorna `Result` (`ok`/`fail`).
- Gestiona compatibilidad de esquema con `information_schema` antes de usar columnas/tablas nuevas.
- No hagas build de prod desde aquí; operaciones se manejan por tareas.

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
