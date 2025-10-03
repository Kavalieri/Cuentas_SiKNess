# CuentasSiK 💰

Aplicación web minimalista para gestionar gastos e ingresos compartidos en pareja.

## ✅ Estado Actual

- ✅ **Autenticación**: Magic link funcionando
- ✅ **Creación de Households**: RLS sin recursión (con SECURITY DEFINER)
- ✅ **Gestión de Categorías**: CRUD completo con UI (crear, listar, eliminar)
- ✅ **Movimientos (Gastos/Ingresos)**: Implementado
- ✅ **Dashboard**: Vista mensual con resúmenes
- ✅ **Sistema de Contribuciones**: Backend + UI completo (3 tabs)
- ✅ **Panel de Administración**: Dashboard + Wipe + Gestión de Miembros
- ✅ **Perfil Personal**: Cada usuario puede editar su ingreso
- ✅ **Gestión de Miembros**: Cambiar roles, eliminar miembros (admin)
- ✅ **Función Wipe**: Limpiar datos de testing
- ✅ **Modo Oscuro**: Dark/Light mode con persistencia
- ✅ **Supabase CLI**: Workflow de migraciones automatizado
- ✅ **Build**: Producción funcionando correctamente (15 páginas)

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
│       ├── categories/      # ✅ Gestión de categorías (UI completa)
│       ├── contributions/   # ✅ Sistema de contribuciones (3 tabs)
│       ├── profile/         # ✅ Perfil personal (NEW)
│       ├── admin/           # ✅ Panel de administración (NEW)
│       │   ├── page.tsx     # Dashboard admin
│       │   ├── wipe/        # Limpiar datos
│       │   └── members/     # ✅ Gestión de miembros (NEW)
│       └── settings/        # Configuración
├── components/
│   ├── ui/                  # Componentes shadcn/ui
│   └── shared/              # Componentes compartidos
├── lib/                     # Utilidades
│   ├── supabaseServer.ts   # Cliente Supabase server-side
│   ├── supabaseBrowser.ts  # Cliente Supabase client-side
│   ├── adminCheck.ts       # ✅ Verificación de permisos owner (NEW)
│   ├── result.ts           # Pattern Result
│   ├── format.ts           # Formateo de moneda
│   ├── date.ts             # Utilidades de fechas
│   └── csv.ts              # Import/Export CSV
├── db/
│   ├── schema.sql               # Esquema base de datos
│   ├── contributions-schema.sql # ✅ Sistema de contribuciones
│   └── seed.sql                 # Datos iniciales
├── docs/
│   ├── CONTRIBUTIONS_SYSTEM.md         # ✅ Sistema de contribuciones
│   ├── USER_MANAGEMENT_IMPLEMENTATION.md # ✅ Gestión de usuarios (NEW)
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

#### Sistema de Contribuciones
- **member_incomes**: Historial de ingresos mensuales por miembro
- **household_settings**: Meta de contribución mensual del hogar
- **contributions**: Contribuciones calculadas y rastreadas por miembro/mes
- **contribution_adjustments**: Ajustes manuales a contribuciones

### Seguridad

- **Row Level Security (RLS)** habilitado en todas las tablas
- Políticas que verifican `auth.uid()` pertenece al household
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

1. Conecta tu repositorio en [Vercel](https://vercel.com)
2. Configura las variables de entorno:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Deploy automático en cada push a `main`

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

Ver [Guía completa de versionado](docs/VERSIONING_AND_RELEASES.md)

### Proceso de Desarrollo

1. Crea una rama desde `main`: `feat/nombre-funcionalidad`
2. Haz commits siguiendo Conventional Commits
3. Abre un Pull Request
4. El CI ejecutará: lint + build + tests
5. Tras mergear, Release Please creará automáticamente:
   - CHANGELOG.md actualizado
   - Bump de versión semántica
   - GitHub Release con tag

## 🧪 Testing

- **Unit tests** con Vitest para utilidades (`lib/`)
- **React Testing Library** para componentes críticos
- **NO testeamos** integraciones Supabase (confiar en RLS)
- Coverage objetivo: 60-70% en utilities y formularios

## 📚 Documentación

### Guías Principales
- [Instrucciones para AI Agents](.github/copilot-instructions.md)
- [Versionado y Releases](docs/VERSIONING_AND_RELEASES.md) ← **Sistema de pre-releases alpha**
- [Sistema de Contribuciones](docs/CONTRIBUTIONS_SYSTEM.md)
- [Gestión de Usuarios](docs/USER_MANAGEMENT_IMPLEMENTATION.md)
- [Modo Oscuro](docs/DARK_MODE.md)
- [Fix RLS Recursión](docs/FIX_RLS_RECURSION.md)
- [Deploy en Vercel](docs/VERCEL_DEPLOY.md)
- [Supabase CLI](docs/SUPABASE_CLI.md)

### Referencias
- [Especificación Completa](prompt_inicial_del_agente_app_gastos_pareja_next_instructions.md)
- [Documentación de Supabase](https://supabase.com/docs)
- [Documentación de Next.js](https://nextjs.org/docs)
- [shadcn/ui](https://ui.shadcn.com)

## 🛣️ Roadmap

### ✅ Completado
- [x] Setup inicial del proyecto
- [x] Autenticación con magic links
- [x] Estructura de rutas y navegación
- [x] Sistema de households (hogares)
- [x] Fix error de recursión en RLS
- [x] CRUD de categorías con UI completa
- [x] CRUD de movimientos (gastos/ingresos)
- [x] Dashboard con resumen mensual
- [x] Modo oscuro (dark/light)
- [x] Sistema de contribuciones proporcionales (backend + UI)
- [x] Panel de administración (dashboard + wipe + members)
- [x] Gestión de miembros (cambiar roles, eliminar)
- [x] Perfil personal (editar ingreso propio)
- [x] Supabase CLI workflow
- [x] Build de producción

### 🚧 En Progreso
- [ ] Sistema de invitaciones por email
- [ ] Gráficos con Recharts
- [ ] Edición de categorías (actualmente solo crear/eliminar)

### 📋 Pendiente
- [ ] Filtros avanzados en movimientos
- [ ] Export/Import CSV
- [ ] Import desde Excel existente
- [ ] History tab en contribuciones
- [ ] Integración con Google Sheets (futuro)
- [ ] PWA (Progressive Web App)

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
