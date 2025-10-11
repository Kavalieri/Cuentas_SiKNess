<div align="center">

# 💰 CuentasSiK

**Sistema profesional de gestión de gastos compartidos para parejas**

[![Version](https://img.shields.io/badge/version-1.0.0-blue?style=flat-square)](https://github.com/Kavalieri/CuentasSiK/releases)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript&style=flat-square)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14+-black?logo=next.js&style=flat-square)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue?logo=postgresql&style=flat-square)](https://postgresql.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](./LICENSE)

[🌐 **Demo en Vivo**](https://cuentassik.com) · [📖 **Documentación**](./docs) · [🐛 **Reportar Bug**](https://github.com/Kavalieri/CuentasSiK/issues) · [💡 **Solicitar Feature**](https://github.com/Kavalieri/CuentasSiK/issues)

</div>

---

## � ¿Qué es CuentasSiK?

**CuentasSiK** es una aplicación web moderna y profesional diseñada específicamente para parejas que desean gestionar sus finanzas compartidas de manera transparente, equitativa y sin complicaciones.

### 🎯 **Problema que resuelve**

- ❌ **Discusiones por dinero**: ¿Quién debe pagar qué?
- ❌ **Cálculos manuales**: Hojas de cálculo desactualizadas
- ❌ **Falta de transparencia**: No saber en qué se gasta el dinero
- ❌ **Inequidad financiera**: Contribuciones desproporcionadas a los ingresos

### ✅ **Nuestra solución**

CuentasSiK ofrece un sistema de **contribuciones proporcionales inteligente** que:

- **Calcula automáticamente** la parte que debe pagar cada miembro según sus ingresos
- **Registra todos los gastos** con categorización y filtros avanzados
- **Gestiona créditos automáticamente** cuando alguien paga de más
- **Mantiene un fondo de ahorros compartido** para metas conjuntas
- **Genera reportes** detallados de gastos e ingresos

---

## ✨ Características Principales

### 🔐 **Autenticación & Gestión de Hogares**

- ✅ **Magic Link Authentication**: Sin contraseñas, solo email
- ✅ **Sistema Multi-Hogar**: Gestiona múltiples hogares independientes
- ✅ **Invitaciones Seguras**: Enlaces temporales para invitar miembros
- ✅ **Selector de Contexto**: Cambio rápido entre hogares

### 💸 **Gestión Avanzada de Transacciones**

- ✅ **CRUD Completo**: Crear, editar, eliminar con validaciones
- ✅ **23+ Categorías**: Categorías predefinidas + personalización
- ✅ **Filtros Inteligentes**: Por categoría, tipo, fecha, miembro, estado
- ✅ **Historial de Cambios**: Auditoría completa de modificaciones
- ✅ **Privacy Mode**: Ocultar cantidades en lugares públicos

### 🤝 **Sistema de Contribuciones Proporcionales**

- ✅ **Cálculo Automático**: Proporcional a ingresos, partes iguales o personalizado
- ✅ **Workflow de Aprobación**: Sistema completo de ajustes con aprobación/rechazo
- ✅ **Estados Dinámicos**: pending, partial, paid, overpaid con tracking en tiempo real
- ✅ **Panel de Gestión**: Interface dedicada para owners con contador de pendientes
- ✅ **Transacciones Duales**: Ajustes crean automáticamente gasto + ingreso virtual

### 💳 **Sistema Inteligente de Créditos**

- ✅ **Generación Automática**: Créditos por sobrepagos automáticos
- ✅ **Decisión Flexible**: Aplicar al mes siguiente o transferir a ahorros
- ✅ **Gestión Mensual**: Decisiones independientes cada mes
- ✅ **Reserva Temporal**: Sistema de reserva para evitar doble uso

### 💰 **Fondo de Ahorros Compartido**

- ✅ **Depósitos**: Desde cuenta personal al fondo común
- ✅ **Retiros**: Del fondo común a cuenta personal
- ✅ **Transferencias de Créditos**: Convierte créditos en ahorros
- ✅ **Gráficos de Evolución**: Visualización del crecimiento del fondo
- ✅ **Historial Completo**: Todas las operaciones registradas

### 📊 **Reportes y Análisis**

- ✅ **Dashboard Interactivo**: 3 pestañas (Balance, Ahorro, Estadísticas)
- ✅ **Balance Breakdown**: Análisis detallado por categorías
- ✅ **Gráficos Evolutivos**: Evolución de ahorros en el tiempo
- ✅ **Exportación**: PDF y CSV con datos completos
- ✅ **Períodos Mensuales**: Gestión temporal con cierre/reapertura

### ⚙️ **Administración y Configuración**

- ✅ **Panel de Admin**: Para administradores del sistema
- ✅ **Gestión de Miembros**: Roles owner/member con permisos diferenciados
- ✅ **Configuración de Hogar**: Personalización de cálculos y categorías
- ✅ **Temas**: Modo oscuro/claro automático
- ✅ **Responsive**: Optimizado para móvil, tablet y desktop

---

## 🏗️ **Stack Tecnológico**

### **Frontend**

- **Next.js 14+** con App Router y Server Actions
- **React 18+** con hooks modernos
- **TypeScript** estricto para type safety
- **Tailwind CSS** + **shadcn/ui** para diseño moderno
- **next-themes** para tema oscuro/claro

### **Backend**

- **PostgreSQL** nativo (no Supabase) para máximo rendimiento
- **Server Actions** de Next.js para APIs type-safe
- **Middleware** personalizado para autenticación
- **Validación con Zod** en cliente y servidor

### **Infraestructura**

- **PM2** para gestión de procesos en producción
- **Servidor Linux** propio (no serverless)
- **Sistema de migraciones** personalizado
- **Backup automático** de base de datos

### **Desarrollo**

- **VSCode** con extensiones optimizadas
- **MCPs (Model Context Protocol)** para herramientas AI
- **Vitest** para testing unitario
- **release-please** para gestión automática de versiones
- **Git hooks** para calidad de código

---

## 🚦 **Estado del Proyecto**

### ✅ **Versión 1.0.0 - LANZAMIENTO OFICIAL**

**🎉 ¡Primera versión estable!** Todas las funcionalidades core implementadas y probadas en producción.

**📋 Funcionalidades Incluidas:**

- ✅ Sistema completo de autenticación multi-hogar
- ✅ Gestión avanzada de transacciones con filtros
- ✅ Sistema de contribuciones proporcionales con aprobación
- ✅ Sistema inteligente de créditos automáticos
- ✅ Fondo de ahorros compartido con gráficos
- ✅ Dashboard interactivo con 3 pestañas
- ✅ Exportación PDF/CSV
- ✅ Panel de administración
- ✅ Modo oscuro/claro
- ✅ Responsive design completo

**📊 Métricas:**

- 🔢 **+15 tablas** de base de datos optimizadas
- 🎨 **+50 componentes** React reutilizables
- 📱 **+20 páginas** responsive
- ⚡ **+30 Server Actions** type-safe
- 🧪 **+100 casos de prueba** en desarrollo

---

## 🎯 **Casos de Uso Típicos**

### 👫 **Pareja viviendo juntos**

```
📊 Configuración:
- Alex: €2,000/mes → 60% de contribución
- Sam: €1,333/mes → 40% de contribución

💸 Flujo mensual:
1. Gastos del hogar: €1,200
2. Alex debe: €720 (60%)
3. Sam debe: €480 (40%)
4. Seguimiento automático de pagos
5. Créditos por sobrepagos gestionados automáticamente
```

### 🏠 **Gastos compartidos de vivienda**

```
🏷️ Categorías automáticas:
- Vivienda: Alquiler, servicios, mantenimiento
- Alimentación: Supermercado, restaurantes
- Transporte: Combustible, transporte público
- Ocio: Entretenimiento, suscripciones
- Salud: Seguros, médicos
- + 18 categorías más personalizables
```

### 💰 **Ahorro para objetivos conjuntos**

```
🎯 Metas típicas:
- Vacaciones de verano: €3,000
- Electrodomésticos: €1,500
- Fondo de emergencia: €5,000
- Entrada para vivienda: €20,000

📈 Gestión automática:
- Depósitos programados
- Transferencia de créditos
- Visualización del progreso
- Retiros cuando sea necesario
```

---

## 🚀 **Instalación y Despliegue**

### 📋 **Requisitos**

- **Node.js** 18+ y npm/yarn
- **PostgreSQL** 15+
- **Git** para control de versiones

### 🔧 **Instalación Local**

```bash
# 1. Clonar repositorio
git clone https://github.com/Kavalieri/CuentasSiK.git
cd CuentasSiK

# 2. Instalar dependencias
npm install

# 3. Configurar base de datos
# Ver documentación en ./database/README.md

# 4. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus configuraciones

# 5. Ejecutar migraciones
npm run db:migrate

# 6. Iniciar desarrollo
npm run dev
```

### 🌐 **Despliegue en Producción**

```bash
# 1. Build de producción
npm run build

# 2. Configurar PM2 (recomendado)
cp ecosystem.config.example.js ecosystem.config.js
# Editar configuración según tu servidor

# 3. Iniciar con PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

**📚 Documentación completa**: Ver [/docs/README.md](./docs/README.md)

---

## 🤝 **Contribuir**

¡Contribuciones son bienvenidas! Por favor lee [CONTRIBUTING.md](./CONTRIBUTING.md) para detalles.

### 🐛 **Reportar Bugs**

- Usa el [Issue Tracker](https://github.com/Kavalieri/CuentasSiK/issues)
- Incluye pasos para reproducir
- Especifica versión y navegador

### 💡 **Solicitar Features**

- Crea un [Feature Request](https://github.com/Kavalieri/CuentasSiK/issues)
- Explica el caso de uso
- Proporciona mockups si es posible

### 📝 **Pull Requests**

- Fork el repositorio
- Crea una rama feature (`git checkout -b feature/AmazingFeature`)
- Commit cambios (`git commit -m 'Add AmazingFeature'`)
- Push a la rama (`git push origin feature/AmazingFeature`)
- Abre un Pull Request

---

## 📄 **Licencia**

Este proyecto está bajo la Licencia MIT. Ver [LICENSE](./LICENSE) para más detalles.

---

## 👥 **Equipo**

### 💻 **Desarrollado por**

- **[Kavalieri](https://github.com/Kavalieri)** - Architect & Full-Stack Developer

### 🤖 **Asistencia AI**

- **GitHub Copilot** - Code generation y pair programming
- **Claude 3.5 Sonnet** - Architecture design y code review

---

## 📞 **Soporte**

### 💬 **Contacto**

- 📧 **Email**: [soporte@cuentassik.com](mailto:soporte@cuentassik.com)
- 🐛 **Issues**: [GitHub Issues](https://github.com/Kavalieri/CuentasSiK/issues)
- 📖 **Wiki**: [GitHub Wiki](https://github.com/Kavalieri/CuentasSiK/wiki)

### 🌟 **¿Te gusta el proyecto?**

- ⭐ Dale una estrella en GitHub
- 🐛 Reporta bugs que encuentres
- 💡 Sugiere nuevas funcionalidades
- 📢 Compártelo con otros

---

<div align="center">

### 💝 **Hecho con amor para parejas que quieren gestionar sus finanzas juntos**

**CuentasSiK v1.0.0** - Sistema profesional de gestión de gastos compartidos

[⬆️ Volver arriba](#-cuentassik)

</div>
- ✅ **Auto-Apply**: Opción de aplicación automática mensual
- ✅ **Rastreo Completo**: Origen, estado y trazabilidad de cada crédito

### 💰 Fondo de Ahorro del Hogar

- ✅ **Balance Compartido**: Fondo común con meta de ahorro opcional ⭐ NEW
- ✅ **Depositar**: Registro de aportes con categoría y miembro ⭐ NEW
- ✅ **Retirar**: Retiros con validación de balance + opción transacción común ⭐ NEW
- ✅ **Historial Completo**: Tabla con balance before/after y trazabilidad ⭐ NEW
- ✅ **Progress Tracking**: Barra de progreso hacia meta configurada

### 📊 Reportes y Análisis

- ✅ **Tendencias Mensuales**: LineChart con ingresos/gastos últimos 6 meses ⭐ NEW
- ✅ **Distribución por Categoría**: PieChart top 5 categorías más gastadas ⭐ NEW
- ✅ **Comparación Contribuciones**: BarChart esperado vs pagado por miembro ⭐ NEW
- ✅ **Ranking Categorías**: Tabla top 10 con contador de transacciones ⭐ NEW
- ✅ **Visualizaciones Recharts**: Interactivas, responsive y con privacy mode

### 📅 Gestión de Períodos Mensuales

- ✅ **Cierre Mensual**: Lock de transacciones y ajustes con validación secuencial
- ✅ **Reapertura**: Unlock con auditoría y contador de reaperturas
- ✅ **Estados**: future, active, closing, closed, historical
- ✅ **Logs de Acceso**: Auditoría completa de cierres/reaperturas

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

- **Framework**: Next.js 15 (App Router, Server Actions, React 19)
- **Lenguaje**: TypeScript estricto
- **UI**: Tailwind CSS + shadcn/ui
- **Tema**: next-themes (dark/light mode)
- **Formularios**: React Hook Form + Zod
- **Base de Datos**: PostgreSQL 15.14 nativo (NO Supabase)
- **Gráficas**: Recharts
- **Deploy**: PM2 en servidor Linux propio (cuentas.sikwow.com)
- **CI/CD**: GitHub Actions + Release Please

---

## 🗄️ Base de Datos

### PostgreSQL Nativo

**Producción**: `cuentassik_prod` (PostgreSQL 15.14)
**Desarrollo**: `cuentassik_dev` (local)

### Setup Inicial

```bash
# 1. Instalar PostgreSQL
sudo apt install postgresql postgresql-contrib

# 2. Crear base de datos
sudo -u postgres psql << 'EOF'
CREATE DATABASE cuentassik_dev;
CREATE USER cuentassik_user WITH PASSWORD 'tu_password';
ALTER DATABASE cuentassik_dev OWNER TO cuentassik_user;
EOF

# 3. Aplicar schema base
sudo -u postgres psql -d cuentassik_dev -f database/seeds/schema_only.sql

# 4. Configurar .env.development.local
DATABASE_URL="postgresql://cuentassik_user:tu_password@localhost:5432/cuentassik_dev"
```

### Migraciones

**Filosofía**:

- Partimos de seed v0.3.0 (prod = dev sincronizadas)
- Migraciones = **solo estructura**, nunca contenido
- Seguridad: nunca borrar campos con <3 meses uso

**Workflow**:

1. `development/` → WIP local (ignorado en Git)
2. `tested/` → Validadas en DEV, listas para PROD (en Git)
3. `applied/` → Aplicadas en PROD (en Git)
4. `applied/archive/` → Históricas obsoletas (ignorado en Git)

📖 **Documentación completa**: [database/README.md](./database/README.md)

---

## 🔧 Gestión del Proyecto con MCPs

Este proyecto utiliza **Model Context Protocols (MCPs)** para automatización del desarrollo:

### 🐙 GitHub MCP

```bash
# Gestión de branches
mcp_github_github_create_branch(owner, repo, branch, from_branch)
mcp_github_github_list_branches(owner, repo)

# Push directo de archivos
mcp_github_github_push_files(owner, repo, branch, files, message)
mcp_github_github_create_or_update_file(owner, repo, path, content, message, branch, sha)

# Issues (activar con activate_github_issue_management)
# Workflows (activar con activate_github_workflow_management)
```

### 🌿 Git MCP

```bash
# Operaciones Git sin CLI
mcp_git_git_status(path)
mcp_git_git_add(path, files)
mcp_git_git_commit(path, message)
mcp_git_git_push(path, remote, branch)
mcp_git_git_branch(path, mode, branchName)
mcp_git_git_checkout(path, branchOrPath)
```

---

## 🚀 Quick Start

teamId: "your-vercel-team-id"
});

````

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
````

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar PostgreSQL

```bash
# Crear base de datos
sudo -u postgres psql << 'EOF'
CREATE DATABASE cuentassik_dev;
CREATE USER cuentassik_user WITH PASSWORD 'tu_password';
ALTER DATABASE cuentassik_dev OWNER TO cuentassik_user;
GRANT ALL PRIVILEGES ON DATABASE cuentassik_dev TO cuentassik_user;
EOF

# Aplicar schema base v0.3.0
sudo -u postgres psql -d cuentassik_dev -f database/seeds/schema_only.sql

# Verificar tablas creadas
psql -U cuentassik_user -d cuentassik_dev -c "\dt"
```

📖 **Guía completa de setup**: [database/README.md](./database/README.md)

### 4. Configurar variables de entorno

Crea un archivo `.env.development.local` en la raíz:

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
│       ├── categories/      # Gestión de categorías
│       ├── contributions/   # Sistema de contribuciones
│       ├── profile/         # Perfil personal
│       ├── admin/           # Panel de administración
│       ├── settings/        # Configuración del hogar
│       └── household/       # Legacy (deprecar)
├── components/
│   ├── ui/                  # Componentes shadcn/ui
│   └── shared/              # Componentes compartidos
│       ├── PrivacyProvider.tsx   # Contexto de privacidad
│       ├── PrivacyToggle.tsx     # Toggle Eye/EyeOff
│       └── PrivateAmount.tsx     # Wrapper para cantidades privadas
├── lib/                     # Utilidades
│   ├── supabaseServer.ts   # Cliente PostgreSQL server-side (query abstraction)
│   ├── format.ts           # Formateo de moneda y fechas
│   ├── adminCheck.ts       # Verificación de permisos owner
│   ├── contributionTypes.ts # Tipos de cálculo (proportional, equal, custom)
│   ├── result.ts           # Pattern Result
│   ├── format.ts           # Formateo de moneda y fechas
│   ├── adminCheck.ts       # Verificación de permisos owner
│   ├── contributionTypes.ts # Tipos de cálculo
│   ├── result.ts           # Pattern Result
│   └── utils.ts            # Utilidades generales
├── database/                # PostgreSQL nativo
│   ├── seeds/
│   │   └── schema_only.sql # Schema base v0.3.0
│   ├── schemas/
│   │   └── migrations_control.sql # Tabla de control
│   ├── migrations/
│   │   ├── development/    # WIP local (ignorado)
│   │   ├── tested/         # Validadas para PROD (en repo)
│   │   └── applied/        # Aplicadas en PROD (en repo)
│   │       └── archive/    # Históricas obsoletas (ignorado)
│   ├── AGENTS.md           # Instrucciones para IA
│   └── README.md           # Setup y workflows
├── docs/
│   ├── DARK_MODE.md
│   ├── PRIVACY_MODE.md
│   └── README.md
└── types/
    └── database.ts         # Tipos TypeScript
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

- **[Kavalieri](https://github.com/Kavalieri)** - _Creador y desarrollador principal_

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
