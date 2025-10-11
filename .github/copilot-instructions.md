# CuentasSiK - GitHub Copilot Instructions

> **📋 INSTRUCCIONES COMPLETAS**: Ver archivos `AGENTS.md` (nested) para documentación completa
>
> - `/AGENTS.md` - Instrucciones generales
> - `/app/AGENTS.md` - Código Next.js/React
> - `/database/AGENTS.md` - PostgreSQL/Migraciones

---

## 🚨 REGLA CRÍTICA: SIEMPRE USAR MCPs

**PROHIBIDO** usar comandos CLI manuales cuando existe un MCP equivalente:

| ❌ NUNCA USAR                       | ✅ SIEMPRE USAR MCP                          |
| ----------------------------------- | -------------------------------------------- |
| `run_in_terminal("git commit ...")` | `mcp_git_git_commit({ message: "..." })`     |
| `run_in_terminal("git push")`       | `mcp_git_git_push()`                         |
| `run_in_terminal("git status")`     | `mcp_git_git_status()`                       |
| `run_in_terminal("npm run build")`  | `mcp_shell_execute_command("npm run build")` |

**Si el usuario dice "usa el MCP"**, significa que olvidaste esta regla. **Disculpate y corrígelo inmediatamente**.

---

## 🏗️ Stack Básico

- **Framework**: Next.js 14+ (App Router, Server Actions, React 18+)
- **Lenguaje**: TypeScript estricto
- **Base de datos**: PostgreSQL nativo ⚠️ **NO Supabase, NO Vercel**
- **UI**: Tailwind CSS + shadcn/ui
- **Deploy**: PM2 en servidor propio
- **Repositorio**: `Kavalieri/CuentasSiK`

---

## 🔐 Prohibiciones Críticas

❌ **NUNCA usar Supabase MCPs** (proyecto migrado a PostgreSQL directo)
❌ **NUNCA usar Vercel MCPs** (deploy en servidor propio con PM2)
❌ **NUNCA aplicar migraciones desde la aplicación** (solo scripts dedicados)
❌ **NUNCA usar `run_in_terminal` para Git** (usar `mcp_git_*`)
❌ **NUNCA crear archivos .md en la raíz** (usar directorio `docs/`)

---

## 📁 Organización de Documentación

✅ **USAR**: `docs/` para toda la documentación
❌ **NO USAR**: Archivos .md en la raíz (excepto README.md, CHANGELOG.md, CONTRIBUTING.md, LICENSE)

---

**🔗 Para instrucciones completas, ver [AGENTS.md](../AGENTS.md)**

| `run_in_terminal("git push")` | `mcp_git_git_push()` |## 🚨 REGLA CRÍTICA: SIEMPRE USAR MCPs

| `run_in_terminal("git status")` | `mcp_git_git_status()` |

| `run_in_terminal("npm run build")` | `mcp_shell_execute_command("npm run build")` |> - `/database/AGENTS.md` - PostgreSQL/Migraciones

**Si el usuario dice "usa el MCP"**, significa que olvidaste esta regla. **Disculpate y corrígelo inmediatamente**.**PROHIBIDO** usar comandos CLI manuales cuando existe un MCP equivalente:

---> - `/AGENTS.md` - Instrucciones generales> - `/AGENTS.md` - Instrucciones generales

## 🏗️ Stack Básico| ❌ NUNCA USAR | ✅ SIEMPRE USAR MCP |

- **Framework**: Next.js 14+ (App Router, Server Actions, React 18+)|---------------|---------------------|---

- **Lenguaje**: TypeScript estricto

- **Base de datos**: PostgreSQL nativo ⚠️ **NO Supabase, NO Vercel**| `run_in_terminal("git commit ...")` | `mcp_git_git_commit({ message: "..." })` |

- **UI**: Tailwind CSS + shadcn/ui

- **Deploy**: PM2 en servidor propio| `run_in_terminal("git push")` | `mcp_git_git_push()` |> - `/app/AGENTS.md` - Código Next.js/React > - `/app/AGENTS.md` - Código Next.js/React

- **Repositorio**: `Kavalieri/CuentasSiK`

| `run_in_terminal("git status")` | `mcp_git_git_status()` |

---

| `run_in_terminal("npm run build")` | `mcp_shell_execute_command("npm run build")` |## 🚨 REGLA CRÍTICA: SIEMPRE USAR MCPs

## 🔐 Prohibiciones Críticas

**Si el usuario dice "usa el MCP"**, significa que olvidaste esta regla. **Disculpate y corrígelo inmediatamente**.> - `/database/AGENTS.md` - PostgreSQL/Migraciones> - `/database/AGENTS.md` - PostgreSQL/Migraciones

❌ **NUNCA usar Supabase MCPs** (proyecto migrado a PostgreSQL directo)

❌ **NUNCA usar Vercel MCPs** (deploy en servidor propio con PM2) ---**PROHIBIDO** usar comandos CLI manuales cuando existe un MCP equivalente:

❌ **NUNCA aplicar migraciones desde la aplicación** (solo scripts dedicados)

❌ **NUNCA usar `run_in_terminal` para Git** (usar `mcp_git_*`)## 🏗️ Stack Básico

❌ **NUNCA crear archivos .md en la raíz** (usar directorio `docs/`)

- **Framework**: Next.js 14+ (App Router, Server Actions, React 18+)| ❌ NUNCA USAR | ✅ SIEMPRE USAR MCP |

---

- **Lenguaje**: TypeScript estricto

## 📁 Organización de Documentación

- **Base de datos**: PostgreSQL nativo ⚠️ **NO Supabase, NO Vercel**|---------------|---------------------|------

✅ **USAR**: `docs/` para toda la documentación

❌ **NO USAR**: Archivos .md en la raíz (excepto README.md, CHANGELOG.md, CONTRIBUTING.md, LICENSE)- **UI**: Tailwind CSS + shadcn/ui

---- **Deploy**: PM2 en servidor propio| `run_in_terminal("git commit ...")` | `mcp_git_git_commit({ message: "..." })` |

**🔗 Para instrucciones completas, ver [AGENTS.md](../AGENTS.md)**- **Repositorio**: `Kavalieri/CuentasSiK`

| `run_in_terminal("git push")` | `mcp_git_git_push()` |

---

| `run_in_terminal("git status")` | `mcp_git_git_status()` |

## 🔐 Prohibiciones Críticas

| `run_in_terminal("npm run build")` | `mcp_shell_execute_command("npm run build")` |## 🚨 REGLA CRÍTICA: SIEMPRE USAR MCPs## 🚨 REGLA CRÍTICA #1: SIEMPRE USAR MCPs

❌ **NUNCA usar Supabase MCPs** (proyecto migrado a PostgreSQL directo)

❌ **NUNCA usar Vercel MCPs** (deploy en servidor propio con PM2)

❌ **NUNCA aplicar migraciones desde la aplicación** (solo scripts dedicados)

❌ **NUNCA usar `run_in_terminal` para Git** (usar `mcp_git_*`)**Si el usuario dice "usa el MCP"**, significa que olvidaste esta regla. **Disculpate y corrígelo inmediatamente**.

❌ **NUNCA crear archivos .md en la raíz** (usar directorio `docs/`)

---

---**PROHIBIDO** usar comandos CLI manuales cuando existe un MCP equivalente:**PROHIBIDO** usar comandos CLI manuales cuando existe un MCP equivalente:

## 📁 Organización de Documentación

✅ **USAR**: `docs/` para toda la documentación

❌ **NO USAR**: Archivos .md en la raíz (excepto README.md, CHANGELOG.md, CONTRIBUTING.md, LICENSE)## 🏗️ Stack Básico

---

**🔗 Para instrucciones completas, ver [AGENTS.md](../AGENTS.md)**- **Framework**: Next.js 14+ (App Router, Server Actions, React 18+)| ❌ NUNCA USAR | ✅ SIEMPRE USAR MCP || ❌ NUNCA USAR | ✅ SIEMPRE USAR MCP |

- **Lenguaje**: TypeScript estricto

- **Base de datos**: PostgreSQL nativo ⚠️ **NO Supabase, NO Vercel**|---------------|---------------------||---------------|---------------------|

- **UI**: Tailwind CSS + shadcn/ui

- **Deploy**: PM2 en servidor propio| `run_in_terminal("git commit ...")` | `mcp_git_git_commit({ message: "..." })` || `run_in_terminal("git commit ...")` | `mcp_git_git_commit({ message: "..." })` |

- **Repositorio**: `Kavalieri/CuentasSiK`

| `run_in_terminal("git push")` | `mcp_git_git_push()` || `run_in_terminal("git push")` | `mcp_git_git_push()` |

---

| `run_in_terminal("git status")` | `mcp_git_git_status()` || `run_in_terminal("git status")` | `mcp_git_git_status()` |

## 🔐 Prohibiciones Críticas

| `run_in_terminal("npm run build")` | `mcp_shell_execute_command("npm run build")` || `run_in_terminal("npm run build")` | `mcp_shell_execute_command("npm run build")` |

❌ **NUNCA usar Supabase MCPs** (proyecto migrado a PostgreSQL directo)

❌ **NUNCA usar Vercel MCPs** (deploy en servidor propio con PM2)

❌ **NUNCA aplicar migraciones desde la aplicación** (solo scripts dedicados)

❌ **NUNCA usar `run_in_terminal` para Git** (usar `mcp_git_*`)**Si el usuario dice "usa el MCP"**, significa que olvidaste esta regla. **Disculpate y corrígelo inmediatamente**.**Si el usuario dice "usa el MCP"**, significa que olvidaste esta regla. **Disculpate y corrígelo inmediatamente**.

❌ **NUNCA crear archivos .md en la raíz** (usar directorio `docs/`)

---

---

## 📁 Organización de Documentación

✅ **USAR**: `docs/` para toda la documentación

❌ **NO USAR**: Archivos .md en la raíz (excepto README.md, CHANGELOG.md, CONTRIBUTING.md, LICENSE)## 🏗️ Stack Básico## 🏗️ Stack Básico

---

**🔗 Para instrucciones completas, ver [AGENTS.md](../AGENTS.md)**- **Framework**: Next.js 14+ (App Router, Server Actions, React 18+)- **Framework**: Next.js 14+ (App Router, Server Actions, React 18+)

- **Lenguaje**: TypeScript estricto- **Lenguaje**: TypeScript estricto

- **Base de datos**: PostgreSQL nativo ⚠️ **NO Supabase, NO Vercel**- **Base de datos**: PostgreSQL nativo ⚠️ **NO Supabase, NO Vercel**

- **UI**: Tailwind CSS + shadcn/ui- **UI**: Tailwind CSS + shadcn/ui

- **Deploy**: PM2 en servidor propio- **Deploy**: PM2 en servidor propio

- **Repositorio**: `Kavalieri/CuentasSiK`- **Repositorio**: `Kavalieri/CuentasSiK`

---

## 🔐 Prohibiciones Críticas## 🔐 Prohibiciones Críticas

❌ **NUNCA usar Supabase MCPs** (proyecto migrado a PostgreSQL directo)❌ **NUNCA usar Supabase MCPs** (proyecto migrado a PostgreSQL directo)

❌ **NUNCA usar Vercel MCPs** (deploy en servidor propio con PM2) ❌ **NUNCA usar Vercel MCPs** (deploy en servidor propio con PM2)

❌ **NUNCA aplicar migraciones desde la aplicación** (solo scripts dedicados)❌ **NUNCA aplicar migraciones desde la aplicación** (solo scripts dedicados)

❌ **NUNCA usar `run_in_terminal` para Git** (usar `mcp_git_*`)❌ **NUNCA usar `run_in_terminal` para Git** (usar `mcp_git_*`)

❌ **NUNCA crear archivos .md en la raíz** (usar directorio `docs/`)❌ **NUNCA crear archivos .md en la raíz** (usar directorio `docs/`)

---

## 📁 Organización de Documentación## 📁 Organización de Documentación

✅ **USAR**: `docs/` para toda la documentación✅ **USAR**: `docs/` para toda la documentación

❌ **NO USAR**: Archivos .md en la raíz (excepto README.md, CHANGELOG.md, CONTRIBUTING.md, LICENSE)❌ **NO USAR**: Archivos .md en la raíz (excepto README.md, CHANGELOG.md, CONTRIBUTING.md, LICENSE)

---

**🔗 Para instrucciones completas, ver [AGENTS.md](../AGENTS.md)\*\***🔗 Para instrucciones completas, ver [AGENTS.md](../AGENTS.md)\*\*

- `mcp_context7_get-library-docs()` - Documentación de librerías
- `mcp_microsoft_doc_*` - Documentación Microsoft/Azure

---

## 🏗️ ARQUITECTURA DEL PROYECTO

**CuentasSiK** - Aplicación web de gestión de gastos compartidos para parejas

### Stack Técnico

- **Framework**: Next.js 14+ (App Router, Server Actions, React 18+)
- **Lenguaje**: TypeScript estricto
- **Base de datos**: PostgreSQL nativo ⚠️ **NO Supabase, NO Vercel**
- **UI**: Tailwind CSS + shadcn/ui
- **Deploy**: PM2 en servidor propio
- **Tema**: next-themes (dark/light mode)

### 🔐 Base de Datos - PostgreSQL Nativo

**⚠️ IMPORTANTE**: Este proyecto usa PostgreSQL DIRECTO, NO Supabase

**USUARIOS DE BASE DE DATOS:**

1. **`postgres`** (Superusuario PostgreSQL)

   - Administración del servidor PostgreSQL
   - Crear/eliminar bases de datos
   - Configuración global
   - Usado con `sudo -u postgres` (sin contraseña)

2. **`cuentassik_user`** ⭐ (Usuario de la aplicación - PRINCIPAL)

   - **Owner de las bases de datos** `cuentassik_dev` y `cuentassik_prod`
   - **Privilegios**: `SELECT, INSERT, DELETE, UPDATE` en TODAS las tablas
   - **Usado en**:
     - Aplicación Next.js (DATABASE_URL en .env)
     - Migraciones (aplicar cambios de estructura)
     - Scripts de sincronización (ESCENARIO 1 y 2)
     - Queries manuales con `psql -U cuentassik_user` o `sudo -u postgres psql`
   - **Configuración**:

     ```bash
     # .env.development.local
     DATABASE_URL="postgresql://cuentassik_user:PASSWORD@localhost:5432/cuentassik_dev"

     # .env.production.local
     DATABASE_URL="postgresql://cuentassik_user:PASSWORD@localhost:5432/cuentassik_prod"
     ```

3. **`www-data`** (Usuario del sistema Linux)
   - Usuario que ejecuta el proceso PM2
   - **NO es usuario de PostgreSQL**, es usuario del SO
   - El proceso se conecta a PostgreSQL usando `cuentassik_user`

**BASES DE DATOS:**

- **DEV**: `cuentassik_dev` (puerto 5432, desarrollo local)
- **PROD**: `cuentassik_prod` (puerto 5432, producción con PM2)

**TABLA DE CONTROL:**

- `_migrations`: Rastreo de migraciones aplicadas (timestamp, filename, applied_at)

**⚠️ SUDO y Usuarios**:
Como somos administradores con `sudo` completo, los comandos de DB se ejecutan:

- Con `sudo -u postgres psql ...` (sin pedir contraseña)
- O con `psql -U cuentassik_user ...` (autenticación configurada en pg_hba.conf)

📚 **Documentación completa**: [database/README.md](database/README.md)

---

## 🔄 Sistema de Migraciones - Dos Escenarios

### 📥 **ESCENARIO 1: Sincronizar PROD → DEV**

> Copiar datos de producción a desarrollo para trabajar con datos reales

**Script**: `database/scripts/scenario_1_sync_prod_to_dev.sh`
**VSCode Task**: "🔄 ESCENARIO 1: Sincronizar PROD → DEV"

**¿Qué hace?**

1. Backup de DEV (seguridad)
2. Exporta SOLO datos de PROD (no estructura)
3. Limpia datos de DEV
4. Importa datos de PROD a DEV
5. Verifica integridad

**Resultado**: DEV tiene estructura actual + datos reales de PROD

**Usuario**: Ejecuta como `sudo -u postgres` (superusuario PostgreSQL)

---

### 🚀 **ESCENARIO 2: Desplegar a PRODUCCIÓN**

> Aplicar cambios de estructura (migraciones) a producción SIN tocar datos

**Script**: `database/scripts/scenario_2_deploy_to_prod.sh`
**VSCode Task**: "🚀 ESCENARIO 2: Desplegar a PRODUCCIÓN"

**¿Qué hace?**

1. Backup OBLIGATORIO de PROD
2. Aplica migraciones del directorio `tested/`
3. Solo modifica ESTRUCTURA (tablas, columnas, índices)
4. NO toca los datos existentes
5. Mueve migraciones aplicadas a `applied/`
6. Ofrece reiniciar PM2

**Resultado**: PROD tiene nueva estructura + datos intactos

**Usuario**: Ejecuta como `sudo -u postgres` para aplicar migraciones

---

### 📁 Estructura de Directorios de Migraciones

```
database/
├── migrations/
│   ├── development/      # 📝 Trabajo activo (migraciones en desarrollo)
│   ├── tested/          # ✅ Probadas en DEV (listas para PROD)
│   ├── applied/         # 📦 Aplicadas en PROD (archivo histórico)
│   │   └── archive/     # 🗄️ Migraciones antiguas (>3 meses)
│   └── *.sql           # ❌ NUNCA dejar archivos sueltos aquí
├── schemas/             # Definiciones de esquema base
└── seeds/              # Datos de prueba
```

---

### 🛠️ Workflow de Desarrollo Completo

**Fase 1: Preparación**

```bash
# Tarea: "📥 ESCENARIO 1: Sincronizar PROD → DEV"
# Trae datos reales de PROD a DEV
```

**Fase 2: Desarrollo**

```bash
# Tarea: "➕ Crear Nueva Migración"
# Crea: database/migrations/development/YYYYMMDDHHMMSS_descripcion.sql

# IMPORTANTE: Solo cambios de estructura, nunca DELETE/UPDATE de datos
```

**Fase 3: Aplicación en DEV**

```bash
# Tarea: "🔧 Aplicar Migraciones en DEV"
# Aplica migraciones de development/ a cuentassik_dev
```

**Fase 4: Promoción a Tested**

```bash
# Tarea: "✅ Promover a Tested"
# Mueve migración probada de development/ a tested/
```

**Fase 5: Despliegue a PROD**

```bash
# Tarea: "🚀 ESCENARIO 2: Desplegar a PRODUCCIÓN"
# Aplica migraciones de tested/ a cuentassik_prod
```

📚 **Flujo detallado**: [docs/FLUJO_DESARROLLO_PRODUCCION.md](docs/FLUJO_DESARROLLO_PRODUCCION.md)
📚 **Sistema completo**: [docs/SISTEMA_MIGRACIONES_FINAL.md](docs/SISTEMA_MIGRACIONES_FINAL.md)

---

## ⚙️ Gestión de Procesos - PM2

### Proceso de Producción

**Configuración:**

- **Nombre**: `cuentassik-prod`
- **ID**: 0
- **Puerto**: 3000
- **Usuario sistema**: `www-data` (ejecuta Node.js + Next.js)
- **Base de datos**: `cuentassik_prod` (conexión vía DATABASE_URL con `cuentassik_user`)
- **Script**: `npm start` (Next.js standalone)

**Comandos comunes (usar MCP Shell):**

```typescript
// Ver estado
mcp_shell_execute_command('pm2 status');

// Reiniciar aplicación
mcp_shell_execute_command('pm2 restart cuentassik-prod');

// Ver logs (últimas 50 líneas)
mcp_shell_execute_command('pm2 logs cuentassik-prod --lines 50');

// Ver logs en tiempo real
mcp_shell_execute_command('pm2 logs cuentassik-prod');

// Información detallada
mcp_shell_execute_command('pm2 info cuentassik-prod');
```

**⚠️ IMPORTANTE**:

- El usuario `www-data` es del sistema operativo, NO de PostgreSQL
- La aplicación se conecta a PostgreSQL usando `cuentassik_user` (en DATABASE_URL)
- Las migraciones NUNCA se aplican desde la app, siempre con scripts dedicados

---

## 📋 VSCode Tasks - 22 Tasks Organizadas

Todas las operaciones comunes están disponibles como tareas de VSCode.

**Acceso**: `Ctrl+Shift+P` → `Tasks: Run Task`

### Categorías principales:

**🔄 ESCENARIO 1** (Sincronización PROD→DEV)

- `📥 ESCENARIO 1: Sincronizar PROD → DEV`
- `📊 ESCENARIO 1: Ver estado sincronización`
- `🔍 ESCENARIO 1: Verificar diferencias PROD/DEV`

**🚀 ESCENARIO 2** (Despliegue a PROD)

- `🚀 ESCENARIO 2: Desplegar a PRODUCCIÓN`
- `📦 ESCENARIO 2: Backup manual PROD`
- `📊 ESCENARIO 2: Estado migraciones PROD`
- `🔄 ESCENARIO 2: Reiniciar PM2`

**📦 Gestión de Migraciones**

- `➕ Crear Nueva Migración`
- `🔧 Aplicar Migraciones en DEV`
- `✅ Promover a Tested`
- `📋 Listar Migraciones por Estado`
- `🔍 Ver Última Migración Aplicada`

**�� PM2 Producción**

- `🚀 PM2: Reiniciar producción`
- `📊 PM2: Estado`
- `📋 PM2: Logs (últimas 50 líneas)`

**🏗️ Build y Deploy**

- `🏗️ Build Producción`
- `🧪 Build + Verificar`
- `🔄 Deploy completo (Build + PM2 restart)`

📚 **Referencia completa**: [.vscode/tasks.json](.vscode/tasks.json)

---

## 🔧 Convenciones de Código

### Nombres y Estructura

- **Variables/Funciones**: `camelCase` → `getMonthlyTotals`, `createTransaction`
- **Componentes/Tipos**: `PascalCase` → `TransactionForm`, `Transaction`
- **Constantes globales**: `SCREAMING_SNAKE_CASE`
- **Rutas Next**: `kebab-case` → `/app/expenses`
- **SQL**: `snake_case` → `household_id`, `occurred_at`
- **Tablas**: Plurales → `transactions`, `categories`

### Archivos

- **Componentes**: `PascalCase.tsx` → `TransactionForm.tsx`
- **Hooks/utils**: `camelCase.ts` → `useToast.ts`
- **Acciones**: `actions.ts` por ruta
- **Esquemas Zod**: `schema.ts` junto al formulario

### Imports

- **Absolutos**: Usar alias `@/` (configurado en `tsconfig.json`)
- **Tipos**: `import type { ... } from '...'`
- **NO usar imports relativos ascendentes** (`../`)

### Server Actions (Patrón Obligatorio)

Usar helper `lib/result.ts`:

```typescript
export type Ok<T = unknown> = { ok: true; data?: T };
export type Fail = { ok: false; message: string; fieldErrors?: Record<string, string[]> };
export type Result<T = unknown> = Ok<T> | Fail;

export const ok = <T>(data?: T): Ok<T> => ({ ok: true, data });
export const fail = (message: string, fieldErrors?: Record<string, string[]>): Fail => ({
  ok: false,
  message,
  fieldErrors,
});
```

**Ejemplo de Server Action:**

```typescript
'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { ok, fail } from '@/lib/result';
import type { Result } from '@/lib/result';

export async function createTransaction(formData: FormData): Promise<Result> {
  const parsed = TransactionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
  }

  // Lógica de negocio
  // ...

  revalidatePath('/app/expenses');
  return ok();
}
```

**Reglas**:

- Validación con `zod.safeParse` SIEMPRE
- Retornar `Promise<Result<T>>` con tipo explícito
- `revalidatePath()` tras mutaciones exitosas
- NO lanzar excepciones (salvo errores no recuperables)

---

## 📝 Modelo de Datos

Ver documentación completa en los archivos originales del proyecto.

**Tablas principales**: 15 tablas core

**Sistema de contribuciones**: `member_incomes`, `household_settings`, `contributions`, `contribution_adjustments`

**Sistema de períodos**: `monthly_periods`, `period_access_log`

**Sistema de créditos**: `member_credits` con decisión mensual flexible

**Sistema de ahorro**: `household_savings`, `savings_transactions`

📚 **Schema completo**: Ver backup `copilot-instructions.md.backup_*` para detalles extensos

---

## 🔍 Testing

### Estrategia Pragmática

- **Unit (Vitest)**: Utilidades puras → `lib/date.ts`, `lib/format.ts`
- **Componentes críticos**: `TransactionForm`, `MonthSelector`
- **NO testear**: Integraciones PostgreSQL profundas (confiar en DB constraints)

### Qué testear

✅ `lib/date.ts` → rangos de mes, formateo
✅ `lib/format.ts` → formateo de moneda y fechas
✅ `TransactionForm` → validación Zod, submit
❌ Server Actions con PostgreSQL (confiar en constraints + transacciones)
❌ Componentes de shadcn/ui (ya testeados upstream)

---

## 🚀 Despliegue y Operaciones

### Entornos

**Desarrollo**:

- Puerto: 3001
- Comando: `npm run dev`
- Base de datos: `cuentassik_dev`
- Usuario ejecutor: `kava`

**Producción**:

- Puerto: 3000
- Comando: `npm start` (vía PM2)
- Base de datos: `cuentassik_prod`
- Usuario ejecutor: `www-data` (proceso PM2)
- Gestión: `pm2 restart cuentassik-prod`

### Variables de Entorno

**Archivo ejemplo**: `.env.example`

```bash
# Base de datos
DATABASE_URL="postgresql://cuentassik_user:PASSWORD@localhost:5432/cuentassik_prod"

# JWT
JWT_SECRET="your-super-secret-jwt-key"

# SMTP
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="email@example.com"
SMTP_PASS="app-password"
```

⚠️ **NO subir** `.env.local` ni `.env.production.local` al repositorio

---

## 🎯 Referencias Clave

### Documentación del Proyecto

- **Sistema de migraciones**: [database/README.md](database/README.md)
- **Flujo desarrollo/producción**: [docs/FLUJO_DESARROLLO_PRODUCCION.md](docs/FLUJO_DESARROLLO_PRODUCCION.md)
- **Sistema migraciones final**: [docs/SISTEMA_MIGRACIONES_FINAL.md](docs/SISTEMA_MIGRACIONES_FINAL.md)
- **Tasks VSCode**: [.vscode/tasks.json](.vscode/tasks.json)

### Repositorio

- **GitHub**: `Kavalieri/CuentasSiK`
- **Branch principal**: `main`
- **Ubicación local**: `/home/kava/workspace/proyectos/CuentasSiK/repo`

---

## ✅ Checklist al Implementar Nueva Funcionalidad

1. ✅ Usa `getUserHouseholdId()` para obtener el hogar activo
2. ✅ Filtra TODAS las consultas por `household_id`
3. ✅ Valida input con Zod en Server Actions
4. ✅ Usa `revalidatePath()` tras mutaciones
5. ✅ Mantén el código compilando
6. ✅ Si modificas DB, crea migración en `development/`
7. ✅ Prueba en DEV antes de promocionar a `tested/`
8. ✅ Usa MCPs para Git, GitHub y comandos Shell

---

## 🔴 PROHIBICIONES

❌ **NUNCA usar Supabase MCPs** (proyecto migrado a PostgreSQL directo)
❌ **NUNCA usar Vercel MCPs** (deploy en servidor propio con PM2)
❌ **NUNCA aplicar migraciones desde la aplicación** (solo scripts dedicados)
❌ **NUNCA usar `run_in_terminal` para Git** (usar `mcp_git_*`)
❌ **NUNCA asumir un solo hogar** (sistema multi-hogar activo)
❌ **NUNCA modificar datos en archivos de migración** (solo estructura)

---

**🔥 ESTAS INSTRUCCIONES SON LA GUÍA PRINCIPAL DEL PROYECTO 🔥**

_Para detalles arquitectónicos completos, ver documentación en `docs/` y archivo original de instrucciones (backup)._
