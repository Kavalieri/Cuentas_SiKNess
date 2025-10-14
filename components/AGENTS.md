# components/AGENTS.md

> UI compartida basada en Tailwind + shadcn/ui. Sin lógica de datos ni acceso a DB.

## Reglas clave

- Componentes puros de presentación. No hagas fetch aquí; recibe datos por props.
- Tipa todas las props (`interface Props { ... }`). Evita `any`.
- Usa shadcn/ui como base; personaliza con `className`.
- Naming: `PascalCase.tsx` por componente. Export default solo si es único.
- Estilos: solo Tailwind. No CSS modules ni estilos inline salvo excepciones.
- Accesibilidad: usa roles/aria cuando aplique. Labels para inputs.

## Convenciones

- Carpeta `ui/`: primitives (botón, card, tabs, etc.)
- Carpeta `shared/`: componentes reutilizables entre features (EmptyState, Loading, etc.)
- Carpeta por dominio (balance/, periods/, ...): UI específica de cada feature.

## Testing

- Prueba componentes críticos (render básico y props) cuando tengan lógica de presentación relevante.
- No testees primitives de shadcn/ui.

## Prohibiciones

- ❌ No acceder a DB, ni leer del contexto de servidor.
- ❌ No acoplar a rutas; componentes deben ser reusables.
- ❌ No dependas de `window` sin `use client` y guards.
