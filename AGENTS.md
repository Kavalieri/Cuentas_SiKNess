# CuentasSiK - AI Agent Instructions

Este archivo define las instrucciones para agentes de IA trabajando en el proyecto **CuentasSiK**.

**Proyecto**: Aplicación web de gestión de gastos compartidos para parejas
**Stack**: Next.js 14+ (App Router), TypeScript, PostgreSQL nativo, Tailwind CSS, shadcn/ui
**Deploy**: PM2 en servidor propio (NO Vercel, NO Supabase)
**Repositorio**: `Kavalieri/CuentasSiK`

---

## � Instrucciones Específicas por Carpeta (Nested AGENTS.md)

Este proyecto usa **nested AGENTS.md files** (VS Code v1.105+):

- **`/AGENTS.md`** (este archivo) - Instrucciones generales del proyecto
- **`/app/AGENTS.md`** - Instrucciones específicas para código Next.js/React
- **`/database/AGENTS.md`** - Instrucciones para migraciones y schema PostgreSQL

**Configuración requerida**: En `.vscode/settings.json`:

```json
{
  "chat.useNestedAgentsMdFiles": true
}
```

Cuando trabajes en una carpeta específica, **las instrucciones de su AGENTS.md tienen prioridad** sobre las generales.

---

## 🚨 REGLA #1: USAR HERRAMIENTAS CORRECTAS

**OBLIGATORIO** usar las herramientas apropiadas para cada tarea específica.

### 📝 **PARA EDICIÓN DE ARCHIVOS**: Built-in VS Code Tools

| ✅ SIEMPRE USAR                            | ❌ NUNCA USAR                  |
| ------------------------------------------ | ------------------------------ |
| `create_file` - Crear archivos nuevos      | MCPs para crear archivos       |
| `read_file` - Leer contenido               | MCPs para leer archivos        |
| `replace_string_in_file` - Editar archivos | MCPs para editar archivos      |
| `list_dir` - Listar directorios            | MCPs para navegación           |
| `file_search` - Buscar archivos            | MCPs para búsqueda de archivos |

### 🔄 **PARA OPERACIONES GIT**: MCPs Git OBLIGATORIOS

| ✅ SIEMPRE USAR MCP                      | ❌ NUNCA USAR                       |
| ---------------------------------------- | ----------------------------------- |
| `mcp_git_git_commit({ message: "..." })` | `run_in_terminal("git commit ...")` |
| `mcp_git_git_push()`                     | `run_in_terminal("git push")`       |
| `mcp_git_git_status()`                   | `run_in_terminal("git status")`     |
| `mcp_git_git_add({ files: "." })`        | `run_in_terminal("git add .")`      |

**Si el usuario dice "usa las herramientas correctas"**, significa que olvidaste esta regla. **Disculpate y corrígelo inmediatamente**.

### MCPs Disponibles y Activos

#### Git MCP (mcp*git*\*)

**Uso**: SIEMPRE para operaciones Git - NO usar `run_in_terminal` para git

- `mcp_git_git_status()` - Ver estado del repositorio
- `mcp_git_git_add()` - Stagear archivos
- `mcp_git_git_commit({ message })` - Commits
- `mcp_git_git_push()` - Push a remoto
- `mcp_git_git_pull()` - Pull desde remoto
- `mcp_git_git_branch()` - Gestión de branches
- `mcp_git_git_log()` - Ver historial
- `mcp_git_git_diff()` - Ver cambios

#### GitHub MCP (mcp*github*\*)

- `mcp_github_push_files()` - Push múltiples archivos en un commit
- Gestión de PRs, issues, workflows

#### Shell MCP (mcp_shell_execute_command)

```typescript
mcp_shell_execute_command('npm run build');
mcp_shell_execute_command('npm install');
mcp_shell_execute_command('pm2 restart cuentassik-prod');
```

#### Documentación MCPs

- `mcp_upstash_conte_get-library-docs()` - Documentación actualizada de librerías
- `mcp_microsoft_doc_*` - Documentación Microsoft/Azure

---

## 🔐 Base de Datos - PostgreSQL Nativo

**⚠️ IMPORTANTE**: Este proyecto usa PostgreSQL DIRECTO, NO Supabase

### Usuarios de Base de Datos

1. **`postgres`** (Superusuario PostgreSQL)

   - Administración del servidor PostgreSQL
   - Usado con `sudo -u postgres` (sin contraseña)

2. **`cuentassik_user`** ⭐ (Usuario de la aplicación - PRINCIPAL)
   - Owner de las bases de datos `cuentassik_dev` y `cuentassik_prod`
   - Privilegios: `SELECT, INSERT, DELETE, UPDATE` en TODAS las tablas
   - Usado en:
     - Aplicación Next.js (DATABASE_URL en .env)
     - Migraciones (aplicar cambios de estructura)
     - Scripts de sincronización
     - Queries manuales

### Bases de Datos

- **DEV**: `cuentassik_dev` (desarrollo local)
- **PROD**: `cuentassik_prod` (producción con PM2)

### Acceso a Base de Datos

**Para consultas SQL usar la abstracción `query()`:**

```typescript
import { query } from '@/lib/supabaseServer';

// Consulta simple
const result = await query(
  `
  SELECT * FROM transactions
  WHERE household_id = $1
  ORDER BY occurred_at DESC
`,
  [householdId],
);

// result.rows contiene los datos
console.log(result.rows);
```

**NO usar comandos psql directos. Usar `query()` en el código.**

📚 **Documentación completa**: [database/README.md](database/README.md)

---

## 🔄 Sistema de Migraciones

### Estructura de Directorios

```
database/
├── migrations/
│   ├── development/      # 📝 Trabajo activo
│   ├── tested/          # ✅ Probadas en DEV (listas para PROD)
│   ├── applied/         # 📦 Aplicadas en PROD (archivo histórico)
│   └── schemas/         # Definiciones de esquema base
```

### Dos Escenarios Principales

#### ESCENARIO 1: Sincronizar PROD → DEV

Copiar datos de producción a desarrollo para trabajar con datos reales.

**VSCode Task**: "🔄 ESCENARIO 1: Sincronizar PROD → DEV"

**Qué hace:**

1. Backup de DEV (seguridad)
2. Exporta SOLO datos de PROD (no estructura)
3. Limpia datos de DEV
4. Importa datos de PROD a DEV
5. Verifica integridad

#### ESCENARIO 2: Desplegar a PRODUCCIÓN

Aplicar cambios de estructura (migraciones) a producción SIN tocar datos.

**VSCode Task**: "🚀 ESCENARIO 2: Desplegar a PRODUCCIÓN"

**Qué hace:**

1. Backup OBLIGATORIO de PROD
2. Aplica migraciones del directorio `tested/`
3. Solo modifica ESTRUCTURA (tablas, columnas, índices)
4. NO toca los datos existentes
5. Mueve migraciones aplicadas a `applied/`
6. Ofrece reiniciar PM2

### Workflow de Desarrollo

1. **Preparación**: Ejecutar ESCENARIO 1 (traer datos reales de PROD a DEV)
2. **Desarrollo**: Crear migración en `development/`
3. **Aplicación**: Aplicar en DEV y probar
4. **Promoción**: Mover a `tested/` cuando funcione
5. **Despliegue**: Ejecutar ESCENARIO 2 (aplicar a PROD)

📚 **Flujo detallado**: [docs/FLUJO_DESARROLLO_PRODUCCION.md](docs/FLUJO_DESARROLLO_PRODUCCION.md)

---

## ⚙️ Gestión de Procesos - PM2

### Proceso de Producción

- **Nombre**: `cuentassik-prod`
- **Puerto**: 3000
- **Usuario sistema**: `www-data`
- **Base de datos**: `cuentassik_prod`
- **Script**: `npm start`

### Comandos PM2 (usar MCP Shell)

```typescript
// Ver estado
mcp_shell_execute_command('pm2 status');

// Reiniciar aplicación
mcp_shell_execute_command('pm2 restart cuentassik-prod');

// Ver logs
mcp_shell_execute_command('pm2 logs cuentassik-prod --lines 50');
```

---

## 🔧 Convenciones de Código

### Nomenclatura

- **Variables/Funciones**: `camelCase` → `getMonthlyTotals`, `createTransaction`
- **Componentes/Tipos**: `PascalCase` → `TransactionForm`, `Transaction`
- **Constantes**: `SCREAMING_SNAKE_CASE`
- **Rutas Next**: `kebab-case` → `/app/expenses`
- **SQL**: `snake_case` → `household_id`, `occurred_at`
- **Tablas**: Plurales → `transactions`, `categories`

### Imports

- Usar alias `@/` (configurado en `tsconfig.json`)
- Tipos: `import type { ... } from '...'`
- NO usar imports relativos ascendentes (`../`)

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

**Ejemplo:**

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

  // Lógica de negocio...

  revalidatePath('/app/expenses');
  return ok();
}
```

**Reglas:**

- Validación con `zod.safeParse` SIEMPRE
- Retornar `Promise<Result<T>>` con tipo explícito
- `revalidatePath()` tras mutaciones exitosas
- NO lanzar excepciones (salvo errores no recuperables)

---

## 📋 VSCode Tasks Disponibles

Todas las operaciones comunes están disponibles como tareas de VSCode.

**Acceso**: `Ctrl+Shift+P` → `Tasks: Run Task`

### Categorías:

**🔄 ESCENARIO 1** (Sincronización PROD→DEV)

- `📥 ESCENARIO 1: Sincronizar PROD → DEV`
- `📊 ESCENARIO 1: Ver estado sincronización`
- `🔍 ESCENARIO 1: Verificar diferencias PROD/DEV`

**🚀 ESCENARIO 2** (Despliegue a PROD)

- `🚀 ESCENARIO 2: Desplegar a PRODUCCIÓN`
- `📦 ESCENARIO 2: Backup manual PROD`
- `📊 ESCENARIO 2: Estado migraciones PROD`

**📦 Gestión de Migraciones**

- `➕ Crear Nueva Migración`
- `🔧 Aplicar Migraciones en DEV`
- `✅ Promover a Tested`

**🎮 PM2 Producción**

- `🚀 PM2: Reiniciar producción`
- `📊 PM2: Estado`
- `📋 PM2: Logs`

**🏗️ Build y Deploy**

- `🏗️ Build Producción`
- `🔄 Deploy completo`

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

## 📚 Referencias Clave

- **Sistema de migraciones**: [database/README.md](database/README.md)
- **Flujo desarrollo**: [docs/FLUJO_DESARROLLO_PRODUCCION.md](docs/FLUJO_DESARROLLO_PRODUCCION.md)
- **Tasks VSCode**: [.vscode/tasks.json](.vscode/tasks.json)
- **Repositorio**: `Kavalieri/CuentasSiK` (branch `main`)

---

**🔥 ESTE ARCHIVO ES LA GUÍA PRINCIPAL DEL PROYECTO 🔥**
