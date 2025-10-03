# CuentasSiK - AI Coding Agent Instructions

## Arquitectura del Proyecto

**CuentasSiK** es una aplicación web minimalista de gestión de gastos compartidos para parejas, construida con Next.js (App Router) + Supabase + TypeScript.

### Stack Técnico Fijo
- **Framework**: Next.js 14+ (App Router, Server Actions, React 18+)
- **Lenguaje**: TypeScript estricto
- **UI**: Tailwind CSS + shadcn/ui (Button, Input, Dialog, Form, Table, Select, Badge, Card, Tabs)
- **Tema**: next-themes (dark/light mode con persistencia y detección del sistema)
- **Formularios**: React Hook Form + Zod para validación
- **Backend**: Supabase (Postgres + Auth con magic link)
- **Gráficas**: Recharts
- **Despliegue**: Vercel (frontend) + Supabase (backend)
- **Testing**: Vitest para utilidades puras
- **CI/CD**: GitHub Actions (lint + typecheck + build)

### Modelo de Datos (Esquema en `db/schema.sql`)

El sistema se basa en **8 tablas principales** con RLS habilitado:

**Core**:
1. **`households`**: Hogar compartido (1 pareja = 1 household)
2. **`household_members`**: Relación many-to-many entre usuarios y hogares
3. **`categories`**: Categorías de gastos/ingresos por hogar (tipo: `expense` | `income`)
4. **`movements`**: Transacciones (gastos/ingresos) con fecha, monto, categoría, nota

**Sistema de Contribuciones** (ver `docs/CONTRIBUTIONS_SYSTEM.md`):
5. **`member_incomes`**: Ingresos mensuales de cada miembro con historial
6. **`household_settings`**: Meta de contribución mensual del hogar
7. **`contributions`**: Contribuciones calculadas y rastreadas por miembro/mes
8. **`contribution_adjustments`**: Ajustes manuales a contribuciones

**Punto crítico**: Row Level Security (RLS) está habilitado desde el día 1. Todas las políticas verifican que `auth.uid()` pertenezca al `household_id` del recurso consultado.

### Patrones de Autenticación y Seguridad

- **Auth**: Magic link por email (sin contraseña) vía Supabase Auth
- **Sesión**: Validar en Server Components con `lib/supabaseServer.ts`
- **Clientes Supabase**:
  - `lib/supabaseServer.ts`: Para Server Components y Server Actions
  - `lib/supabaseBrowser.ts`: Para Client Components (si es necesario)
- **Validación**: Zod schemas en todas las Server Actions antes de mutaciones
- **No usar**: Redux, Zustand, TRPC, E2E encryption (principio de simplicidad)

### Estructura de Rutas y Componentes (App Router)

```
app/
├─ (marketing)/page.tsx       # Landing page con CTA al login
├─ login/page.tsx              # Login con email (magic link)
├─ app/                        # Área privada (requiere auth)
│  ├─ layout.tsx               # Layout con navegación
│  ├─ page.tsx                 # Dashboard: resumen mensual, gráficos, últimas transacciones
│  ├─ expenses/
│  │  ├─ page.tsx              # Listado completo con filtros
│  │  ├─ actions.ts            # Server Actions (CRUD movimientos)
│  │  ├─ schema.ts             # Zod schemas
│  │  └─ components/           # Componentes locales de esta ruta
│  │     ├─ ExpenseForm.tsx
│  │     └─ ExpenseList.tsx
│  ├─ categories/page.tsx      # CRUD de categorías
│  ├─ contributions/           # Sistema de contribuciones proporcionales
│  │  ├─ page.tsx              # Dashboard y configuración
│  │  └─ actions.ts            # Server Actions (contribuciones)
│  └─ settings/page.tsx        # Gestión del hogar e invitaciones
└─ api/cron/route.ts           # Hook futuro para import/export

components/
├─ ui/                         # shadcn/ui wrappers
│  ├─ button.tsx
│  ├─ input.tsx
│  └─ ...
└─ shared/                     # Componentes compartidos entre rutas
   ├─ DataTable.tsx
   ├─ FilterBar.tsx
   └─ MonthSelector.tsx

lib/
├─ supabaseServer.ts           # Cliente Supabase server-side
├─ supabaseBrowser.ts          # Cliente Supabase client-side
├─ result.ts                   # Helper tipos Result
├─ format.ts                   # formatCurrency, formatDate
└─ date.ts                     # getMonthRange, startOfMonth, endOfMonth, toISODate

docs/
├─ VERCEL_DEPLOY.md            # Guía de despliegue en Vercel
├─ SUPABASE_CLI.md             # Guía de Supabase CLI y migraciones
└─ CONTRIBUTIONS_SYSTEM.md     # Sistema de contribuciones proporcionales
```

**Patrón de colocación**: Componentes locales junto a su ruta. Componentes compartidos en `components/shared`.

### Convenciones de Código

#### Nombres y Estructura
- **Variables/Funciones**: `camelCase` → `getMonthlyTotals`, `createMovement`
- **Componentes/Tipos**: `PascalCase` → `AddMovementDialog`, `Movement`
- **Constantes globales**: `SCREAMING_SNAKE_CASE`
- **Rutas Next**: `kebab-case` → `/app/expenses`
- **SQL**: `snake_case` → `household_id`, `occurred_at`
- **Tablas**: Plurales → `movements`, `categories`, `household_members`
- **Índices**: Descriptivos → `idx_movements_household_occurred_at_desc`

#### Archivos y Estructura
- **Componentes**: `PascalCase.tsx` → `AddMovementDialog.tsx`
- **Hooks/utils**: `camelCase.ts` → `useToast.ts`, `formatCurrency.ts`
- **Acciones**: `actions.ts` por ruta o `actions/*.ts` si hay varias
- **Esquemas Zod**: `schema.ts` en la misma carpeta que el formulario/acción
- **Tipos**: `PascalCase` para interfaces/types; preferir `type` sobre `interface` (salvo declaration merging)

#### Exports e Imports
- **Exports**: Named exports por defecto. Solo `default export` en páginas Next.js donde sea obligatorio
- **Imports**: Absolutos con alias `@/` (configurado en `tsconfig.json`)
- **Imports de tipos**: Usar `import type { ... } from '...'` (enforced por ESLint)
- **NO usar imports relativos ascendentes** (`../`) - siempre `@/...`

#### Valores y Convenciones
- **Null vs undefined**: Preferir `undefined` para opcionales; reservar `null` para valores DB
- **Zona horaria**: `Europe/Madrid` por defecto
- **Formato moneda**: `Intl.NumberFormat('es-ES', { style:'currency', currency:'EUR' })`
- **Librería fechas**: `date-fns` (con `date-fns-tz` si hace falta) - NO moment.js
- **CSS**: Solo utilidades Tailwind - NO CSS-in-JS
- **Accesibilidad**: Siempre `<Label htmlFor=...>`, `aria-*` en botones icónicos, focus visible

#### Server Actions (Patrón Obligatorio)
Archivo `actions.ts` por módulo de página con `'use server'` al inicio. Usar helper `lib/result.ts`:

```typescript
// lib/result.ts
export type Ok<T = unknown> = { ok: true; data?: T };
export type Fail = { ok: false; message: string; fieldErrors?: Record<string, string[]> };
export type Result<T = unknown> = Ok<T> | Fail;

export const ok = <T>(data?: T): Ok<T> => ({ ok: true, data });
export const fail = (message: string, fieldErrors?: Record<string, string[]>): Fail => 
  ({ ok: false, message, fieldErrors });
```

```typescript
// app/app/expenses/actions.ts
'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { supabaseServer } from '@/lib/supabaseServer';
import { ok, fail } from '@/lib/result';
import type { Result } from '@/lib/result';

const MovementSchema = z.object({
  household_id: z.string().uuid(),
  category_id: z.string().uuid().nullable(),
  type: z.enum(['expense','income']),
  amount: z.coerce.number().positive(),
  currency: z.string().min(1),
  note: z.string().optional(),
  occurred_at: z.coerce.date(),
});

export async function createMovement(formData: FormData): Promise<Result> {
  const parsed = MovementSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
  }
  
  const supabase = supabaseServer();
  const { error } = await supabase.from('movements').insert(parsed.data);
  
  if (error) return fail(error.message);
  
  revalidatePath('/app');
  return ok();
}
```

**Reglas**:
- Validación con `zod.safeParse` SIEMPRE
- Usar helpers `ok()` y `fail()` de `lib/result.ts`
- Retornar `Promise<Result<T>>` con tipo explícito
- NO lanzar excepciones salvo errores no recuperables
- `revalidatePath()` tras mutaciones exitosas

#### Manejo de Errores en UI
- `ok: false` → `toast.error(message)` (usando sonner) + pintar `fieldErrors` bajo inputs
- Éxito → `toast.success('Guardado')`
- Error boundaries: `error.tsx` por segmento y `not-found.tsx` para 404s
- Logging: consola servidor (Sentry opcional fase 2)

```typescript
// Ejemplo de uso en componente
const result = await createMovement(formData);
if (!result.ok) {
  toast.error(result.message);
  // Pintar fieldErrors en el formulario con React Hook Form
  if (result.fieldErrors) {
    Object.entries(result.fieldErrors).forEach(([field, errors]) => {
      form.setError(field, { message: errors[0] });
    });
  }
} else {
  toast.success('Movimiento guardado');
}
```

#### Componentes shadcn/ui
**Instalación inicial**:
```bash
npx shadcn@latest add button input label form dialog sheet select table card tabs badge skeleton sonner
```

- **Base**: Button, Input, Label, Select, Dialog, Sheet (drawer), Form, Table, Card, Tabs, Badge, Skeleton
- **Toasts**: sonner (ya incluido en shadcn/ui)
- **Patrón Móvil/Escritorio**: 
  - Crear/editar → `Sheet` (drawer) en móvil, `Dialog` en escritorio
  - Listas → Cards densos en móvil, `Table` en ≥ md breakpoint
- **Tema**: next-themes integrado (dark/light + detección sistema) - Ver `docs/DARK_MODE.md`
  - Usar tokens semánticos: `bg-background`, `text-foreground`, `bg-card`, `text-muted-foreground`
  - Toggle disponible en header con `ThemeToggle` component
  - Persistencia automática en localStorage
- **Accesibilidad**: `<Label htmlFor=...>` siempre, `aria-*` en iconos, focus visible, atajos teclado

#### Fechas y Monedas
- **Helpers de fecha** en `lib/date.ts`: `getMonthRange(date)`, `startOfMonth`, `endOfMonth`, `toISODate`
- **Librería**: `date-fns` (con `date-fns-tz` si hace falta) - NO moment.js
- **Zona horaria**: `Europe/Madrid` por defecto
- **Helpers de formato** en `lib/format.ts`: 
  - `formatCurrency(amount: number, currency='EUR', locale='es-ES')`
  - Usar `Intl.NumberFormat('es-ES', { style:'currency', currency:'EUR' })`
- **Moneda por defecto**: `EUR` (configurable en settings futuro)
- **Formato de fecha en DB**: `DATE` tipo SQL (no timestamps para `occurred_at`)

#### Import/Export
- `lib/csv.ts`: `toCSV(rows)` y `fromCSV(text)` con Papaparse
- Excel: Usar librería `xlsx` cuando se implemente
- Mapeo de columnas: `occurred_at`, `type`, `category`, `amount`, `currency`, `note`
- **Idempotencia**: Si categoría no existe durante import, crearla automáticamente
- **Excel existente** (`Cuentas Casa SiK.xlsx`): Generar `external_ref` hash opcional para idempotencia

### Flujo de Trabajo del Desarrollador

#### Setup Local
```bash
npm install
# Configurar .env.local con NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY
# Ejecutar db/schema.sql y db/seed.sql en Supabase SQL Editor
npm run dev
```

#### Comandos Disponibles
- `npm run dev`: Servidor de desarrollo
- `npm run build`: Build de producción
- `npm run start`: Servidor de producción
- `npm run lint`: ESLint + Prettier
- `npm run typecheck`: Verificación de tipos TypeScript (opcional, build lo hace)
- `npm test`: Ejecutar tests (Vitest)
- `npm run test:watch`: Tests en modo watch

#### Workflow de Branches (Trunk-based)
- **`main` protegido**: Requiere CI (lint + build + typecheck + tests)
- **Nomenclatura de ramas**: `feat/area-descripcion`, `fix/area-bug`, `chore/...`, `docs/...`
  - Ejemplo: `feat/expenses-csv-export`, `fix/auth-redirect`
- **Merge**: Squash and merge para historia limpia
- **Prohibido** push directo a `main`
- Release Please abre PR automático de release en `main`

#### Commits (Conventional Commits)
- `feat:` nueva funcionalidad (bump minor)
- `fix:` corrección (bump patch)
- `chore:`, `docs:`, `refactor:`, `test:` sin bump
- `feat!:` o `fix!:` breaking change (bump major)

Ejemplo: `feat: add CSV export for movements`

#### Releases (Release Please)
- Push a `main` → Release Please analiza commits
- Si hay `feat`/`fix` → Abre PR con CHANGELOG.md y bump semver
- Al mergear PR → Crea tag y GitHub Release automáticamente
- Configuración en `release-please-config.json` y `.release-please-manifest.json`

### Decisiones de Diseño Importantes

1. **Simplicidad ante todo**: No usar state management complejo. Server Actions + Supabase client es suficiente.
2. **RLS desde el día 1**: Seguridad en la capa de DB, no solo en el código.
3. **Hogar compartido**: El primer usuario crea el hogar; el segundo se une por invitación (email).
4. **Dashboard mensual**: Por defecto muestra el mes actual; selector para navegar entre meses.
5. **Sin E2E encryption**: Confiar en Supabase para cifrado en reposo.

### Integración con Servicios Externos

- **Supabase Auth**: Magic link configurado en el proyecto Supabase
- **Vercel**: Deploy automático desde `main` branch
- **Google Sheets (futuro)**: OAuth + lectura de rango (placeholder en `api/cron`)

### Testing

#### Estrategia Pragmática
- **Unit (Vitest)**: Utilidades puras → `lib/date.ts`, `lib/format.ts`, `lib/csv.ts`
- **Componentes críticos**: `ExpenseForm` (validaciones + submit), `MonthSelector`
- **Testing library**: React Testing Library para componentes
- **NO testear**: Integraciones Supabase profundas (confiar en RLS + proveedor)
- **E2E (opcional fase 2)**: Playwright smoke tests (crear/editar/borrar) - mockear Auth
- **Coverage objetivo MVP**: 60-70% en utilidades y formularios; 0% en integraciones Supabase

#### Qué testear
✅ `lib/date.ts` → rangos de mes, formateo  
✅ `lib/format.ts` → formateo de moneda y fechas  
✅ `lib/csv.ts` → parse/format CSV  
✅ `ExpenseForm` → validación Zod, submit  
❌ Server Actions con Supabase (confiar en RLS)  
❌ Componentes de shadcn/ui (ya testeados upstream)

### Configuración de Entorno

#### Variables de Entorno
**`.env.example`** (solo claves públicas):
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

⚠️ **PROHIBIDO** subir `SUPABASE_SERVICE_ROLE` al repo. Solo usar local para seed.

#### Vercel
- **Node version**: 20
- Variables de entorno en "Project Settings → Environment Variables"
- No requiere `vercel.json` para MVP

### Seed Data (en `db/seed.sql`)

Valores por defecto:
- **Moneda**: EUR
- **Categorías (gasto)**: Vivienda, Luz, Internet, Supermercado, Butano, Transporte, Ocio, Salud
- **Categorías (ingreso)**: Nómina, Extra
- **Household**: Creado por primer usuario; invitación por email para el segundo

### Utilidades Mínimas Requeridas

Crear estos archivos desde el inicio:

1. **`lib/result.ts`**: Tipos y helpers `ok()`, `fail()` para Result pattern
2. **`lib/format.ts`**: `formatCurrency(amount, currency?, locale?)`
3. **`lib/date.ts`**: `getMonthRange(date)`, `startOfMonth`, `endOfMonth`, `toISODate`
4. **`lib/supabaseServer.ts`**: Cliente Supabase para Server Components/Actions
5. **`lib/supabaseBrowser.ts`**: Cliente Supabase para Client Components

### Configuraciones TypeScript/ESLint/Prettier

#### tsconfig.json (fragmento clave)
```json
{
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": { "@/*": ["./*"] },
    "noUncheckedIndexedAccess": true
  }
}
```

Ver archivos completos en `.eslintrc.json`, `.prettierrc`, `.editorconfig` del repo.

### Decisiones Explícitas NO Incluir en MVP

❌ **i18n básico**: UI en español únicamente  
❌ **PWA**: Posponer a fase 2  
❌ **Sentry**: Posponer; MVP con console.log  
❌ **Migrations automáticas**: Usar `db/schema.sql` + `db/seed.sql` manual en Supabase  

### Despliegue y Operaciones

#### Vercel (Frontend)
- **CLI**: `vercel` (preview), `vercel --prod` (producción)
- **Variables de entorno**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Deploy automático**: Push a `main` → deploy a producción
- **Guía completa**: `docs/VERCEL_DEPLOY.md`

#### Supabase CLI
- **Inicialización**: `supabase init`, `supabase link --project-ref fizxvvtakvmmeflmbwud`
- **Migraciones**: `supabase migration new <nombre>`, `supabase db push`
- **Generar tipos**: `supabase gen types typescript --project-id <id> > types/database.ts`
- **Guía completa**: `docs/SUPABASE_CLI.md`

#### Variables de Entorno
**`.env.local`** (desarrollo):
```env
NEXT_PUBLIC_SUPABASE_URL=https://fizxvvtakvmmeflmbwud.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
```

**Vercel** (producción):
- Configurar las mismas variables en Project Settings → Environment Variables
- Actualizar Supabase Redirect URLs con dominio de Vercel

### Sistema de Contribuciones Proporcionales

Ver documentación completa en `docs/CONTRIBUTIONS_SYSTEM.md`.

**Concepto**: Cada miembro aporta al hogar de forma proporcional a sus ingresos.

**Ejemplo**:
- Meta mensual: 2000€
- Miembro A gana 1500€/mes → contribuye 750€ (37.5%)
- Miembro B gana 2500€/mes → contribuye 1250€ (62.5%)

**Tablas**:
- `member_incomes`: Historial de ingresos de cada miembro
- `household_settings`: Meta de contribución mensual
- `contributions`: Seguimiento mensual de contribuciones (esperado vs pagado)
- `contribution_adjustments`: Ajustes manuales con justificación

**Server Actions** (`app/app/contributions/actions.ts`):
- `setMemberIncome()`: Configurar ingreso de un miembro
- `setContributionGoal()`: Configurar meta mensual del hogar
- `calculateAndCreateContributions()`: Generar contribuciones proporcionales
- `updateContributionPaidAmount()`: Actualizar monto pagado
- `addContributionAdjustment()`: Agregar ajuste manual

**Integración con Movimientos**:
- Cada gasto cuenta como pago hacia la contribución del mes
- El estado se actualiza automáticamente: `pending`, `partial`, `paid`, `overpaid`

### Referencias Clave

- Especificación completa: `prompt_inicial_del_agente_app_gastos_pareja_next_instructions.md`
- Schema DB: `db/schema.sql`, `db/contributions-schema.sql`
- Guías: `docs/VERCEL_DEPLOY.md`, `docs/SUPABASE_CLI.md`, `docs/CONTRIBUTIONS_SYSTEM.md`
- Config: `.env.example`

## Cuando Implementes Nueva Funcionalidad

1. ✅ Verifica que RLS esté habilitado en tablas nuevas
2. ✅ Crea/actualiza tipos TypeScript basados en schema Supabase
3. ✅ Valida input con Zod en Server Actions
4. ✅ Usa `revalidatePath()` tras mutaciones
5. ✅ Mantén el código compilando y arrancando
6. ✅ No dejes TODOs genéricos; propón alternativa concreta
