# contexts/AGENTS.md

> React Context + hooks asociados.

## Reglas clave

- Contexts solo para estado global real (household activo, tema, auth minimal).
- Evita sobrecargar el contexto con datos que cambian muy a menudo.
- Divide contextos por dominio para evitar renders masivos.
- Memoiza providers y valores (`useMemo`, `useCallback`).
- Los hooks deben documentar precondiciones y retornar tipos precisos.

## Prohibiciones

- ❌ No llamar APIs directamente desde el Provider; delega en acciones o hooks específicos.
- ❌ No acceder a DB desde contextos.
