# tests/AGENTS.md

> Entorno unificado de pruebas para CuentasSiK (Vitest + utilidades auxiliares).

## Alcance

- Estructura central de carpetas para pruebas unitarias (`tests/unit`), de integración (`tests/integration`) y end-to-end ligeras (`tests/e2e`).
- Fixtures, generadores y utilidades compartidas viven en `tests/support`.
- Los módulos de la app mantienen sus pruebas legacy en `__tests__`; al tocar esos módulos, migra o reexporta las suites hacia esta jerarquía.

## Reglas

- Usa Vitest siempre; no mezcles jest/mocha.
- Prefiere pruebas puras sin hitting de DB. Para integración, usa `postgres-mock` o helpers en `tests/support/db` (cuando exista).
- Los nombres de archivos siguen `<feature>.<scope>.test.ts`.
- Exporta helpers con TypeScript estricto y comentarlos solo cuando sea necesario.

## Flujo de trabajo

1. Coloca los assets/fixtures reutilizables en `tests/support`.
2. Agrupa las pruebas por dominio (`dual-flow`, `households`, etc.).
3. Ejecuta `npm run test` o `npm run test:watch` desde la raíz; adopta los nuevos scripts de ámbito cuando apliquen.

## Documentación

- Mantén `tests/README.md` actualizado.
- Al añadir un nuevo stack (p. ej. Playwright), documenta el setup y enlaza desde aquí.
