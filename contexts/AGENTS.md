# contexts/AGENTS.md

> React Context + hooks asociados.

## Contexts Disponibles

### HouseholdContext
Estado global del hogar activo, miembros y períodos.

### SiKnessContext
Estado de la aplicación SiKness (período activo, modo privacidad, etc.).

### CategoryHierarchyContext ⚡ NEW (Issue #22)
Carga y cachea la jerarquía completa de categorías (parents → categories → subcategories).
- **Propósito**: Evitar recargas repetidas en cada diálogo de edición
- **Uso**: Wrappear páginas que necesiten la jerarquía
- **Hook**: `useCategoryHierarchy()` - acceso a `hierarchy`, `loading`, `error`, `refresh`

## Reglas clave

- Contexts solo para estado global real (household activo, tema, auth minimal).
- Evita sobrecargar el contexto con datos que cambian muy a menudo.
- Divide contextos por dominio para evitar renders masivos.
- Memoiza providers y valores (`useMemo`, `useCallback`).
- Los hooks deben documentar precondiciones y retornar tipos precisos.

## Prohibiciones

- ❌ No llamar APIs directamente desde el Provider; delega en acciones o hooks específicos.
- ❌ No acceder a DB desde contextos.

