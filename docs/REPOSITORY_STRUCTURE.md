# 📁 Estructura del Repositorio CuentasSiK

## Visión General

Este documento describe la organización profesional del repositorio, siguiendo las mejores prácticas de la comunidad Next.js y del ecosistema TypeScript/React.

## Estructura de Directorios

```
/                                # Raíz del repositorio
├─ app/                          # Next.js App Router
│  ├─ (marketing)/               # Rutas públicas
│  │  └─ page.tsx                # Landing page
│  ├─ login/                     # Autenticación
│  │  ├─ page.tsx
│  │  └─ actions.ts
│  ├─ auth/                      # Callbacks de auth
│  │  └─ callback/route.ts
│  └─ app/                       # Área privada (requiere auth)
│     ├─ layout.tsx              # Layout con navegación
│     ├─ page.tsx                # Dashboard principal
│     ├─ expenses/               # Gestión de gastos/ingresos
│     │  ├─ page.tsx
│     │  ├─ actions.ts           # Server Actions
│     │  └─ components/          # Componentes locales
│     ├─ categories/             # Gestión de categorías
│     ├─ contributions/          # Sistema de contribuciones
│     ├─ household/              # Gestión del hogar
│     ├─ profile/                # Perfil de usuario
│     └─ admin/                  # Panel de administración
│
├─ components/                   # Componentes compartidos
│  ├─ ui/                        # shadcn/ui wrappers
│  │  ├─ button.tsx
│  │  ├─ dialog.tsx
│  │  └─ ...                     # Otros componentes de shadcn
│  └─ shared/                    # Componentes de negocio compartidos
│     ├─ MonthSelector.tsx
│     ├─ ThemeToggle.tsx
│     └─ ThemeProvider.tsx
│
├─ lib/                          # Utilidades y helpers
│  ├─ supabaseServer.ts          # Cliente Supabase (Server Components)
│  ├─ supabaseBrowser.ts         # Cliente Supabase (Client Components)
│  ├─ supabaseAdmin.ts           # Cliente con Service Role (admin)
│  ├─ result.ts                  # Result pattern helpers
│  ├─ date.ts                    # Utilidades de fecha
│  ├─ format.ts                  # Formateo de moneda/fecha
│  ├─ csv.ts                     # Import/export CSV
│  ├─ adminCheck.ts              # Helpers de autorización
│  ├─ utils.ts                   # Utilidades generales
│  └─ __tests__/                 # Tests unitarios
│     ├─ date.test.ts
│     ├─ format.test.ts
│     └─ result.test.ts
│
├─ supabase/                     # **Fuente de verdad** de la BD
│  ├─ migrations/                # Migraciones SQL (generadas por CLI)
│  │  ├─ 20251002193625_fix_rls_infinite_recursion.sql
│  │  ├─ 20251002193718_add_contributions_system.sql
│  │  └─ ...
│  └─ config.toml                # Configuración de Supabase CLI
│
├─ db/                           # Schemas de referencia (documentación)
│  ├─ schema.sql                 # Schema completo de referencia
│  ├─ seed.sql                   # Datos semilla (NO sensibles)
│  ├─ contributions-schema.sql   # Schema del sistema de contribuciones
│  └─ README.md                  # Guía de uso y advertencias
│
├─ docs/                         # Documentación del proyecto
│  ├─ CONTRIBUTIONS_SYSTEM.md    # Sistema de contribuciones
│  ├─ DARK_MODE.md               # Implementación de tema oscuro
│  ├─ VERCEL_DEPLOY.md           # Guía de despliegue
│  ├─ SUPABASE_CLI.md            # Uso de Supabase CLI
│  ├─ ENVIRONMENT_SETUP.md       # Configuración de entorno
│  ├─ VERSIONING_AND_RELEASES.md # Sistema de versionado
│  ├─ NEXT_STEPS.md              # Próximos pasos
│  ├─ setup/                     # Guías de configuración inicial
│  │  ├─ COMMIT_MESSAGE_GUIDE.md
│  │  ├─ RELEASE_PLEASE_SETUP.md
│  │  └─ ...
│  └─ archive/                   # Documentos históricos
│     ├─ FIX-RLS-README.md
│     └─ ...
│
├─ scripts/                      # Scripts de utilidad
│  ├─ reorganize-repo.ps1        # Script de reorganización
│  └─ dev-setup.md               # Guía de setup para desarrollo
│
├─ types/                        # Tipos TypeScript
│  └─ database.ts                # Tipos generados de Supabase
│
├─ .github/                      # GitHub Actions y configuración
│  ├─ workflows/
│  │  ├─ ci.yml                  # CI (lint + build + typecheck)
│  │  └─ release-please.yml      # Releases automáticos
│  ├─ copilot-instructions.md    # Instrucciones para Copilot
│  └─ pull_request_template.md
│
├─ .vscode/                      # Configuración de VS Code
│  ├─ tasks.json                 # Tareas predefinidas
│  └─ TASKS_README.md
│
├─ private/                      # 🚫 Datos privados (gitignored)
│  └─ DOCUMENTOS/                # Excel real y datos sensibles
│
├─ _archive/                     # 🚫 Archivos obsoletos (gitignored)
│  └─ ...                        # Scripts SQL antiguos, docs obsoletos
│
├─ .env.example                  # Variables de entorno de ejemplo
├─ .env.local.example            # Plantilla de .env.local
├─ .editorconfig                 # Configuración del editor
├─ .eslintrc.json                # Configuración de ESLint
├─ .prettierrc                   # Configuración de Prettier
├─ .gitignore                    # Archivos ignorados por Git
├─ .release-please-manifest.json # Versión actual (Release Please)
├─ release-please-config.json    # Configuración de Release Please
├─ components.json               # Configuración de shadcn/ui
├─ next.config.mjs               # Configuración de Next.js
├─ tailwind.config.ts            # Configuración de Tailwind CSS
├─ tsconfig.json                 # Configuración de TypeScript
├─ vitest.config.ts              # Configuración de Vitest
├─ vitest.setup.ts               # Setup de tests
├─ package.json                  # Dependencias y scripts
├─ package-lock.json             # Lock de dependencias (SIEMPRE commitear)
├─ middleware.ts                 # Middleware de Next.js (auth redirect)
├─ README.md                     # Guía principal del proyecto
├─ QUICK_START.md                # Guía de inicio rápido
├─ CHANGELOG.md                  # Historial de cambios (Release Please)
└─ prompt_inicial_del_agente_app_gastos_pareja_next_instructions.md
```

## Qué Sube a Git (✅) vs Qué No (🚫)

### ✅ Sí (Commiteado)

**Código fuente**:
- `app/`, `components/`, `lib/`, `types/`
- Todos los archivos `.ts`, `.tsx`, `.css`

**Configuración**:
- `tsconfig.json`, `tailwind.config.ts`, `next.config.mjs`
- `.eslintrc.json`, `.prettierrc`, `.editorconfig`
- `components.json`, `vitest.config.ts`

**Dependencias**:
- `package.json` y `package-lock.json` (siempre)

**CI/CD**:
- `.github/workflows/*`
- `release-please-config.json`, `.release-please-manifest.json`

**Base de datos**:
- `supabase/migrations/*.sql` (migraciones)
- `supabase/config.toml`
- `db/schema.sql`, `db/seed.sql` (datos NO sensibles)

**Documentación**:
- `docs/*`, `README.md`, `QUICK_START.md`
- `CHANGELOG.md` (generado por Release Please)

**Estáticos públicos**:
- `public/*` (icons, manifest, etc.)

### 🚫 No (Gitignored)

**Dependencias y builds**:
- `node_modules/`
- `.next/`, `out/`, `.vercel/`
- `*.tsbuildinfo`

**Entorno**:
- `.env`, `.env.local`, `.env.production`
- Cualquier archivo `.env.*` excepto `.env.example`

**Supabase local**:
- `supabase/.temp/`
- `supabase/.branches/`
- `docker/`, `*.db`

**Datos privados**:
- `/private/` - Excel reales, exports bancarios, etc.
- `DOCUMENTOS/` - Archivos con datos personales
- `*.xlsx`, `*.xls` (hojas de cálculo con datos reales)

**Temporales**:
- `/_archive/` - Scripts obsoletos, docs antiguos
- `/tmp/` - Archivos temporales
- `*.log` - Logs de la aplicación

**Sistema**:
- `.DS_Store` (macOS)
- `Thumbs.db` (Windows)
- `.vscode/settings.json` (configuración personal)

## Principios de Organización

### 1. Colocación (Colocation)

Los componentes locales deben estar junto a su ruta:
```
app/app/expenses/
├─ page.tsx
├─ actions.ts
├─ schema.ts
└─ components/
   ├─ ExpenseForm.tsx
   └─ ExpenseList.tsx
```

Solo los componentes **realmente compartidos** van a `components/shared/`.

### 2. Separación de Concerns

- **UI puro**: `components/ui/` (shadcn/ui wrappers, sin lógica de negocio)
- **Lógica de negocio**: `lib/` (utilidades puras, sin UI)
- **Server Actions**: `actions.ts` en cada ruta (mutaciones)
- **Validación**: `schema.ts` con Zod schemas

### 3. Base de Datos: Una Sola Fuente de Verdad

**`supabase/migrations/`** es la fuente de verdad:
- Usar `supabase db diff` para generar migraciones
- `db/schema.sql` es solo referencia/documentación
- `db/seed.sql` contiene datos genéricos (categorías por defecto)

### 4. Documentación Centralizada

- **Guías técnicas**: `docs/*.md`
- **Setup inicial**: `docs/setup/*.md`
- **Histórico**: `docs/archive/*.md`
- **Decisiones arquitectónicas**: `docs/ADR/*.md` (futuro)

### 5. Seguridad

- **Nunca** commitear `.env`, `.env.local`
- **Nunca** commitear datos reales (Excel, exports bancarios)
- **Siempre** usar placeholders genéricos en docs públicos
- **Siempre** usar `SUPABASE_SERVICE_ROLE_KEY` solo en servidor

## Flujo de Desarrollo Profesional

### 1. Cambios en la Base de Datos

```bash
# Hacer cambios en Supabase Dashboard o localmente
# Generar migración
npx supabase db diff -f supabase/migrations/YYYYMMDDHHMMSS_descripcion.sql

# Aplicar a remoto
npx supabase db push

# Regenerar tipos
npx supabase gen types typescript --project-id <id> > types/database.ts
```

### 2. Nueva Funcionalidad

```bash
# Crear branch
git checkout -b feat/area-descripcion

# Desarrollar (código + tests + docs)
# ...

# Commit (Conventional Commits)
git commit -m "feat: descripción concisa"

# Push + PR
git push origin feat/area-descripcion
```

### 3. Release

```bash
# Release Please detecta commits tipo feat:/fix:
# Abre PR automático con CHANGELOG y bump de versión
# Al mergear PR → crea tag + GitHub Release
```

## Convenciones de Nombres

| Elemento | Convención | Ejemplo |
|----------|-----------|---------|
| Componentes | PascalCase | `ExpenseForm.tsx` |
| Hooks/utils | camelCase | `useToast.ts`, `formatCurrency.ts` |
| Rutas Next.js | kebab-case | `/app/expenses` |
| Variables/funciones | camelCase | `getMonthlyTotals`, `userId` |
| Constantes globales | SCREAMING_SNAKE_CASE | `MAX_FILE_SIZE` |
| Tipos/interfaces | PascalCase | `type User = {...}` |
| Tablas SQL | snake_case (plural) | `household_members` |
| Columnas SQL | snake_case | `occurred_at`, `household_id` |

## Scripts Útiles

```bash
# Desarrollo
npm run dev              # Servidor de desarrollo

# Build y testing
npm run build            # Build de producción
npm run lint             # ESLint + Prettier
npm run typecheck        # Verificación de tipos TypeScript
npm test                 # Ejecutar tests (Vitest)

# Supabase
npm run types:supabase   # Regenerar tipos de Supabase
npx supabase db push     # Aplicar migraciones a remoto
npx supabase db pull     # Sincronizar schema de remoto
```

## Checklist de Limpieza

Antes de commit inicial:

- [ ] `private/` y `_archive/` en .gitignore
- [ ] Sin console.logs en código de producción
- [ ] Sin datos sensibles en archivos commiteados
- [ ] `package-lock.json` presente
- [ ] Build exitoso (`npm run build`)
- [ ] Lint limpio (`npm run lint`)
- [ ] Tests pasando (`npm test`)
- [ ] Documentación actualizada

## Referencias

- [Next.js Project Structure](https://nextjs.org/docs/getting-started/project-structure)
- [Supabase CLI Migrations](https://supabase.com/docs/guides/cli/local-development)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Release Please](https://github.com/googleapis/release-please)

---

**Última actualización**: 2025-10-03  
**Versión**: 1.0.0
