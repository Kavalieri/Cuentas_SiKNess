# CuentasSiK 💰

Aplicación web minimalista para gestionar gastos e ingresos compartidos en pareja.

[![Deploy on Vercel](https://vercel.com/button)](https://cuentas-sik.vercel.app)

**🌐 Demo en producción**: https://cuentas-sik.vercel.app

## ✅ Estado Actual

### Core Features
- ✅ **Autenticación**: Magic link funcionando
- ✅ **Creación de Households**: RLS sin recursión (con SECURITY DEFINER)
- ✅ **Múltiples Hogares**: Los usuarios pueden crear/unirse a ilimitados hogares ⭐ NEW
- ✅ **Selector de Hogares**: Cambio de contexto con dropdown en header ⭐ NEW
- ✅ **Gestión de Categorías**: CRUD completo con UI
- ✅ **Movimientos (Gastos/Ingresos)**: Implementado
- ✅ **Dashboard**: Vista mensual con resúmenes
- ✅ **Modo Oscuro**: Dark/Light mode con persistencia y detección del sistema

### Sistema de Contribuciones ⭐ NEW
- ✅ **UI Simplificada**: Vista única en lugar de 3 pestañas
- ✅ **Tipos de Cálculo**: Proporcional, Partes Iguales, Personalizado
- ✅ **Pagos Flexibles**: Parciales, completos o sobrepagos
- ✅ **Auto-creación de Movimientos**: Los pagos crean movimientos de ingreso automáticamente
- ✅ **Estados de Pago**: pending, partial, paid, overpaid
- ✅ **Balance Correcto**: Total recaudado incluye pre-pagos + pagos al fondo

### Sistema de Ajustes con Aprobación ⭐⭐ NEW (Oct 2025)

Sistema completo de gestión de contribuciones con workflow de aprobación:

**Flujo de Pre-pagos**:
1. **Solicitud (Miembro)**: Miembro crea solicitud de pre-pago desde QuickActions
   - Selecciona categoría de gasto (ej. "Supermercado")
   - Indica monto y descripción
   - Estado inicial: `pending`
2. **Review (Owner)**: Owner ve solicitud en Panel de Aprobaciones
   - Preview detallado del impacto en contribución (bloque azul)
   - Puede editar categoría y descripciones antes de aprobar
3. **Confirmación (Owner)**: Dialog de confirmación final
   - Resumen del ajuste (miembro, monto, mes/año)
   - Lista de movimientos que se crearán
   - Advertencia: "Esta acción no se puede deshacer fácilmente"
4. **Aprobación/Rechazo**:
   - ✅ **Aprobar**: Crea 2 movimientos automáticamente + actualiza `paid_amount`
   - ❌ **Rechazar**: Cambia estado a `rejected` + notifica al miembro
5. **Update Optimista**: UI se actualiza inmediatamente sin recarga completa

**Funcionalidades Clave**:
- ✅ **Pre-pagos con Validación**: Los miembros solicitan, los owners aprueban
- ✅ **Estados de Ajustes**: `pending` → `approved` / `rejected` con trazabilidad completa
- ✅ **Movimientos Duales Automáticos**: Pre-pagos aprobados crean:
  * Movimiento de gasto en la categoría seleccionada
  * Movimiento de ingreso virtual representando el aporte del miembro
- ✅ **Panel de Aprobaciones**: Interface dedicada para owners con contador de pendientes
- ✅ **Edición Pre-aprobación**: Owners pueden modificar categoría y descripciones
- ✅ **Confirmación de Seguridad**: Diálogo de dos pasos antes de aprobar
- ✅ **Preview de Impacto**: Muestra cómo aumentará `paid_amount` y afectará al mes/año
- ✅ **Ingresos Extra**: Aportes voluntarios con aprobación automática (no requieren owner)
- ✅ **Updates Optimistas**: UI se actualiza inmediatamente, recarga en background después de 1s
- ✅ **Notificaciones Mejoradas**: Toasts con descripciones y duración 5000ms
- ✅ **Eliminación Inteligente**: Al eliminar ajuste → elimina automáticamente movimientos relacionados

**Archivos del Sistema**:
- Migration: `supabase/migrations/20251004_restructure_adjustments_approval_system.sql`
- Server Actions: `app/app/contributions/adjustment-actions.ts` (565 líneas)
- Panel Aprobaciones: `app/app/contributions/components/PendingApprovalsPanel.tsx` (597 líneas)
- Formularios: `app/app/contributions/components/QuickActions.tsx` (411 líneas)
- Testing Checklist: `docs/TESTING_CHECKLIST_ADJUSTMENTS.md` (570+ líneas)
- Documentación: `docs/ADJUSTMENTS_REDESIGN.md`

### Privacy & UX ⭐ NEW
- ✅ **Privacy Mode**: Ocultar cantidades en lugares públicos con toggle Eye/EyeOff
- ✅ **Persistencia**: Preferencia guardada en localStorage
- ✅ **Contexto Global**: PrivacyProvider + hook usePrivateFormat()

### Administración
- ✅ **Panel de Administración**: Dashboard + Wipe + Gestión de Miembros + System Admins
- ✅ **Perfil Personal**: Cada usuario puede editar su ingreso
- ✅ **Gestión de Miembros**: Cambiar roles, eliminar miembros (admin)
- ✅ **Función Wipe**: Limpiar datos de testing con protección anti-wipe

### Sistema de Invitaciones ⭐ NEW
- ✅ **Invitaciones Públicas**: Enlaces funcionan sin login (RLS fix)
- ✅ **Constraint Fix**: Permite recrear invitaciones después de cancelar
- ✅ **Cookie Cleanup**: Eliminación automática tras aceptar
- ✅ **Auto-activación**: Hogares nuevos/aceptados se activan automáticamente

### DevOps
- ✅ **Supabase CLI**: Workflow de migraciones automatizado
- ✅ **Build**: Producción funcionando (20 páginas)
- ✅ **CI/CD**: GitHub Actions + Auto-deploy en Vercel
- ✅ **Release Please**: Versionado automático con pre-releases alpha

## 🚀 Stack Tecnológico

- **Framework**: Next.js 15 (App Router, Server Actions, React 18+)
- **Lenguaje**: TypeScript estricto
- **UI**: Tailwind CSS + shadcn/ui + next-themes
- **Formularios**: React Hook Form + Zod
- **Backend**: Supabase (PostgreSQL + Auth con magic link)
- **Gráficas**: Recharts
- **Testing**: Vitest
- **CI/CD**: GitHub Actions + Release Please

## 📋 Requisitos Previos

- Node.js 20.x o superior
- npm
- Cuenta en Supabase (gratuita)

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

1. Crea un proyecto en [Supabase](https://supabase.com)
2. En el SQL Editor de Supabase, ejecuta:
   - Primero: `db/schema.sql`
   - Después: `db/seed.sql`
3. Obtén tus credenciales:
   - Ve a Settings → API
   - Copia `Project URL` y `anon public` key

### 4. Configurar variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto:

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

#### Tablas Core
- **households**: Hogar compartido (1 pareja = 1 household)
- **household_members**: Relación usuarios-hogares con roles (owner/member)
- **categories**: Categorías personalizadas por hogar (expense/income)
- **movements**: Transacciones (gastos/ingresos)

#### Sistema de Contribuciones ⭐
- **member_incomes**: Historial de ingresos mensuales por miembro
- **household_settings**: Meta de contribución mensual + tipo de cálculo
- **contributions**: Contribuciones calculadas y rastreadas por miembro/mes
- **contribution_adjustments**: Ajustes con sistema de aprobación (pending/approved/rejected) ⭐⭐ NEW

#### Sistema de Múltiples Hogares ⭐ NEW
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
git commit -m "feat: add CSV export for movements"
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

### 📋 Próximas Features (v0.1.0)
- [ ] Sistema de notificaciones
- [ ] Gráficos con Recharts
- [ ] Edición de categorías
- [ ] Filtros avanzados en movimientos
- [ ] Export/Import CSV
- [ ] Import desde Excel existente
- [ ] History tab en contribuciones
- [ ] Gestión avanzada de múltiples hogares (favoritos, recientes)

### 🔮 Futuro (v0.2.0+)
- [ ] Integración con Google Sheets
- [ ] PWA (Progressive Web App)
- [ ] Notificaciones push
- [ ] Múltiples households por usuario

## 📄 Licencia

MIT

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
