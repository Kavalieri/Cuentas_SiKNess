# CuentasSiK · GitHub Copilot Instructions

**CuentasSiK** - Aplicación web de gestión de gastos compartidos para parejas con doble flujo de datos.

**Responder siempre en ESPAÑOL**

> 📚 Consulta los archivos `AGENTS.md` (nested) para reglas completas.
>
> - `AGENTS.md` · Reglas generales de proyecto
> - `app/AGENTS.md` · Código Next.js / React (App Router)
> - `database/AGENTS.md` · Migraciones PostgreSQL
> - `components/AGENTS.md` · UI compartida
> - `lib/AGENTS.md` · Helpers de servidor y acceso a DB
> - `scripts/AGENTS.md` · Scripts operativos (PM2, migraciones, backups)
> - `docs/AGENTS.md` · Lineamientos de documentación
> - `types/AGENTS.md` · Contratos y DTOs
> - `contexts/AGENTS.md` · React Context + hooks asociados

📚 **Migraciones**: [../database/README.md](../database/README.md)

📚 **Gestor de los entornos**: [../docs/PM2_SISTEMA_COMPLETO.md](../docs/PM2_SISTEMA_COMPLETO.md)
📚 **Gestión de la base de datos**: [../docs/POSTGRESQL_SISTEMA_COMPLETO.md](../docs/POSTGRESQL_SISTEMA_COMPLETO.md)
📚 **DB Seed**: [../database/migrations/applied/20251014_150000_seed.sql](../database/migrations/applied/20251014_150000_seed.sql)

📚 **Tareas VS Code**: [../.vscode/tasks.json](../.vscode/tasks.json) - **25 tareas disponibles**
- 🎮 **PM2** (8 tareas): Iniciar/Detener/Reiniciar DEV y PROD (con archivado logs)
- 📊 **Monitoreo** (4 tareas): Ver logs (50 líneas o tiempo real), estado general
- 🗄️ **Migraciones** (7 tareas): Crear, estado, comparar, aplicar (DEV/PROD/TEST), rollback
- 🔄 **Types** (2 tareas): Regenerar automáticamente o manual (DEV/PROD)
- 🗄️ **Database** (1 tarea): Verificación estado

📚 **Sistema de Scripts v3.0.0** (Issue #53):
- `scripts/PM2_build_and_deploy_and_dev/` - 8 scripts PM2 + build
- `scripts/migrations/` - 7 scripts migraciones (create, apply, status, diff, rollback, baseline, generate-types)

---

## Sistema troncal a mantener funcional

1. Los ingresos serán tipo "ingreso" (Flujo común)
2. Los gastos serán tipo "gasto" (Flujo común)
3. Los Ingresos directos serán tipo "ingreso directo" (flujo directo)
4. Los gastos directos serán tipo "gasto directo" (flujo directo)
5. Todos los movimientos directos de ingreso deben tener un miembro que realiza el gasto "de su bolsillo" y pretende introducirlo como gasto común.
6. Todos los movimientos de flujo directo van siempre en bloque, y se documenta exclusivamente mediante el gasto realizado, siendo el sistema el que realiza el ingreso de ese miembro a nombre. El gasto dependerá del objeto de ese gasto.
7. Nos aseguraremos de añadir un campo adicional que identifique el flujo al que pertenece esa transacción.

## Workflow guiado y uso de la aplicación

1. Registro o inicio de sesión con Google OAuth 2.0
2. Creación o unión a un hogar (household) si no pertenece ya a uno

### Procesos realizados por el owner.

1. Validación de ingresos de cada miembro y validación de objetivo común
2. Cada miembro indica sus gastos directos previos
3. Se calcula y valida el % de aportación de cada miembro en función del tipo seleccionado, proporcional al ingreso, iguales, personalizado...
4. Se espera a que todos los miembros hayan aportado la parte restante una vez restados los gastos directos de ese usuario al cálculo de su aportación
5. Se validan las aportaciones y se abre el periodo para empezar a descontar fondos o ingresar si procede. También pude haber nuevos gastos directos que ya no se descontarán de la aportación.
6. Termina el mes y se insta al cierre, validando todas las transacciones realizadas, viendo si las cuentas cuadran con las cuentas reales.
7. Puede ver todos los informes, resúmenes, transacciones, etc.

### Procesos realizados por el member.

1. Informar sus ingresos
2. Incluir sus gastos directos.
3. Informar cuando ha realizado la aportación a la cuenta conjunta total o parcial
4. Incluir sus propios gastos desde la cuenta común o informar de ingresos, todos deben validarse por el owner.
5. Ver todos los informes, resúmenes, transacciones, etc.

## UI y UIX

1. Modo oscuro / claro (next-themes)
2. Diseño responsive (móvil vertical prioritario, tablet, desktop)
3. Navegación sencilla e intuitiva con tabs y topbar
4. Formularios con validación y feedback inmediato (zod + react-hook-form)
5. Uso de componentes accesibles (shadcn/ui + Radix UI)
6. Feedback visual para acciones (toasts, loaders)
7. Resúmenes visuales con gráficos (opcional, p.ej. Chart.js o similar)
8. Consistencia visual y UX fluida
9. Accesibilidad (roles ARIA, labels, etc.)
10. Evitar redundancias y pasos innecesarios
11. Mensajes de error claros y útiles

---

## ⚠️ Política de ejecución en este repo:

- NO hacer build en producción salvo petición explícita del usuario.
- El servidor DEV está siempre encendido con recarga en caliente; usa las Tareas VS Code para reiniciarlo o ver los logs si es necesario.
- Si necesitas reiniciar DEV o PROD, usa exclusivamente las tareas definidas (no ejecutes comandos manuales). Ver `.vscode/tasks.json`.
- **✅ USAR MCPs Git/GitHub**: Para todas las operaciones git (commit, push, status, etc.)
- **❌ NO USAR `run_in_terminal` para Git**: Los comandos git SIEMPRE mediante MCPs
- Si algún elemento documentado resulta no ser cierto, editar actualizando al estado real o deprecar archivando.
- Revisar tareas pendientes en GitHub Issues y actualizar su estado. Issues cerrados con documentación en `docs/`.
- Documentar cualquier cambio en la estructura del proyecto o en las dependencias en los `AGENTS.md` y `/docs`
- npm run lint y npm run typecheck para validar compilación, **NO BUILD**
- ❌ **NUNCA usar Supabase MCPs** (proyecto migrado a PostgreSQL directo)
- ❌ **NUNCA usar Vercel MCPs** (deploy en servidor propio con PM2)
- ❌ **NUNCA aplicar migraciones desde la aplicación** (usar `/scripts` y `.vscode/tasks.json` dedicados)
- ❌ **NO USAR**: Archivos de documentación .md en la raíz (excepto README.md, CHANGELOG.md, CONTRIBUTING.md, LICENSE) (usar directorio `docs/`)

---

## 🔄 Sistema de Auto-generación de Types (Issue #8 ✅ - Issue #10 ✅)

**Estado**: ✅ **COMPLETADO Y FUNCIONAL**

### TypeScript Types Autogenerados

Los types de base de datos se generan **automáticamente** desde el schema PostgreSQL usando `kysely-codegen`.

**Archivo generado**: `types/database.generated.ts`
- **Líneas**: ~1,013 (43 tablas + enums)
- **Formato**: Kysely (interfaces TypeScript)
- **Source of truth**: Schema PostgreSQL
- **Mantenimiento**: ✅ CERO (100% automático)

### Regeneración Automática en Migraciones

Cuando aplicas una migración, **los types se regeneran automáticamente**:

```bash
./scripts/migrations/apply_migration.sh dev mi_migracion.sql

# Output:
✅ Migración aplicada exitosamente (125ms)
🔄 Regenerando types TypeScript desde esquema PostgreSQL...
✅ Types regenerados exitosamente
```

**Beneficios**:
- ✅ Sincronización automática schema ↔ types
- ✅ Compilación TypeScript siempre limpia
- ✅ Cero mantenimiento manual
- ✅ JSDoc completo desde comentarios SQL

### Regeneración Manual (cuando sea necesario)

```bash
# DEV
npm run types:generate:dev

# PROD
npm run types:generate:prod
```

**VS Code Tasks disponibles**:
- `🔄 Regenerar Types (DEV)`
- `🔄 Regenerar Types (PROD)`

**Documentación completa**: `docs/ISSUE_8_AUTO_GENERACION_TYPES.md`

---

## 🔄 Migración Gradual database.ts → database.generated.ts (Issue #11)

**REGLA OBLIGATORIA AL EDITAR CÓDIGO**:

Si tocas un archivo que importa `@/types/database`, debes migrarlo a `@/types/database.generated` en el mismo commit.

### Por Qué:
- ✅ `database.generated.ts`: Auto-generado desde PostgreSQL, siempre sincronizado
- ❌ `database.ts`: Manual, formato Supabase legacy, puede quedar obsoleto

### Cómo Migrar:

```typescript
// ❌ ANTES (database.ts):
import type { Database } from '@/types/database';
type Transaction = Database['public']['Tables']['transactions']['Row'];

// ✅ DESPUÉS (database.generated.ts):
import type { Transactions } from '@/types/database.generated';
```

**Cambios típicos:**
1. Import: `database` → `database.generated`
2. Type: `Database['public']['Tables']['X']['Row']` → `X` (tabla en PascalCase)
3. Eliminar tipos Insert/Update si no se usan

### Workflow:
1. Abres archivo para editar (ej: `lib/periods.ts`)
2. Detectas: `import type { Database } from '@/types/database'`
3. **PRIMERO**: Migrar tipos (commit independiente)
4. **DESPUÉS**: Hacer cambios solicitados

### Validación:
```bash
npm run typecheck  # Debe pasar sin errores
npm run lint       # Debe pasar sin warnings
```

**Tracking**: Ver `docs/MIGRATION_TYPES_PROGRESS.md` para lista completa.

📚 **Documentación completa**: Issue #11

---

## 🏗️ Stack vigente

- Next.js 14+ (App Router, Server Actions/Client Components, React 18+)
- TypeScript estricto
- PostgreSQL nativo (Types, tables, views, materialized views, sequences, functions, triggers, rcp, rls)⚠️ **NO Supabase, NO Vercel**
- Tailwind CSS + shadcn/ui + Radix UI
- Servicios gestionados con PM2 en servidor propio
- next-themes (dark/light mode)

---

## ✅ Checklist al Implementar Nueva Funcionalidad

1. Contexto de usuario
   Obtén el hogar activo con `getUserHouseholdId()` (y, cuando aplique, la función para obtener el **periodo** vigente).

2. Alcance de datos
   **Filtra todas las consultas** por `household_id` **y** por **periodo**.

3. Validación y resultado
   **Valida inputs con Zod** en Server Actions.
   Devuelve un **`Result`** consistente (`ok` / `fail`) según la validación.

4. Compatibilidad de esquema
   Cubre diferencias **legacy vs dual-flow** inspeccionando `information_schema` cuando sea necesario.

5. Cambios de base de datos
   Si hay cambios de estructura, **crea una migración en `development/`**.

6. Efectos secundarios de caché/rutas
   Tras mutaciones, ejecuta **`revalidatePath()`** en las rutas afectadas.

7. Calidad del código
   Mantén **typecheck** y **linters** en verde.**No hagas build de producción** salvo que se solicite explícitamente.

8. Entornos y despliegue
   **Prueba en `DEV`** antes de promocionar a **`tested/`**.

9. Operación y tareas
   Evita reinicios manuales: configura **tareas de VS Code** para PM2/servers y otros comandos repetibles.

---

## Variables de entorno únicas

     ```bash
     # .env.development.local
     DATABASE_URL="postgresql://cuentassik_user:PASSWORD@localhost:5432/cuentassik_dev"

     # .env.production.local
     DATABASE_URL="postgresql://cuentassik_user:PASSWORD@localhost:5432/cuentassik_prod"
     ```

**BASES DE DATOS:**

- **DEV**: `cuentassik_dev` (puerto 5432, desarrollo)
- **PROD**: `cuentassik_prod` (puerto 5432, producción)
- La aplicación se conecta a PostgreSQL usando `cuentassik_user` (en DATABASE_URL)

Ambas arrancadas automaticamente y gestionadas mediante PM2

**TABLA DE CONTROL:**

- `_migrations`: Rastreo de migraciones aplicadas (timestamp, filename, applied_at)

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

## 🔍 Testing

### Estrategia Pragmática

- **Unit (Vitest)**: Utilidades puras → `lib/date.ts`, `lib/format.ts`
- **Componentes críticos**: `TransactionForm`, `MonthSelector`
- **NO testear**: Integraciones PostgreSQL profundas (confiar en DB constraints)

### Qué testear

✅ `lib/date.ts` → rangos de mes, formateo
✅ `lib/format.ts` → formateo de moneda y fechas
✅ `TransactionForm` → validación Zod, submit

---

### Repositorio

- **GitHub**: `Kavalieri/CuentasSiK`
- **Branch principal**: `main`
- **Ubicación local**: `/home/kava/workspace/proyectos/CuentasSiK/repo`

---

**🔥 ESTAS INSTRUCCIONES SON LA GUÍA PRINCIPAL DEL PROYECTO 🔥**

_Para detalles arquitectónicos completos, ver documentación en `docs/` y los archivos `AGENTS.md` (nested) de cada directorio ._
