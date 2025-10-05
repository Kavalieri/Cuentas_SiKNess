# CuentasSiK - AI Coding Agent Instructions

## 🔧 Model Context Protocol (MCP) - PRIORIDAD ABSOLUTA

**⚠️ REGLA CRÍTICA**: Usar SIEMPRE los MCPs disponibles en lugar de comandos CLI o acciones manuales.

### **MCPs Configurados y Disponibles:**

#### **1. Supabase MCP** 🗄️
**Activación**: `activate_supabase_project_management()` o herramientas específicas

**Herramientas disponibles:**
- `mcp_supabase_apply_migration(project_id, name, query)` - Aplicar migraciones SQL
- `mcp_supabase_execute_sql(project_id, query)` - Ejecutar queries SQL directamente
- `mcp_supabase_list_migrations(project_id)` - Listar migraciones aplicadas
- `mcp_supabase_list_tables(project_id, schemas)` - Listar tablas y estructura
- `mcp_supabase_list_extensions(project_id)` - Listar extensiones instaladas
- `mcp_supabase_get_advisors(project_id, type)` - Obtener alertas de seguridad/performance
- `mcp_supabase_get_logs(project_id, service)` - Obtener logs (api, postgres, auth, etc.)

**Cuándo usar:**
- ✅ Aplicar migraciones: `apply_migration()` en vez de `supabase db push`
- ✅ Verificar tablas: `list_tables()` en vez de SQL Editor manual
- ✅ Ejecutar SQL: `execute_sql()` en vez de pedir al usuario
- ✅ Validar estructura: `execute_sql()` con queries de información_schema
- ✅ Debugging: `get_logs()` para ver errores en tiempo real

**Project ID**: `fizxvvtakvmmeflmbwud` (siempre usar este ID)

**Ejemplo de workflow:**
```typescript
// ❌ INCORRECTO (CLI):
// "Ejecuta este SQL en Supabase SQL Editor..."
// npx supabase db push

// ✅ CORRECTO (MCP):
await mcp_supabase_apply_migration({
  project_id: "fizxvvtakvmmeflmbwud",
  name: "add_new_feature",
  query: "CREATE TABLE..."
});

// Validar inmediatamente
await mcp_supabase_list_tables({
  project_id: "fizxvvtakvmmeflmbwud",
  schemas: ["public"]
});
```

#### **2. GitHub MCP** 🐙
**Activación**: `activate_github_repository_management()`, `activate_github_pull_request_management()`, etc.

**Herramientas disponibles:**
- `mcp_github_github_create_or_update_file()` - Crear/actualizar archivos directamente
- `mcp_github_github_push_files()` - Push múltiples archivos en un commit
- `mcp_github_github_create_branch()` - Crear branches
- `mcp_github_github_list_branches()` - Listar branches
- **Pull Requests**: crear, actualizar, mergear, revisar
- **Issues**: crear, comentar, asignar, cerrar
- **Workflows**: ejecutar, obtener logs, cancelar

**Cuándo usar:**
- ✅ Crear branches para features: `create_branch()` 
- ✅ Push directo de archivos: `push_files()` (para múltiples archivos)
- ✅ Crear PRs automáticos: cuando el cambio es grande
- ✅ Gestionar issues: crear sub-tareas, trackear bugs

**Owner/Repo**: `Kavalieri/CuentasSiK`

#### **3. Vercel MCP** 🔺
**Activación**: `activate_vercel_tools()` (ya activado)

**Herramientas disponibles:**
- `mcp_vercel_deploy_to_vercel()` - Deploy automático
- `mcp_vercel_list_deployments()` - Listar deployments recientes
- `mcp_vercel_get_deployment()` - Obtener detalles de deployment
- `mcp_vercel_get_deployment_build_logs()` - Ver logs de build
- `mcp_vercel_list_projects()` - Listar proyectos
- `mcp_vercel_get_project()` - Detalles del proyecto

**Cuándo usar:**
- ✅ Deploy después de push: `deploy_to_vercel()` automático
- ✅ Verificar build: `get_deployment_build_logs()` si hay error
- ✅ Monitorear deployments: `list_deployments()` para ver histórico

### **Workflow de Desarrollo con MCPs:**

#### **Feature Completo (Ejemplo Real):**
```typescript
// 1. Crear migración SQL
const migrationSQL = `
  CREATE TABLE new_feature (...);
  CREATE INDEX idx_new_feature ON new_feature(...);
  ALTER TABLE new_feature ENABLE ROW LEVEL SECURITY;
`;

// 2. Aplicar a Supabase (sin CLI)
await mcp_supabase_apply_migration({
  project_id: "fizxvvtakvmmeflmbwud",
  name: "add_new_feature",
  query: migrationSQL
});

// 3. Validar estructura
const tables = await mcp_supabase_list_tables({
  project_id: "fizxvvtakvmmeflmbwud",
  schemas: ["public"]
});
// Buscar "new_feature" en resultado

// 4. Verificar RLS y policies
await mcp_supabase_execute_sql({
  project_id: "fizxvvtakvmmeflmbwud",
  query: `
    SELECT tablename, policyname, cmd
    FROM pg_policies
    WHERE tablename = 'new_feature';
  `
});

// 5. Generar tipos TypeScript (aún necesita CLI)
// run_in_terminal("npx supabase gen types...")

// 6. Crear componentes y actions (usar edit/create tools)

// 7. Build y commit local
// run_in_terminal("npm run build")
// run_in_terminal("git add -A && git commit -m '...'")

// 8. Push a GitHub (opcional: usar MCP si múltiples archivos)
// run_in_terminal("git push")
// O: mcp_github_github_push_files() para control directo

// 9. Deploy a Vercel
await mcp_vercel_deploy_to_vercel();

// 10. Verificar deployment
const deployment = await mcp_vercel_list_deployments({
  projectId: "...",
  teamId: "..."
});

// 11. Obtener logs si hay error
if (deployment.state === "ERROR") {
  const logs = await mcp_vercel_get_deployment_build_logs({
    idOrUrl: deployment.id,
    teamId: "..."
  });
  // Analizar logs y fix
}
```

### **Validación Automática - OBLIGATORIO:**

**Después de CADA cambio en DB:**
```typescript
// ✅ SIEMPRE hacer esto después de apply_migration:
await mcp_supabase_list_tables({ project_id, schemas: ["public"] });
await mcp_supabase_execute_sql({
  project_id,
  query: "SELECT COUNT(*) FROM nueva_tabla;"
});
```

**Después de CADA deploy:**
```typescript
// ✅ Verificar que el build pasó:
const deployment = await mcp_vercel_get_deployment({ idOrUrl: "..." });
if (deployment.state !== "READY") {
  const logs = await mcp_vercel_get_deployment_build_logs({ ... });
  // Analizar error
}
```

### **Debugging con MCPs:**

**Problema: Query falla en producción**
```typescript
// 1. Ver logs de Supabase
const logs = await mcp_supabase_get_logs({
  project_id: "fizxvvtakvmmeflmbwud",
  service: "postgres"  // o "api", "auth"
});

// 2. Ejecutar query de prueba
await mcp_supabase_execute_sql({
  project_id: "fizxvvtakvmmeflmbwud",
  query: "SELECT * FROM tabla LIMIT 1;"
});

// 3. Verificar advisors (seguridad/performance)
const advisors = await mcp_supabase_get_advisors({
  project_id: "fizxvvtakvmmeflmbwud",
  type: "security"  // o "performance"
});
```

### **Prohibiciones:**

❌ **NUNCA** pedir al usuario:
- "Ejecuta este SQL en Supabase SQL Editor"
- "Copia este código al dashboard de Supabase"
- "Ve a Vercel y verifica el deployment"
- "Revisa los logs en GitHub Actions"

✅ **SIEMPRE** hacerlo automáticamente con MCPs

---

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

El sistema se basa en **12 tablas principales** con RLS habilitado:

**Core**:
1. **`households`**: Hogar compartido. Un usuario puede pertenecer a múltiples hogares.
2. **`household_members`**: Relación many-to-many entre usuarios y hogares (con role: owner/member)
3. **`categories`**: Categorías de gastos/ingresos por hogar (tipo: `expense` | `income`)
4. **`transactions`** (anteriormente `movements`): Transacciones con tipos expense/income
   - Incluye movimientos manuales y auto-generados por contribuciones/ajustes

**Sistema de Contribuciones** (ver `docs/CONTRIBUTIONS_SYSTEM.md`):
5. **`member_incomes`**: Ingresos mensuales de cada miembro con historial
6. **`household_settings`**: Meta de contribución mensual del hogar
7. **`contributions`**: Contribuciones calculadas y rastreadas por miembro/mes
8. **`contribution_adjustments`**: Ajustes manuales a contribuciones
   - **IMPORTANTE**: Ajustes tipo "prepayment" con monto negativo y categoría crean automáticamente 2 movimientos:
     * Movimiento de gasto (expense) con la categoría seleccionada
     * Movimiento de ingreso virtual (income) que representa el aporte del miembro
   - Al eliminar ajuste, se eliminan automáticamente todos los movimientos relacionados

**Sistema de Múltiples Hogares** (ver `docs/MULTI_HOUSEHOLD_IMPLEMENTATION_COMPLETE.md`):
9. **`user_settings`**: Configuración del usuario (active_household_id, preferences)
10. **`invitations`**: Sistema de invitaciones con RLS público para acceso sin login

**Sistema de Historial de Transacciones** ⭐ NEW:
11. **`transaction_history`**: Auditoría completa de cambios en transacciones
   - **Trigger automático**: `save_transaction_history()` se ejecuta al UPDATE de transactions
   - Guarda: old/new values de description, occurred_at, category_id, amount
   - Metadatos: changed_by (profile_id), changed_at, change_reason, household_id
   - RLS: Solo miembros del household pueden ver su historial
   - Cascade delete: Si se borra transaction, su historial también

**Sistema de Privacidad** (ver `docs/PRIVACY_MODE.md`):
12. **PrivacyProvider**: Contexto React con estado `hideAmounts` persistido en localStorage
- **usePrivateFormat()**: Hook que retorna `formatPrivateCurrency()` (muestra "•••" si hideAmounts activo)
- **PrivacyToggle**: Botón Eye/EyeOff en header junto a ThemeToggle
- **Uso**: Ocultar cantidades en lugares públicos con un click

**Punto crítico**: Row Level Security (RLS) está habilitado desde el día 1. Todas las políticas verifican que `auth.uid()` pertenezca al `household_id` del recurso consultado.

### Patrones de Autenticación y Seguridad

- **Auth**: Magic link por email (sin contraseña) vía Supabase Auth
- **Sesión**: Validar en Server Components con `lib/supabaseServer.ts`
- **Clientes Supabase**:
  - `lib/supabaseServer.ts`: Para Server Components y Server Actions
  - `lib/supabaseBrowser.ts`: Para Client Components (si es necesario)
- **Validación**: Zod schemas en todas las Server Actions antes de mutaciones
- **No usar**: Redux, Zustand, TRPC, E2E encryption (principio de simplicidad)

### Sistema de Múltiples Hogares

**Concepto**: Un usuario puede crear/unirse a ilimitados hogares. El sistema rastrea qué hogar está "activo" en cada momento.

**Tabla clave**: `user_settings`
- `active_household_id`: UUID del hogar actualmente activo para el usuario
- `preferences`: JSONB para futuras configuraciones

**Funciones importantes** (`lib/supabaseServer.ts`):
- `getUserHouseholdId()`: Retorna el household_id activo del usuario actual
  * Lógica: Lee `user_settings.active_household_id` → Verifica membresía → Fallback primer hogar → Auto-guarda
- `getUserHouseholds()`: Retorna TODOS los hogares del usuario con roles
  * Retorna: `Array<{ id, name, role: 'owner' | 'member', created_at }>`

**Acciones** (`lib/actions/user-settings.ts`):
- `setActiveHousehold(householdId)`: Cambia el hogar activo del usuario
  * Verifica membresía → Actualiza user_settings → Revalida layout
- `getActiveHouseholdId()`: Helper para obtener el hogar activo

**UI** (`components/shared/HouseholdSelector.tsx`):
- Selector dropdown con iconos (👑 owner, 👥 member)
- Solo aparece si el usuario tiene 2+ hogares
- Al cambiar: llama `setActiveHousehold()` → muestra toast → recarga página

**Auto-activación**:
- Al crear un hogar nuevo → se activa automáticamente
- Al aceptar una invitación → el hogar aceptado se activa automáticamente
- Implementado en `createHousehold()` y `acceptInvitation()`

**Reglas**:
- Siempre usar `getUserHouseholdId()` para obtener el household_id en Server Components/Actions
- NUNCA asumir que un usuario tiene solo un hogar
- Toda consulta de datos debe filtrar por `household_id = await getUserHouseholdId()`

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
│                                # getUserHouseholdId() - hogar activo del usuario
│                                # getUserHouseholds() - todos los hogares del usuario
├─ supabaseBrowser.ts          # Cliente Supabase client-side
├─ actions/
│  └─ user-settings.ts         # setActiveHousehold(), getActiveHouseholdId()
├─ result.ts                   # Helper tipos Result
├─ format.ts                   # formatCurrency, formatDate
└─ date.ts                     # getMonthRange, startOfMonth, endOfMonth, toISODate

docs/
├─ VERCEL_DEPLOY.md                          # Guía de despliegue en Vercel
├─ SUPABASE_CLI.md                           # Guía de Supabase CLI y migraciones
├─ CONTRIBUTIONS_SYSTEM.md                   # Sistema de contribuciones proporcionales
└─ MULTI_HOUSEHOLD_IMPLEMENTATION_COMPLETE.md # Sistema de múltiples hogares ⭐ NEW
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
3. **Múltiples hogares por usuario**: Un usuario puede crear/unirse a ilimitados hogares. El sistema rastrea cuál está "activo".
4. **Invitaciones públicas**: Las invitaciones son accesibles sin login (RLS público) - seguro porque el token es secreto (64 chars).
5. **Auto-activación**: Hogares nuevos (creados o aceptados) se activan automáticamente para mejor UX.
6. **Dashboard mensual**: Por defecto muestra el mes actual; selector para navegar entre meses.
7. **Sin E2E encryption**: Confiar en Supabase para cifrado en reposo.

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
   - `getUserHouseholdId()`: Obtiene el household_id activo del usuario
   - `getUserHouseholds()`: Obtiene todos los hogares del usuario
5. **`lib/supabaseBrowser.ts`**: Cliente Supabase para Client Components
6. **`lib/actions/user-settings.ts`**: Gestión del hogar activo
   - `setActiveHousehold(householdId)`: Cambia el hogar activo
   - `getActiveHouseholdId()`: Obtiene el hogar activo

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
- `addContributionAdjustment()`: Agregar ajuste manual (crea movimientos duales automáticamente) ⭐
- `deleteContributionAdjustment()`: Eliminar ajuste y sus movimientos relacionados ⭐

**Integración con Movimientos**:
- Cada gasto cuenta como pago hacia la contribución del mes
- El estado se actualiza automáticamente: `pending`, `partial`, `paid`, `overpaid`
- **Ajustes con Movimientos Duales** ⭐ NEW:
  * Ajuste tipo "prepayment" con monto negativo y categoría → crea automáticamente:
    1. Movimiento de gasto (expense) en la categoría seleccionada
    2. Movimiento de ingreso virtual (income) representando el aporte del miembro
  * Al eliminar ajuste → se eliminan automáticamente TODOS los movimientos relacionados
  * Búsqueda inteligente por: movement_id, descripción [Ajuste: razón], [Pre-pago]

### Sistema de Privacy Mode ⭐ NEW

Ver documentación completa en `docs/PRIVACY_MODE.md`.

**Concepto**: Ocultar cantidades monetarias cuando se usa la app en lugares públicos.

**Componentes**:
- `components/shared/PrivacyProvider.tsx`: Contexto global con estado hideAmounts
- `components/shared/PrivacyToggle.tsx`: Botón Eye/EyeOff en header
- `components/shared/PrivateAmount.tsx`: Wrapper para mostrar cantidades
- `lib/hooks/usePrivateFormat.ts`: Hook personalizado

**Uso en componentes**:
```typescript
'use client';
import { usePrivateFormat } from '@/lib/hooks/usePrivateFormat';

const { formatPrivateCurrency } = usePrivateFormat();
return <span>{formatPrivateCurrency(amount)}</span>;
// Si hideAmounts = true → muestra "•••"
// Si hideAmounts = false → muestra "1.500,00 €"
```

**Persistencia**: localStorage como `'hide-amounts'`

### Utilidades de Testing y Wipe ⭐ NEW

**Wipe Selectivo** (`db/wipe_data_preserve_users.sql`):
- Script SQL para limpiar datos pero preservar usuarios y estructura
- **Preserva**: auth.users, profiles, system_admins, estructura DB
- **Limpia**: transactions, contributions, adjustments, categories, households
- **Crea automáticamente**: Hogar "Casa Test" con 2 miembros + 10 categorías
- **Uso**: Ejecutar en Supabase SQL Editor antes de pruebas

**Procedimiento de Testing** (`docs/TEST_PROCEDURE.md`):
- Guía paso a paso para testing completo desde cero
- Incluye: wipe → configuración → ajustes → verificación
- Checklist de funcionalidades y valores esperados

**Debug de Ajustes** (`db/delete_orphan_adjustment.sql`):
- Queries SQL para encontrar y eliminar ajustes huérfanos
- Útil si la UI falla en eliminar correctamente

### Referencias Clave

- Especificación completa: `prompt_inicial_del_agente_app_gastos_pareja_next_instructions.md`
- Schema DB: `db/schema.sql`, `db/contributions-schema.sql`
- Guías principales:
  * `docs/VERCEL_DEPLOY.md` - Deploy en Vercel
  * `docs/SUPABASE_CLI.md` - Workflow de migraciones
  * `docs/CONTRIBUTIONS_SYSTEM.md` - Sistema de contribuciones
  * `docs/MULTI_HOUSEHOLD_IMPLEMENTATION_COMPLETE.md` - Sistema multi-hogar ⭐
  * `docs/PRIVACY_MODE.md` - Ocultación de cantidades ⭐ NEW
  * `docs/TEST_PROCEDURE.md` - Procedimiento de testing ⭐ NEW
  * `docs/SESSION_SUMMARY_2025-10-04.md` - Resumen de cambios recientes ⭐ NEW
- Config: `.env.example`

## Cuando Implementes Nueva Funcionalidad

1. ✅ Verifica que RLS esté habilitado en tablas nuevas
2. ✅ Crea/actualiza tipos TypeScript basados en schema Supabase
3. ✅ Usa `getUserHouseholdId()` para obtener el hogar activo (NO asumir un solo hogar)
4. ✅ Filtra TODAS las consultas por `household_id = await getUserHouseholdId()`
3. ✅ Valida input con Zod en Server Actions
4. ✅ Usa `revalidatePath()` tras mutaciones
5. ✅ Mantén el código compilando y arrancando
6. ✅ No dejes TODOs genéricos; propón alternativa concreta
