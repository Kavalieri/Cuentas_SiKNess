<div align="center">

# 💰 CuentasSiK

**Gestión de gastos compartidos para parejas**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?logo=supabase)](https://supabase.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](https://vercel.com)

[🌐 **Demo en Vivo**](https://cuentas-sik.vercel.app) · [📖 **Documentación**](./docs) · [🐛 **Reportar Bug**](https://github.com/Kavalieri/CuentasSiK/issues) · [💡 **Solicitar Feature**](https://github.com/Kavalieri/CuentasSiK/issues)

</div>

---

## 📖 Sobre el Proyecto

CuentasSiK es una aplicación web moderna y minimalista diseñada para parejas que desean llevar un control transparente de sus finanzas compartidas. Con un sistema de contribuciones proporcionales a los ingresos, facilita la equidad en los gastos del hogar sin complicaciones.

**🎯 Filosofía**: Simplicidad, transparencia y justicia financiera en pareja.

## ✨ Características Principales

### 🔐 Autenticación & Multi-Hogar
- ✅ **Magic Link**: Autenticación sin contraseña vía email
- ✅ **Múltiples Hogares**: Crea/únete a ilimitados hogares compartidos
- ✅ **Selector de Contexto**: Cambio rápido entre hogares activos
- ✅ **Sistema de Invitaciones**: Enlaces seguros para invitar miembros

### 💸 Gestión de Finanzas
- ✅ **Movimientos**: Registro de gastos e ingresos con categorías personalizadas
- ✅ **Edición con Historial**: Modifica movimientos con auditoría automática ⭐ NEW
- ✅ **Categorías Personalizadas**: CRUD completo con iconos y tipos (gasto/ingreso)
- ✅ **Dashboard Mensual**: Resúmenes visuales con gráficos (Recharts)
- ✅ **Privacy Mode**: Ocultar cantidades en lugares públicos (toggle Eye/EyeOff)

### 🤝 Sistema de Contribuciones Proporcionales
- ✅ **Cálculo Inteligente**: Proporcional a ingresos, partes iguales o personalizado
- ✅ **Pre-pagos con Aprobación**: Workflow completo miembro → owner
- ✅ **Movimientos Duales Automáticos**: Pre-pagos crean gasto + ingreso virtual
- ✅ **Estados de Pago**: pending, partial, paid, overpaid con seguimiento en tiempo real
- ✅ **Panel de Aprobaciones**: Interface dedicada para owners con contador de pendientes

### 🎨 Experiencia de Usuario
- ✅ **Dark/Light Mode**: Persistencia con detección del sistema (next-themes)
- ✅ **Responsive Design**: Optimizado para móvil y escritorio
- ✅ **Updates Optimistas**: UI instantánea con sincronización en background
- ✅ **Notificaciones**: Toast messages con Sonner

### 🛠️ Administración
- ✅ **Panel de Admin**: Dashboard completo para system admins
- ✅ **Gestión de Miembros**: Cambiar roles, eliminar miembros
- ✅ **Wipe con Protección**: Limpiar datos de testing con anti-wipe
- ✅ **Perfil Personal**: Edición de ingresos y preferencias

## 🚀 Stack Tecnológico

- **Framework**: Next.js 15 (App Router, Server Actions, React 18+)
- **Lenguaje**: TypeScript estricto
- **UI**: Tailwind CSS + shadcn/ui
- **Tema**: next-themes (dark/light mode)
- **Formularios**: React Hook Form + Zod
- **Backend**: Supabase (PostgreSQL + Auth)
- **Gráficas**: Recharts
- **Testing**: Vitest
- **Deploy**: Vercel (automático desde main)
- **CI/CD**: GitHub Actions + Release Please

## 🔧 Gestión del Proyecto con MCPs

Este proyecto utiliza **Model Context Protocols (MCPs)** para automatización completa del desarrollo:

### 🗄️ Supabase MCP
```bash
# Aplicar migraciones sin CLI manual
mcp_supabase_apply_migration(project_id, name, query)

# Validar estructura de tablas
mcp_supabase_list_tables(project_id, schemas)

# Ejecutar queries de validación
mcp_supabase_execute_sql(project_id, query)

# Obtener logs para debugging
mcp_supabase_get_logs(project_id, service) # postgres, api, auth

# Verificar seguridad y performance
mcp_supabase_get_advisors(project_id, type) # security, performance
```

### 🐙 GitHub MCP
```bash
# Gestión de branches
mcp_github_github_create_branch(owner, repo, branch, from_branch)
mcp_github_github_list_branches(owner, repo)

# Push directo de archivos
mcp_github_github_push_files(owner, repo, branch, files, message)
mcp_github_github_create_or_update_file(owner, repo, path, content, message, branch, sha)

# Pull Requests (activar con activate_github_pull_request_management)
# Issues (activar con activate_github_issue_management)
# Workflows (activar con activate_github_workflow_management)
```

### 🌿 Git MCP (GitKraken)
```bash
# Operaciones Git sin CLI
mcp_gitkraken_bun_git_status(directory)
mcp_gitkraken_bun_git_add_or_commit(directory, action, files, message)
mcp_gitkraken_bun_git_push(directory)
mcp_gitkraken_bun_git_branch(directory, action, branch_name)
mcp_gitkraken_bun_git_checkout(directory, branch)
```

### 🔺 Vercel MCP
```bash
# Deploy automático (ya configurado en GitHub → Vercel)
mcp_vercel_deploy_to_vercel()

# Monitoreo de deployments
mcp_vercel_list_deployments(projectId, teamId)
mcp_vercel_get_deployment(idOrUrl, teamId)

# Debugging de builds
mcp_vercel_get_deployment_build_logs(idOrUrl, teamId)
```

### 🎯 Workflow Completo con MCPs
```typescript
// 1. Crear y aplicar migración
await mcp_supabase_apply_migration({
  project_id: "your-supabase-project-id",
  name: "add_new_feature",
  query: "CREATE TABLE..."
});

// 2. Validar estructura
await mcp_supabase_list_tables({
  project_id: "your-supabase-project-id",
  schemas: ["public"]
});

// 3. Verificar con SQL
await mcp_supabase_execute_sql({
  project_id: "your-supabase-project-id",
  query: "SELECT * FROM new_table LIMIT 1;"
});

// 4. Build local
npm run build

// 5. Commit y push con Git MCP
await mcp_gitkraken_bun_git_add_or_commit({
  directory: "e:\\GitHub\\CuentasSiK",
  action: "add"
});
await mcp_gitkraken_bun_git_add_or_commit({
  directory: "e:\\GitHub\\CuentasSiK",
  action: "commit",
  message: "feat: add new feature"
});
await mcp_gitkraken_bun_git_push({
  directory: "e:\\GitHub\\CuentasSiK"
});

// 6. Deploy automático a Vercel (GitHub → Vercel)
// 7. Verificar deployment
await mcp_vercel_list_deployments({
  projectId: "your-vercel-project-id",
  teamId: "your-vercel-team-id"
});
```

**⚠️ Regla Crítica**: SIEMPRE usar MCPs en lugar de acciones manuales o CLI. Ver `.github/copilot-instructions.md` para workflows completos.

## 📋 Requisitos Previos

- Node.js 20.x o superior
- npm
- Cuenta en Supabase (gratuita)
- (Opcional) MCPs configurados para automatización completa

## 🛠️ Setup Local

### 1. Clonar el repositorio

```bash
git clone https://github.com/Kavalieri/CuentasSiK.git
cd CuentasSiK
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar Supabase

#### Opción A: Con Supabase MCP (Recomendado)
```typescript
// 1. Aplicar schema completo
await mcp_supabase_apply_migration({
  project_id: "tu_project_id",
  name: "initial_schema",
  query: fs.readFileSync("db/schema.sql", "utf-8")
});

// 2. Aplicar contribuciones
await mcp_supabase_apply_migration({
  project_id: "tu_project_id",
  name: "contributions_schema",
  query: fs.readFileSync("db/contributions-schema.sql", "utf-8")
});

// 3. Aplicar historial de transacciones
await mcp_supabase_apply_migration({
  project_id: "tu_project_id",
  name: "transaction_history_schema",
  query: fs.readFileSync("supabase/migrations/20251005113647_add_transaction_history_system.sql", "utf-8")
});

// 4. Validar estructura
await mcp_supabase_list_tables({
  project_id: "tu_project_id",
  schemas: ["public"]
});
```

#### Opción B: Manual (tradicional)
1. Crea un proyecto en [Supabase](https://supabase.com)
2. En el SQL Editor de Supabase, ejecuta en orden:
   - `db/schema.sql`
   - `db/contributions-schema.sql`
   - `supabase/migrations/20251005113647_add_transaction_history_system.sql`
   - `db/seed.sql` (datos de prueba)
3. Obtén tus credenciales:
   - Ve a Settings → API
   - Copia `Project URL` y `anon public` key

### 4. Configurar variables de entorno

Crea un archivo `.env.local` en la raíz:

```env
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
```

### 5. Ejecutar en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 📁 Estructura del Proyecto

```
CuentasSiK/
├── app/                      # Next.js App Router
│   ├── (marketing)/         # Landing page
│   ├── login/               # Autenticación
│   └── app/                 # Área privada
│       ├── layout.tsx       # Layout con navegación
│       ├── page.tsx         # Dashboard
│       ├── expenses/        # Gestión de movimientos
│       ├── categories/      # ✅ Gestión de categorías
│       ├── contributions/   # ✅ Sistema de contribuciones (NEW: single-page)
│       │   ├── page.tsx     # Vista única con todos los componentes
│       │   ├── actions.ts   # Server Actions
│       │   └── components/  # Componentes especializados
│       │       ├── HeroContribution.tsx        # Tu contribución con opciones de pago
│       │       ├── HouseholdSummary.tsx        # Resumen del hogar
│       │       ├── ContributionMembersList.tsx # Lista de miembros con pre-pagos
│       │       ├── ConfigurationSection.tsx    # Configuración (owners)
│       │       └── PrePaymentsSection.tsx      # Pre-pagos (owners) ⭐ NEW
│       ├── profile/         # ✅ Perfil personal
│       ├── admin/           # ✅ Panel de administración
│       │   ├── page.tsx     # Dashboard admin
│       │   ├── wipe/        # Limpiar datos
│       │   ├── members/     # ✅ Gestión de miembros
│       │   └── system-admins/ # ✅ Gestión de system admins
│       └── household/       # Configuración del hogar
├── components/
│   ├── ui/                  # Componentes shadcn/ui
│   └── shared/              # Componentes compartidos
│       ├── PrivacyProvider.tsx   # ⭐ Contexto de privacidad
│       ├── PrivacyToggle.tsx     # ⭐ Toggle Eye/EyeOff
│       └── PrivateAmount.tsx     # ⭐ Wrapper para cantidades privadas
├── lib/                     # Utilidades
│   ├── supabaseServer.ts   # Cliente Supabase server-side
│   ├── supabaseBrowser.ts  # Cliente Supabase client-side
│   ├── adminCheck.ts       # ✅ Verificación de permisos owner
│   ├── contributionTypes.ts # ✅ Tipos de cálculo (proportional, equal, custom)
│   ├── result.ts           # Pattern Result
│   ├── format.ts           # Formateo de moneda
│   ├── date.ts             # Utilidades de fechas
│   ├── csv.ts              # Import/Export CSV
│   └── hooks/
│       └── usePrivateFormat.ts # ⭐ Hook para formateo con privacidad
├── db/
│   ├── schema.sql                    # Esquema base de datos
│   ├── contributions-schema.sql      # ✅ Sistema de contribuciones
│   ├── seed.sql                      # Datos iniciales
│   ├── wipe_data_preserve_users.sql  # ⭐ Wipe selectivo para testing
│   └── delete_orphan_adjustment.sql  # ⭐ Debug de ajustes huérfanos
├── supabase/
│   ├── config.toml         # Configuración Supabase CLI
│   └── migrations/         # Migraciones SQL con timestamps
│       ├── 20251003120000_add_calculation_type_to_household_settings.sql
│       ├── 20251003120001_update_calculate_monthly_contributions.sql
│       └── 20251003130000_create_pre_payments_system.sql ⭐ NEW
├── docs/
│   ├── CONTRIBUTIONS_SYSTEM.md           # ✅ Sistema de contribuciones
│   ├── CONTRIBUTIONS_REFACTOR_PLAN.md    # ✅ Plan de refactorización ⭐ NEW
│   ├── USER_MANAGEMENT_IMPLEMENTATION.md # ✅ Gestión de usuarios
│   ├── WIPE_PROTECTION_SYSTEM.md         # ✅ Sistema anti-wipe ⭐ NEW
│   ├── PRIVACY_MODE.md                   # ⭐ Sistema de ocultación de cantidades
│   ├── TEST_PROCEDURE.md                 # ⭐ Procedimiento de testing completo
│   ├── SESSION_SUMMARY_2025-10-04.md     # ⭐ Resumen de cambios recientes
│   ├── DARK_MODE.md
│   ├── SUPABASE_CLI.md
│   └── VERCEL_DEPLOY.md
└── types/
    └── database.ts         # Tipos TypeScript de Supabase
```

## 🎯 Comandos Disponibles

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build de producción
npm run start        # Servidor de producción
npm run lint         # Ejecutar ESLint
npm run typecheck    # Verificar tipos TypeScript
npm test             # Ejecutar tests
npm run test:watch   # Tests en modo watch
```

## 🔐 Autenticación

La aplicación usa **magic links** de Supabase. Los usuarios reciben un enlace por email para iniciar sesión sin contraseña.

## 🏗️ Arquitectura

### Modelo de Datos

#### Tablas Core (12 tablas principales)
1. **households**: Hogar compartido (multi-hogar por usuario)
2. **household_members**: Relación many-to-many usuarios-hogares con roles (owner/member)
3. **categories**: Categorías personalizadas por hogar (expense/income)
4. **transactions**: Movimientos (gastos/ingresos) con descripción y categoría
5. **transaction_history**: Auditoría de cambios en movimientos ⭐ NEW (Oct 2025)

#### Sistema de Contribuciones (4 tablas) ⭐
6. **member_incomes**: Historial de ingresos mensuales por miembro
7. **household_settings**: Meta de contribución mensual + tipo de cálculo
8. **contributions**: Contribuciones calculadas y rastreadas por miembro/mes
9. **contribution_adjustments**: Ajustes con workflow de aprobación (pending/approved/rejected)

#### Sistema de Múltiples Hogares (2 tablas) ⭐ NEW
10. **user_settings**: Configuración del usuario (active_household_id, preferences)
11. **invitations**: Sistema de invitaciones con RLS público para acceso sin login

#### Sistema de Privacidad (1 tabla) ⭐ NEW
12. **PrivacyProvider**: Contexto React con estado hideAmounts persistido en localStorage

### Sistema de Historial de Transacciones ⭐ NEW (Oct 2025)

**Características**:
- **Trigger Automático**: `save_transaction_history()` se ejecuta AFTER UPDATE en `transactions`
- **Campos Rastreados**: description, occurred_at, category_id, amount
- **Metadatos**: changed_by (profile_id), changed_at, change_reason, household_id
- **RLS**: Solo miembros del household pueden ver su historial
- **Cascade Delete**: Si se borra transaction, su historial también
- **UI**: EditMovementDialog con validaciones y toast notifications

**Uso**:
```typescript
// Editar movimiento (trigger guarda historial automáticamente)
await updateMovement(formData);

// Obtener historial de un movimiento
const history = await getMovementHistory(movementId);
// Retorna: old/new values + changed_by profile + old/new categories
```

### Row Level Security (RLS)

**Todas las tablas** tienen RLS habilitado desde el día 1. Las políticas verifican que `auth.uid()` pertenezca al `household_id` del recurso consultado mediante funciones helper:
- `get_profile_id_from_auth()`: Obtiene profile_id del usuario autenticado
- `getUserHouseholdId()`: Obtiene el household_id activo del usuario
- Verificación de membresía en `household_members`

### Patrones de Autenticación

- **Auth**: Magic link por email (sin contraseña) vía Supabase Auth
- **Sesión**: Validar en Server Components con `lib/supabaseServer.ts`
- **Server Actions**: Validación con Zod schemas antes de mutaciones
- **Result Pattern**: `ok()` y `fail()` para manejo de errores consistente
- **user_settings**: Configuración del usuario (active_household_id, preferences)
- **invitations**: Sistema de invitaciones con constraint parcial y RLS público

#### Administración
- **system_admins**: Super administradores con acceso completo
- **wipe_protection**: Protección contra wipes accidentales

### Seguridad

- **Row Level Security (RLS)** habilitado en todas las tablas
- Políticas que verifican `auth.uid()` pertenece al household
- **Política pública de invitaciones**: Permite acceso sin login (token de 64 caracteres)

### Múltiples Hogares

Los usuarios pueden:
- Crear ilimitados hogares (como owner)
- Aceptar invitaciones a otros hogares (como member)
- Cambiar entre hogares usando el selector en el header
- Ver solo datos del hogar activo en cada momento

**Funcionalidades**:
- **Selector de Hogares**: Dropdown con iconos (👑 owner, 👥 member) que aparece con 2+ hogares
- **Auto-activación**: Nuevos hogares (creados o aceptados) se activan automáticamente
- **Persistencia**: El hogar activo se guarda en `user_settings.active_household_id`
- **Cambio de Contexto**: Al cambiar de hogar, toda la UI se actualiza (dashboard, gastos, contribuciones, etc.)
- Validación con Zod en todas las Server Actions
- **Sistema de roles**: `owner` (admin completo) y `member` (usuario normal)
- Protección de rutas admin con `lib/adminCheck.ts`

### Patrones de Código

- **Server Actions** para todas las mutaciones
- Pattern **Result** para manejo de errores: `{ ok: true, data? } | { ok: false, message, fieldErrors? }`
- Imports absolutos con alias `@/`
- Named exports por defecto
- `type` preferido sobre `interface`

## 🚀 Despliegue en Vercel

### Auto-deploy Configurado ✅

El proyecto está configurado con **auto-deploy desde GitHub**:

- ✅ **Push a `main`** → Deploy automático a producción
- ✅ **Pull Requests** → Deploy preview con URL única
- ✅ **URL de producción**: https://cuentas-sik.vercel.app

### Setup Manual

Si necesitas desplegar manualmente:

1. Instala Vercel CLI: `npm i -g vercel`
2. Login: `vercel login`
3. Deploy: `vercel --prod`

### Configuración de Variables de Entorno

En el dashboard de Vercel (Settings → Environment Variables):

```env
NEXT_PUBLIC_SUPABASE_URL=https://fizxvvtakvmmeflmbwud.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
```

**Importante**: Después de configurar, actualiza las **Redirect URLs** en Supabase:
- Settings → Authentication → URL Configuration
- Añade: `https://cuentas-sik.vercel.app/auth/callback`

Ver [docs/VERCEL_DEPLOY.md](docs/VERCEL_DEPLOY.md) para más detalles.

## 📝 Convenciones de Commits

Usa **Conventional Commits**:

- `feat:` nueva funcionalidad (bump minor)
- `fix:` corrección de bug (bump patch)
- `chore:`, `docs:`, `refactor:`, `test:` sin bump
- `feat!:` breaking change (bump major)

Ejemplo:
```bash
git commit -m "feat: add CSV export for transactions"
```

## 🔄 Workflow de Desarrollo

### Versionado y Releases

**Sistema**: Release Please con pre-releases alpha  
**Versión actual**: `0.0.0` → Primera release será `0.0.1-alpha.0`

**Proceso automático**:
1. Haces commits con Conventional Commits
2. Push a `main` → Auto-deploy en Vercel
3. Release Please crea/actualiza PR con CHANGELOG
4. Al mergear el PR → Se crea tag + GitHub Release automáticamente

Ver [docs/VERSIONING_AND_RELEASES.md](docs/VERSIONING_AND_RELEASES.md)

### Proceso de Desarrollo

1. Haz cambios en tu rama local
2. Commits siguiendo Conventional Commits:
   ```bash
   git commit -m "feat: add new feature"
   git commit -m "fix: resolve bug in contributions"
   ```
3. Push a `main`:
   ```bash
   git push origin main
   ```
4. **Auto-deploy** se activa automáticamente en Vercel
5. Release Please detecta commits y:
   - Crea/actualiza PR con changelog
   - Al mergear → Crea tag + release en GitHub

### Supabase Migrations

Usando Supabase CLI para gestionar cambios en la base de datos:

```bash
# Crear nueva migración
npx supabase migration new nombre_descriptivo

# Aplicar migraciones a producción
npx supabase db push

# Regenerar tipos TypeScript
npm run types:supabase
```

Ver [docs/SUPABASE_CLI.md](docs/SUPABASE_CLI.md) para más detalles.

## 🧪 Testing

- **Unit tests** con Vitest para utilidades (`lib/`)
- **React Testing Library** para componentes críticos
- **NO testeamos** integraciones Supabase (confiar en RLS)
- Coverage objetivo: 60-70% en utilities y formularios

## 📚 Documentación

### Guías Principales
- [Instrucciones para AI Agents](.github/copilot-instructions.md) - Guía completa del proyecto
- [Sistema de Contribuciones](docs/CONTRIBUTIONS_SYSTEM.md) - Cómo funciona el sistema proporcional
- [Sistema de Múltiples Hogares](docs/MULTI_HOUSEHOLD_IMPLEMENTATION_COMPLETE.md) ⭐ - Gestión multi-hogar
- [Plan de Refactorización](docs/CONTRIBUTIONS_REFACTOR_PLAN.md) ⭐ - Mejoras implementadas
- [Privacy Mode](docs/PRIVACY_MODE.md) ⭐ NEW - Sistema de ocultación de cantidades
- [Procedimiento de Testing](docs/TEST_PROCEDURE.md) ⭐ NEW - Testing completo desde cero
- [Resumen de Sesión](docs/SESSION_SUMMARY_2025-10-04.md) ⭐ NEW - Cambios recientes
- [Gestión de Usuarios](docs/USER_MANAGEMENT_IMPLEMENTATION.md) - Roles y permisos
- [Sistema Anti-Wipe](docs/WIPE_PROTECTION_SYSTEM.md) ⭐ - Protección de datos
- [Modo Oscuro](docs/DARK_MODE.md) - Implementación dark/light mode
- [Deploy en Vercel](docs/VERCEL_DEPLOY.md) - Guía de despliegue
- [Supabase CLI](docs/SUPABASE_CLI.md) - Workflow de migraciones
- [Versionado](docs/VERSIONING_AND_RELEASES.md) - Sistema de pre-releases alpha

### Referencias
- [Especificación Completa](prompt_inicial_del_agente_app_gastos_pareja_next_instructions.md)
- [Documentación de Supabase](https://supabase.com/docs)
- [Documentación de Next.js](https://nextjs.org/docs)
- [shadcn/ui](https://ui.shadcn.com)

## 🛣️ Roadmap

### ✅ Completado (v0.0.1-alpha.0)
- [x] Setup inicial del proyecto
- [x] Autenticación con magic links
- [x] Sistema de households con RLS
- [x] **Sistema de múltiples hogares** ⭐ NEW
  - [x] Usuarios pueden crear/unirse a ilimitados hogares
  - [x] Selector de hogares con iconos (👑 owner, 👥 member)
  - [x] Auto-activación de hogares nuevos/aceptados
  - [x] Cambio de contexto en tiempo real
- [x] **Sistema de invitaciones mejorado** ⭐ NEW
  - [x] Invitaciones públicas (funcionan sin login)
  - [x] Fix constraint (permite recrear después de cancelar)
  - [x] Cookie cleanup automático
- [x] CRUD de categorías y movimientos
- [x] Dashboard con resumen mensual
- [x] Modo oscuro con persistencia
- [x] Panel de administración completo
- [x] Sistema de contribuciones proporcionales
- [x] **Tipos de cálculo múltiples** (proporcional, igual, custom)
- [x] **Sistema de pre-pagos** ⭐
- [x] **Pagos flexibles** (parcial, completo, sobrepago) ⭐
- [x] Supabase CLI workflow
- [x] Auto-deploy en Vercel
- [x] Build de producción (23 páginas)

### 🚧 En Progreso
- [ ] Testing manual de múltiples hogares en producción
- [ ] Verificar flujo de invitaciones sin login

### 📋 Próximas Features (v1.1.0)
- [ ] Sistema de notificaciones push
- [ ] Gráficos avanzados con análisis histórico
- [ ] Export/Import CSV/Excel
- [ ] Import desde Excel existente (`Cuentas Casa SiK.xlsx`)
- [ ] History tab visual de contribuciones
- [ ] Filtros avanzados en movimientos (búsqueda, rango de fechas)
- [ ] Gestión avanzada de múltiples hogares (favoritos, recientes)

### 🔮 Futuro (v2.0.0+)
- [ ] Integración con Google Sheets
- [ ] PWA (Progressive Web App) con soporte offline
- [ ] Notificaciones push en dispositivos
- [ ] Dashboard de analytics con tendencias
- [ ] API REST para integraciones externas
- [ ] App móvil nativa (React Native)

---

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Este es un proyecto open source y agradecemos cualquier ayuda.

### 📝 Cómo Contribuir

1. **Fork** el proyecto
2. **Crea una rama** para tu feature (`git checkout -b feat/amazing-feature`)
3. **Commit** tus cambios (`git commit -m 'feat: add amazing feature'`)
4. **Push** a la rama (`git push origin feat/amazing-feature`)
5. **Abre un Pull Request**

### 🎯 Conventional Commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/) para mensajes claros:

```bash
feat: nueva funcionalidad
fix: corrección de bug
docs: cambios en documentación
chore: tareas de mantenimiento
refactor: refactorización de código
test: añadir o mejorar tests
```

### 🐛 Reportar Bugs

Si encuentras un bug, por favor [abre un issue](https://github.com/Kavalieri/CuentasSiK/issues/new) con:
- Descripción clara del problema
- Pasos para reproducirlo
- Comportamiento esperado vs actual
- Screenshots (si aplica)
- Entorno (navegador, OS)

### 💡 Solicitar Features

¿Tienes una idea? [Abre un issue](https://github.com/Kavalieri/CuentasSiK/issues/new) con la etiqueta `enhancement`:
- Descripción detallada de la feature
- Casos de uso
- Mockups o wireframes (opcional)

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo [LICENSE](./LICENSE) para más detalles.

```
MIT License

Copyright (c) 2025 CuentasSiK Contributors

Se concede permiso, de forma gratuita, a cualquier persona que obtenga una copia
de este software y archivos de documentación asociados (el "Software"), para usar
el Software sin restricción, incluyendo sin limitación los derechos de uso, copia,
modificación, fusión, publicación, distribución, sublicencia y/o venta de copias
del Software.
```

---

## 👥 Autores y Reconocimientos

### 💻 Mantenedores

- **[Kavalieri](https://github.com/Kavalieri)** - *Creador y desarrollador principal*

### 🙏 Agradecimientos

- **[Supabase](https://supabase.com)** - Por el increíble backend-as-a-service
- **[Vercel](https://vercel.com)** - Por el hosting y deployment automático
- **[shadcn/ui](https://ui.shadcn.com/)** - Por los componentes UI de calidad
- **[Next.js Team](https://nextjs.org/)** - Por el framework más potente de React
- Comunidad de **GitHub Copilot** por las herramientas de AI y MCPs

### 🌟 Inspiración

Este proyecto nació de la necesidad real de gestionar gastos compartidos de forma justa y transparente en pareja. Inspirado en el principio de que cada uno debe aportar según sus posibilidades, manteniendo la equidad y el respeto mutuo.

---

## 📞 Contacto y Soporte

- **Issues**: [GitHub Issues](https://github.com/Kavalieri/CuentasSiK/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Kavalieri/CuentasSiK/discussions)
- **Demo en Vivo**: [cuentas-sik.vercel.app](https://cuentas-sik.vercel.app)

---

## 📊 Estado del Proyecto

![GitHub last commit](https://img.shields.io/github/last-commit/Kavalieri/CuentasSiK)
![GitHub issues](https://img.shields.io/github/issues/Kavalieri/CuentasSiK)
![GitHub pull requests](https://img.shields.io/github/issues-pr/Kavalieri/CuentasSiK)

**Versión actual**: v1.0.0  
**Estado**: ✅ Production Ready  
**Última actualización**: Octubre 2025

---

<div align="center">

**Hecho con ❤️ para mejorar la transparencia financiera en pareja**

[⬆ Volver arriba](#-cuentassik)

</div>


## 👥 Contribuir

1. Fork el repositorio
2. Crea una rama: `git checkout -b feat/amazing-feature`
3. Commit: `git commit -m 'feat: add amazing feature'`
4. Push: `git push origin feat/amazing-feature`
5. Abre un Pull Request

## 📧 Contacto

Para preguntas o sugerencias, abre un issue en GitHub.

---

Hecho con ❤️ para gestionar gastos en pareja
