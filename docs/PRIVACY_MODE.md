# Sistema de Ocultación de Cantidades (Privacy Mode)

## Descripción

Sistema para ocultar cantidades monetarias en la UI cuando se usa la aplicación en lugares públicos.

## Implementación

### 1. Contexto Global

**`components/shared/PrivacyProvider.tsx`**:
- Provee contexto `PrivacyContext` con estado `hideAmounts`
- Persiste preferencia en `localStorage` como `'hide-amounts'`
- Función `toggleHideAmounts()` para cambiar el estado

### 2. Hook Personalizado

**`lib/hooks/usePrivateFormat.ts`**:
```typescript
const { formatPrivateCurrency, formatPrivateNumber, hideAmounts } = usePrivateFormat();
```

- `formatPrivateCurrency(amount, currency?, locale?)`: Formatea moneda o retorna '•••'
- `formatPrivateNumber(value)`: Formatea número o retorna '•••'
- `hideAmounts`: Boolean del estado actual

### 3. Componentes UI

**`components/shared/PrivacyToggle.tsx`**:
- Botón con iconos Eye/EyeOff
- Ubicado en header junto a ThemeToggle
- Tooltip: "Mostrar cantidades" / "Ocultar cantidades"

**`components/shared/PrivateAmount.tsx`**:
- Wrapper reutilizable para mostrar cantidades
- Props: `amount`, `currency?`, `locale?`, `className?`
- Uso: `<PrivateAmount amount={1500.50} />`

### 4. Integración en Layout

**`app/layout.tsx`**:
```tsx
<ThemeProvider>
  <PrivacyProvider>
    {children}
  </PrivacyProvider>
</ThemeProvider>
```

**`app/app/layout.tsx`**:
- PrivacyToggle agregado entre ThemeToggle y SignOut
- BalanceDisplay actualizado para usar `usePrivateFormat()`

## Uso en Componentes Existentes

### Opción A: Usar el Hook

Para componentes que ya formatean cantidades:

```tsx
'use client';
import { usePrivateFormat } from '@/lib/hooks/usePrivateFormat';

export function MyComponent({ amount }: { amount: number }) {
  const { formatPrivateCurrency } = usePrivateFormat();
  
  return <div>{formatPrivateCurrency(amount)}</div>;
}
```

### Opción B: Usar el Componente Wrapper

Para JSX simple:

```tsx
import { PrivateAmount } from '@/components/shared/PrivateAmount';

<PrivateAmount amount={contribution.expected_amount} className="font-bold" />
```

## Componentes a Actualizar (TODO)

### Alta Prioridad (siempre visibles)
- ✅ `BalanceDisplay` - Balance del header
- ⬜ `DashboardContent` - Cards de ingresos/gastos/balance del mes
- ⬜ `HeroContribution` - Tarjeta de contribución principal
- ⬜ `HouseholdSummary` - Resumen del hogar (meta, recaudado, pendiente)
- ⬜ `ContributionMembersList` - Lista de contribuciones de miembros

### Media Prioridad (listas)
- ⬜ `MovementsList` - Últimos movimientos
- ⬜ `ExpenseList` - Lista de gastos/ingresos
- ⬜ `ContributionAdjustmentsSection` - Lista de ajustes

### Baja Prioridad (modales/formularios)
- ⬜ Forms de edición (los montos en inputs no se ocultan por diseño)
- ⬜ Confirmaciones de eliminación

## Comportamiento

- **Activado** (hideAmounts = true):
  - Todas las cantidades se muestran como `•••`
  - Preferencia guardada en localStorage
  - Icono: EyeOff (ojo tachado)

- **Desactivado** (hideAmounts = false, por defecto):
  - Cantidades normales formateadas
  - Icono: Eye (ojo abierto)

## Notas de Implementación

- ✅ Client-side only (React Context)
- ✅ Persistencia en localStorage
- ✅ Togglable sin refresh
- ✅ Integrado en layout principal
- ⚠️ Requiere 'use client' en componentes que usen el hook
- ⚠️ Componentes Server no pueden usar el hook directamente (pasar como props)

## Testing Manual

1. Login a la app
2. Click en el botón Eye (ojo) junto al tema
3. Verificar que cantidades se ocultan como `•••`
4. Click de nuevo para mostrar
5. Recargar página → debe mantener la preferencia
