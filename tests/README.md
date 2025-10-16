# Entorno de Pruebas CuentasSiK

Este directorio consolida la estrategia de pruebas automatizadas del proyecto. El objetivo es ofrecer una base profesional, escalable y sencilla de extender sin depender de ejecuciones manuales sobre la aplicación completa.

## Estructura

```
tests/
├── AGENTS.md          # Instrucciones para agentes y colaboradores
├── README.md          # Este documento
├── unit/              # Suites unitarias (funciones puras, hooks aislados)
├── integration/       # Casos con múltiples módulos o acceso controlado a servicios
├── e2e/               # Pruebas ligeras end-to-end (por definir)
└── support/           # Fixtures, builders, utilidades auxiliares (mocks, factories)
```

### Convenciones

- Los archivos siguen el patrón `<feature>.<scope>.test.ts` (`dual-flow.service.unit.test.ts`).
- Los namespaces (`unit`, `integration`, `e2e`) definen el alcance esperado y los recursos permitidos.
- Las pruebas heredadas bajo `__tests__` continúan vigentes; al refactorizar módulos, migra su contenido aquí.

## Herramientas

- **Vitest** (`npm run test`, `npm run test:watch`)
  - Configuración central en `vitest.config.ts`.
  - Setup compartido en `vitest.setup.ts`.
- **VS Code**
  - Lanzadores dedicados en `.vscode/launch.json` (`Vitest Watch`).
  - Usa la vista Run & Debug para iniciar sesiones con breakpoints.

## Scripts útiles

| Comando                    | Descripción                          |
| -------------------------- | ------------------------------------ |
| `npm run test`             | Ejecuta toda la suite en modo CI.    |
| `npm run test:watch`       | Ejecuta Vitest en modo observación.  |
| `npm run test:unit`        | (Nuevo) Foco en `tests/unit`.        |
| `npm run test:integration` | (Nuevo) Foco en `tests/integration`. |
| `npm run test:coverage`    | (Nuevo) Reporte de cobertura global. |

> Añade estos scripts con `npm run test:<scope>` cuando existan suites activas; véase `package.json`.

## Flujo recomendado

1. Crea o actualiza las pruebas en el namespace adecuado.
2. Ejecuta el script específico (`test:unit`, `test:integration`) antes del global.
3. Usa el modo watch + VS Code debugger para iterar rápidamente.
4. Genera cobertura periódica (`npm run test:coverage`) para detectar áreas sin pruebas.

## Próximos pasos

- Definir harness para pruebas de integración con PostgreSQL (docker compose o `testcontainers`).
- Evaluar Playwright para escenarios e2e críticos.
- Documentar generadores de datos comunes en `tests/support`.
