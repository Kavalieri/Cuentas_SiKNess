# Modo Oscuro - CuentasSiK

## Implementación Completada

Se ha implementado un sistema completo de modo oscuro usando `next-themes` con persistencia automática en localStorage y soporte para preferencias del sistema.

## Características

- ✅ **Toggle manual**: Botón sol/luna en el header
- ✅ **Persistencia**: Preferencia guardada en localStorage
- ✅ **Detección automática**: Detecta preferencia del sistema operativo por defecto
- ✅ **Sin flash**: Transiciones suaves sin parpadeo inicial gracias a `suppressHydrationWarning`
- ✅ **Tailwind integrado**: Usa clases `dark:` de Tailwind automáticamente
- ✅ **Iconos animados**: Rotación suave al cambiar de tema

## Archivos Involucrados

### 1. `components/shared/ThemeProvider.tsx`
Wrapper del provider de `next-themes` para uso en Client Components.

### 2. `components/shared/ThemeToggle.tsx`
Botón toggle con iconos de sol/luna y animaciones. Incluye:
- Hydration-safe rendering (evita mismatch)
- Animaciones de rotación al hover
- Accesibilidad con `aria-label`

### 3. `app/layout.tsx`
Layout raíz con:
- `suppressHydrationWarning` en `<html>` (necesario para next-themes)
- `ThemeProvider` envolviendo toda la app
- Configuración: `attribute="class"`, `defaultTheme="system"`, `enableSystem`

### 4. `app/app/layout.tsx`
Layout de área privada actualizado con:
- `ThemeToggle` en el header (junto a email y SignOut)
- Clases Tailwind usando tokens de color semánticos (`bg-background`, `text-muted-foreground`)

### 5. `tailwind.config.ts`
Ya tenía `darkMode: ['class']` configurado (shadcn/ui lo configuró automáticamente).

### 6. `app/globals.css`
Variables CSS ya definidas para ambos modos:
- `:root` → Modo claro
- `.dark` → Modo oscuro
- Tokens semánticos: `--background`, `--foreground`, `--primary`, etc.

## Uso en Componentes

### Tokens de Color Semánticos (Recomendado)
Usar los tokens predefinidos para que funcionen automáticamente en ambos modos:

```tsx
<div className="bg-background text-foreground">
  <Card className="bg-card text-card-foreground">
    <p className="text-muted-foreground">Texto secundario</p>
  </Card>
</div>
```

### Clases Dark Mode Específicas
Para casos especiales donde necesites control manual:

```tsx
<div className="bg-white dark:bg-gray-900 text-black dark:text-white">
  Contenido
</div>
```

### Hook useTheme (Client Components)
Para lógica condicional basada en el tema:

```tsx
'use client';
import { useTheme } from 'next-themes';

function MyComponent() {
  const { theme, setTheme } = useTheme();
  
  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      Tema actual: {theme}
    </button>
  );
}
```

## Tokens Disponibles

### Colores Base
- `bg-background` / `text-foreground` → Fondo y texto principal
- `bg-card` / `text-card-foreground` → Tarjetas
- `bg-muted` / `text-muted-foreground` → Áreas secundarias/texto atenuado
- `bg-popover` / `text-popover-foreground` → Popovers y dropdowns

### Colores de Acción
- `bg-primary` / `text-primary-foreground` → Botones primarios
- `bg-secondary` / `text-secondary-foreground` → Botones secundarios
- `bg-destructive` / `text-destructive-foreground` → Acciones destructivas
- `bg-accent` / `text-accent-foreground` → Elementos destacados

### Bordes e Inputs
- `border-border` → Bordes generales
- `border-input` → Inputs y campos de formulario
- `ring-ring` → Focus rings (accesibilidad)

## Configuración de next-themes

```tsx
<ThemeProvider
  attribute="class"           // Usa clase .dark en <html>
  defaultTheme="system"       // Por defecto: preferencia del sistema
  enableSystem                // Detecta preferencia OS
  disableTransitionOnChange   // Evita animaciones al cambiar (opcional)
>
```

## Testing

Para probar el modo oscuro:

1. **Manual**: Click en el botón sol/luna en el header
2. **Sistema**: Cambiar preferencia en SO y recargar página
3. **DevTools**: Ejecutar en consola:
   ```js
   localStorage.setItem('theme', 'dark'); // o 'light'
   location.reload();
   ```

## Notas de Implementación

- **Sin flash inicial**: El atributo `suppressHydrationWarning` en `<html>` previene warnings porque next-themes inyecta un script antes del render
- **Persistencia automática**: next-themes guarda en localStorage (key: `theme`)
- **Gráficas (Recharts)**: Los colores `--chart-1` a `--chart-5` ya tienen valores para modo oscuro
- **shadcn/ui**: Todos los componentes instalados ya soportan dark mode (usan tokens semánticos)

## Compatibilidad

- ✅ Next.js 14+ App Router
- ✅ React 18+
- ✅ Tailwind CSS 3+
- ✅ shadcn/ui (todos los componentes)
- ✅ Navegadores modernos (Chrome, Firefox, Safari, Edge)
- ✅ SSR/SSG safe (hydration correcta)

## Mantenimiento

Para agregar nuevos colores al tema:

1. Añadir variable CSS en `app/globals.css`:
   ```css
   :root {
     --mi-color: 180 50% 60%;
   }
   .dark {
     --mi-color: 200 60% 40%;
   }
   ```

2. Registrar en `tailwind.config.ts`:
   ```ts
   theme: {
     extend: {
       colors: {
         'mi-color': 'hsl(var(--mi-color))',
       }
     }
   }
   ```

3. Usar en componentes:
   ```tsx
   <div className="bg-mi-color">Contenido</div>
   ```

## Referencias

- [next-themes docs](https://github.com/pacocoursey/next-themes)
- [Tailwind dark mode](https://tailwindcss.com/docs/dark-mode)
- [shadcn/ui theming](https://ui.shadcn.com/docs/theming)
