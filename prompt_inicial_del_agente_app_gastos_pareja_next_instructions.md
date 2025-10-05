# Prompt inicial del agente – App Gastos Pareja (Next.js + Supabase)

> ⚠️ **DEPRECADO**: Este documento contiene el spec original del proyecto.  
> Para la **documentación actualizada**, ver:
> - `.github/copilot-instructions.md` - Instrucciones completas del proyecto
> - `docs/IMPLEMENTATION_PLAN.md` - Sistema refactorizado con 12 migraciones aplicadas
> - `docs/MAJOR_REFACTOR_TRANSACTIONS_SYSTEM.md` - Diseño del sistema actual
> - `db/schema.sql` - Schema real de la base de datos

---

> **Rol del agente**: Arquitecto/implementador full‑stack (TypeScript) con foco en simplicidad, robustez y despliegue rápido. Trabajarás de forma iterativa, generando código listo para pegar en un repositorio Git vacío.

## 0) Objetivo del proyecto
Construir una aplicación web minimalista para una pareja que gestione **ingresos y gastos**, con **categorías**, **resumen mensual**, **compartición por hogar**, autenticación por email y **datos persistentes**. Debe ser **fácil de usar**, **gratis** en sus tiers, **documentada** y con despliegue en **Vercel** + **Supabase**.

## 1) Stack tecnológico (fijado)
- **Lenguaje**: TypeScript.
- **Framework**: Next.js (App Router, Server Actions, React 18+).
- **UI**: Tailwind CSS + shadcn/ui (componentes básicos: Button, Input, Dialog, Form, Table, Select, Badge, Card, Tabs).
- **Estado/Formularios**: React Hook Form + Zod.
- **DB/Auth**: Supabase (Postgres + Auth con magic link) con **Row Level Security** (RLS) desde el día 1.
- **Gráficas**: Recharts (ligero) o alternativo similar.
- **Despliegue**: Vercel (frontend) + Supabase (DB/Auth). Tiers gratuitos.
- **Testing/lint**: ESLint + Prettier, Vitest (básico) si procede.
- **CI/CD**: GitHub Actions (lint + build + typecheck).

## 2) Entregables mínimos del repositorio
Genera/propón los siguientes archivos y directorios **listos**:
```
/ (raíz)
├─ app/
│  ├─ (marketing)/page.tsx                # portada mínima / login CTA
│  ├─ login/page.tsx                      # login con email (magic link)
│  ├─ app/layout.tsx                      # layout área privada
│  ├─ app/page.tsx                        # dashboard (mes actual)
│  ├─ app/expenses/page.tsx               # listado + filtros + CRUD
│  ├─ app/categories/page.tsx             # CRUD categorías
│  ├─ app/settings/page.tsx               # gestionar hogar e invitaciones
│  └─ api/cron/route.ts (opcional)        # hook futuro para import/export
├─ components/                            # UI reutilizable (Dialog, Forms, Table)
├─ lib/
│  ├─ supabaseServer.ts                   # cliente server-side
│  ├─ supabaseBrowser.ts                  # cliente browser-side si se necesita
│  ├─ auth.ts                             # helpers de sesión
│  ├─ date.ts                             # helpers fechas (inicio/fin de mes)
│  └─ csv.ts                              # helpers import/export CSV (futuro)
├─ db/
│  ├─ schema.sql                          # tablas y RLS
│  └─ seed.sql                            # categorías demo, hogar inicial
├─ scripts/
│  └─ dev-setup.md                        # pasos para preparar entorno
├─ public/
│  └─ favicon.ico
├─ .github/
│  └─ workflows/ci.yml                    # lint + typecheck + build
├─ .env.example                           # variables necesarias
├─ next.config.mjs
├─ postcss.config.mjs
├─ tailwind.config.ts
├─ tsconfig.json
├─ package.json
├─ README.md                              # guía completa (instalación/uso/deploy)
└─ LICENSE (MIT por defecto)
```

## 3) Modelo de datos (SQL – mínimo viable)
**Requisitos**: gastos/ingresos, categorías, hogar compartido, pertenencia del usuario, RLS.

```sql
-- HOGAR COMPARTIDO
create table households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

create table household_members (
  household_id uuid references households(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text default 'member',
  primary key (household_id, user_id)
);

-- CATEGORÍAS (comunes a un hogar)
create table categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  icon text,
  type text not null default 'expense', -- 'expense' | 'income'
  unique (household_id, name, type)
);

-- MOVIMIENTOS (gastos e ingresos)
create table movements (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  category_id uuid references categories(id) on delete set null,
  type text not null check (type in ('expense','income')),
  amount numeric(12,2) not null,
  currency text not null default 'EUR',
  note text,
  occurred_at date not null,
  created_at timestamptz default now()
);

-- Índices recomendados
create index on movements (household_id, occurred_at desc);
create index on movements (household_id, type, occurred_at desc);
create index on categories (household_id, type);

-- Row Level Security (RLS)
alter table households enable row level security;
alter table household_members enable row level security;
alter table categories enable row level security;
alter table movements enable row level security;

-- Políticas: solo miembros del hogar ven/escriben su contenido
create policy read_households on households for select using (
  exists (select 1 from household_members hm
          where hm.household_id = households.id
            and hm.user_id = auth.uid())
);

create policy read_categories on categories for select using (
  exists (select 1 from household_members hm
          where hm.household_id = categories.household_id
            and hm.user_id = auth.uid())
);

create policy read_movements on movements for select using (
  exists (select 1 from household_members hm
          where hm.household_id = movements.household_id
            and hm.user_id = auth.uid())
);

create policy write_categories on categories for all using (
  exists (select 1 from household_members hm
          where hm.household_id = categories.household_id
            and hm.user_id = auth.uid())
) with check (
  exists (select 1 from household_members hm
          where hm.household_id = categories.household_id
            and hm.user_id = auth.uid())
);

create policy write_movements on movements for all using (
  exists (select 1 from household_members hm
          where hm.household_id = movements.household_id
            and hm.user_id = auth.uid())
) with check (
  exists (select 1 from household_members hm
          where hm.household_id = movements.household_id
            and hm.user_id = auth.uid())
);
```

> **Nota**: La creación del hogar inicial y membership se hace tras el primer login (acción de servidor). Para un MVP, permite que el primer usuario cree el hogar y genere un enlace/invitación por email para la pareja.

## 4) Funcionalidad MVP
1. **Auth por email (magic link)**.
2. **Hogar**: crear/nombrar; invitar miembro por email; listar miembros.
3. **Categorías**: CRUD por tipo (`expense`/`income`).
4. **Movimientos**: alta rápida, edición, borrado; filtros por fecha, categoría, texto.
5. **Dashboard**: mes en curso; totales por tipo y por categoría (barras o donut), lista reciente.
6. **Configuración**: moneda por defecto, nombre del hogar, gestión de invitaciones.

## 5) Páginas y UX
- **/login**: input email → Supabase Auth magic link.
- **/app** (dashboard): selector de mes; tarjetas: Total Gasto, Total Ingreso, Balance; gráfico por categoría; últimas 10 transacciones; botón **“+ añadir”** (Dialog modal).
- **/app/expenses**: tabla filtrable (fecha desde/hasta, categoría, texto) con paginación.
- **/app/categories**: CRUD simple (nombre, icono/emoji, tipo).
- **/app/settings**: nombre del hogar, invitar por email, miembros y roles.

## 6) Server Actions / Data Access
- Utilizar **Server Actions** para `create/update/delete` evitando exponer claves.
- Revalidación de rutas con `revalidatePath('/app')` tras mutaciones.
- Consultas agregadas simples (sumas por categoría y tipo) con SQL directo vía Supabase **RPC** opcional, o agregados en el servidor.

## 7) Import/Export (futuro inmediato)
- **Import CSV/Excel**: helper `lib/csv.ts` para parsear CSV (Papaparse en cliente o conversión server-side). Para Excel, usar `xlsx` cuando se pida.
- **Export CSV**: endpoint server que arma CSV de movimientos filtrados.
- **Google Sheets** (opcional futuro): OAuth + lectura de rango; por ahora, dejar un **placeholder** en `api/cron`.

## 8) Seguridad (simple y suficiente)
- Sin E2E. Confiar en **Supabase Auth + RLS** y cifrado en reposo del proveedor.
- Habilitar **RLS** en todas las tablas de datos de usuario.
- Validación de entrada con **Zod** en Server Actions.

## 9) Configuración/env
Proveer `.env.example` con:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
# Opcional si se usa Service Role en scripts/seed locales (NO subir a Vercel)
SUPABASE_SERVICE_ROLE=
```

## 10) README.md (contenido esperado)
- Descripción del proyecto + stack.
- Requisitos previos.
- **Setup local**:
  1) `npm i`
  2) configurar `.env.local`
  3) ejecutar `db/schema.sql` en Supabase SQL Editor
  4) `npm run dev`
- Despliegue en Vercel + Supabase (paso a paso).
- Comandos disponibles (`dev`, `build`, `lint`…).
- Roadmap (import/export CSV, Sheets, presupuestos).

## 11) Lint, formateo, CI
- **ESLint + Prettier** con reglas sensatas para Next/TS.
- **CI** en GitHub Actions: instalar deps, typecheck, lint, build.

## 12) Convenciones de código y Git
- **Conventional Commits** (`feat:`, `fix:`, `chore:`…).
- Estructura modular (sin over‑engineering). Priorizar claridad y DX.

## 13) Tareas iniciales del agente (orden sugerido)
1. Inicializar proyecto Next.js (TS) + Tailwind + shadcn/ui.
2. Crear clientes Supabase (server/browser) y middleware de auth.
3. Entregar `db/schema.sql` y `db/seed.sql` (categorías ejemplo: Vivienda, Luz, Internet, Supermercado, Butano, Ocio, Transporte; Ingresos: Nómina, Extra).
4. Implementar páginas: `/login`, `/app` (dashboard), `/app/expenses`, `/app/categories`, `/app/settings`.
5. Crear Server Actions para CRUD de categorías y movimientos.
6. Añadir componentes UI reutilizables (Dialog de alta rápida, Form, Table simple).
7. Escribir README completo y `.env.example`.
8. Configurar CI (`.github/workflows/ci.yml`).
9. Incluir hooks básicos de seguridad (validaciones Zod) y RLS habilitado.

## 14) Calidad y pruebas
- Al menos pruebas de utilidades puras (date/csv) con Vitest (opcional pero deseable).
- Revisar accesibilidad básica (labels, focus).

## 15) Consideraciones sobre el archivo Excel existente
- Se podrá **importar** desde Excel/CSV a `movements` mapeando columnas: `occurred_at`, `type`, `category`, `amount`, `currency`, `note`.
- Si una categoría no existe, crearla (según `type`).
- Mantener idempotencia con una columna opcional `external_ref` (hash de fila), si en el futuro se usa sincronización.

---

### Estándar de salida del agente
- Código completo, listo para pegar.
- No dejar TODOs sin especificar. Si falta algo, proponer alternativa concreta.
- Mantener el proyecto **compilando y arrancando** tras cada bloque entregado.

### Heurística de simplicidad
- Evitar over‑engineering: sin Redux/Zustand, sin TRPC, sin E2E encryption.
- Server Actions + Supabase es suficiente.
- El primer objetivo: **crear, listar y editar movimientos** y ver **resumen mensual**.

---

> Con este prompt, genera en el repositorio vacío toda la estructura, archivos y código necesarios para que la app funcione localmente y se despliegue en Vercel + Supabase, incluyendo `db/schema.sql`, páginas, componentes y README. Explica cualquier decisión no obvia en comentarios breves dentro del código o en el README.

