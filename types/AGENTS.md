# types/AGENTS.md

> Contratos y DTOs de TypeScript. Sin lógica.

## Reglas clave

- Exporta solo tipos (`export type`, `export interface`). No implementaciones.
- Nombres en PascalCase para tipos e interfaces.
- Tipos derivados o utilidades (`Pick`, `Omit`) en archivos cercanos al dominio.
- Evita `any`; usa `unknown` + refinamiento cuando haga falta.

## Ejemplo

```ts
export interface TransactionDTO {
  id: string;
  householdId: string;
  amount: number;
  description: string;
  occurredAt: string; // ISO
}
```
