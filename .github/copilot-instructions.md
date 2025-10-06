# CuentasSiK - AI Coding Agent Instructions

## � REGLAS CRÍTICAS - LEER PRIMERO 🚨

### ⚠️ **REGLA #1: SIEMPRE USAR MCPs (Model Context Protocol)**

**PROHIBIDO** usar comandos CLI manuales cuando existe un MCP equivalente:

| ❌ NUNCA USAR | ✅ SIEMPRE USAR MCP |
|---------------|---------------------|
| `run_in_terminal("supabase db push")` | `mcp_supabase_apply_migration()` |
| `run_in_terminal("git commit ...")` | `mcp_git_git_commit()` |
| `run_in_terminal("git push")` | `mcp_git_git_push()` |
| `run_in_terminal("npm run build")` | `mcp_shell_execute_command("npm run build")` |
| Pedir al usuario ejecutar SQL | `mcp_supabase_execute_sql()` |
| Pedir al usuario verificar Vercel | `mcp_vercel_get_deployment()` |

**Si el usuario te dice "usa el MCP"**, significa que olvidaste esta regla. **Disculpate y corrígelo inmediatamente**.

---

## �🔧 Model Context Protocol (MCP) - PRIORIDAD ABSOLUTA

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

El sistema se basa en **15 tablas principales** con RLS habilitado:

**Core**:
1. **`households`**: Hogar compartido. Un usuario puede pertenecer a múltiples hogares.
   - Columnas nuevas ⭐: `status` (active/archived/deleted), `settings` (JSONB)
2. **`household_members`**: Relación many-to-many entre usuarios y hogares (con role: owner/member)
3. **`categories`**: Categorías de gastos/ingresos por hogar (tipo: `expense` | `income`)
   - **23 categorías predeterminadas**: 15 gasto + 8 ingreso (creadas por trigger automático)
4. **`transactions`**: Transacciones con ownership, estados y auditoría completa ⭐ REFACTORIZADO
   - **Ownership**: `paid_by` (quién pagó realmente)
   - **Split gastos**: `split_type` (none/equal/proportional/custom), `split_data` (JSONB config)
   - **Estados**: `status` (draft/pending/confirmed/locked)
   - **Rastreo origen**: `source_type` (manual/adjustment/recurring/import), `source_id` (UUID)
   - **Auditoría completa**: `created_by`, `updated_by`, `locked_at`, `locked_by`
   - **IMPORTANTE**: Transacciones locked (mes cerrado) NO son editables hasta reapertura

**Sistema de Contribuciones** (ver `docs/CONTRIBUTIONS_SYSTEM.md`):
5. **`member_incomes`**: Ingresos mensuales de cada miembro con historial
6. **`household_settings`**: Meta de contribución mensual del hogar
7. **`contributions`**: Contribuciones calculadas y rastreadas por miembro/mes
8. **`contribution_adjustments`**: Ajustes manuales a contribuciones con auditoría ⭐
   - Estados: `pending`, `active`, `applied`, `cancelled`, `locked`
   - Auditoría: `created_by`, `updated_by`, `locked_at`, `locked_by`
   - **IMPORTANTE**: Ajustes locked NO son editables

**Sistema de Períodos Mensuales** ⭐ NEW (ver `docs/IMPLEMENTATION_PLAN.md`):
9. **`monthly_periods`**: Gestión de cierre mensual con validación secuencial
   - Estados: `future`, `active`, `closing`, `closed`, `historical`
   - Validación: Mes anterior debe cerrarse antes de trabajar en siguiente
   - Columnas: `auto_close_enabled`, `reopened_count`, `closed_at`, `closed_by`, `last_reopened_at/by`
10. **`period_access_log`**: Auditoría completa de cierres/reaperturas de períodos

**Sistema de Créditos Miembros** ⭐ NEW:
11. **`member_credits`**: Créditos/débitos con decisión mensual flexible
   - Estados: `active`, `applied`, `transferred`, `expired`
   - **Decisión mensual**: `monthly_decision` (apply_to_month | keep_active | transfer_to_savings)
   - Columnas: `auto_apply` (bool), `transferred_to_savings` (bool), `savings_transaction_id`
   - Miembro decide al inicio de mes qué hacer con su crédito

**Sistema de Ahorro del Hogar** ⭐ NEW (ver `docs/SESSION_SUMMARY_2025-10-05_SISTEMA_AHORRO.md`):
12. **`household_savings`**: Fondo de ahorro común con metas opcionales
   - Balance tracking: `current_balance`, `goal_amount`, `goal_description`, `goal_deadline`
   - Un solo fondo por household (UNIQUE constraint)
13. **`savings_transactions`**: Historial completo de movimientos del fondo con trazabilidad profesional
   - Tipos: `deposit`, `withdrawal`, `transfer_from_credit`, `interest`, `adjustment`
   - Balance tracking: `balance_before`, `balance_after` (CONSTRAINT validación automática)
   - Rastreo: `source_profile_id`, `source_credit_id`, `destination_transaction_id`
   - Categorías opcionales: `emergency`, `vacation`, `home`, `investment`, `other`

**Sistema de Múltiples Hogares** (ver `docs/MULTI_HOUSEHOLD_IMPLEMENTATION_COMPLETE.md`):
14. **`user_settings`**: Configuración del usuario (active_household_id, preferences)
15. **`invitations`**: Sistema de invitaciones con RLS público para acceso sin login

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

### Sistema Refactorizado - 12 Migraciones Aplicadas ⭐ NEW

**Estado**: ✅ 12/12 migraciones aplicadas y verificadas el 5 octubre 2025

El sistema ha sido completamente refactorizado con 12 migraciones SQL que implementan:

1. **`add_transaction_ownership`** (5 oct):
   - Ownership: `paid_by` (UUID, quién pagó), `split_type` (none/equal/proportional/custom), `split_data` (JSONB)
   - Estados robustos: `status` (draft/pending/confirmed/locked) con CHECK constraint
   - Source tracking: `source_type` (manual/adjustment/recurring/import), `source_id` (UUID)
   - Auditoría: `created_by`, `updated_by`, `locked_at`, `locked_by`

2. **`create_member_credits`** (5 oct):
   - Tabla completa para créditos/débitos con estado y decisión flexible
   - Columnas: `amount`, `description`, `origin_date`, `status`, `auto_apply`, `monthly_decision`

3. **`enhance_monthly_periods`** (5 oct):
   - Mejorado con `auto_close_enabled`, `reopened_count`, `status` (future/active/closing/closed/historical)
   - Columnas auditoría: `closed_at`, `closed_by`, `last_reopened_at`, `last_reopened_by`

4. **`create_period_access_log`** (5 oct):
   - Auditoría completa de cierres/reaperturas con usuario y razón

5. **`enhance_contribution_adjustments`** (5 oct):
   - Agregado `status` (pending/active/applied/cancelled/locked)
   - Auditoría: `created_by`, `updated_by`, `locked_at`, `locked_by`
   - Relación con transactions para reajustes

6. **`enhance_households`** (5 oct):
   - Agregado `status` (active/archived/deleted)
   - `settings` JSONB para configuración flexible (currency, preferences)

7. **`create_period_functions`** (5 oct):
   - `ensure_monthly_period(household_id, year, month)`: Crea período si no existe, valida mes anterior cerrado
   - `close_monthly_period(period_id, closed_by, notes)`: Cierra mes, bloquea transactions/adjustments
   - `reopen_monthly_period(period_id, reopened_by, reason)`: Reabre mes, incrementa reopened_count
   - `apply_member_credits(household_id, year, month)`: Aplica créditos activos FIFO

8. **`update_rls_policies`** (5 oct):
   - RLS mejorado: Transactions/adjustments locked NO editables (solo owners pueden leer)
   - Policies validación: `status != 'locked'` en UPDATE/DELETE

9. **`create_savings_system`** (5 oct):
   - `household_savings`: Fondo de ahorro con `current_balance`, `goal_amount`, meta tracking
   - `savings_transactions`: Historial con `balance_before`, `balance_after`, CONSTRAINT validación

10. **`improve_member_credits_savings`** (5 oct):
    - `member_credits.monthly_decision` (apply_to_month/keep_active/transfer_to_savings)
    - `auto_apply` (bool), `transferred_to_savings` (bool), `savings_transaction_id` (relación)

11. **`seed_default_categories`** (5 oct):
    - Función `create_default_categories(household_id)`: Crea 23 categorías + household_savings
    - Trigger `on_household_created_create_categories`: Ejecuta automáticamente al INSERT household
    - **23 categorías**: 15 expense (Vivienda, Supermercado, Transporte, Restaurantes, Ocio, Salud, Educación, Menaje, Ropa, Mascotas, Regalos, Suscripciones, Deportes, Belleza, Varios) + 8 income (Nómina, Freelance, Inversiones, Ventas, Devoluciones, Aportación Cuenta Conjunta, Bonus, Varios)

12. **`create_savings_functions`** (5 oct):
    - `transfer_credit_to_savings(credit_id, transferred_by, notes)`: Transfiere crédito al fondo (200 LOC)
    - `withdraw_from_savings(household_id, amount, reason, withdrawn_by, ...)`: Retira con validación balance (150 LOC)
    - `deposit_to_savings(household_id, amount, profile_id, description, ...)`: Depósito manual (100 LOC)

### FASE 6: Server Actions con Auditoría Completa ⭐ COMPLETADA (6 oct)

**Estado**: ✅ 100% IMPLEMENTADO (commit 35511ee)

#### **Auditoría Transacciones** - expenses/actions.ts

**createTransaction() mejorado**:
```typescript
// 1. ensure_monthly_period automático ANTES de INSERT
const occurredDate = new Date(parsed.data.occurred_at);
const { data: periodId } = await supabase.rpc('ensure_monthly_period', {
  p_household_id: householdId,
  p_year: occurredDate.getFullYear(),
  p_month: occurredDate.getMonth() + 1,
});

// 2. INSERT con columnas auditoría
await supabase.from('transactions').insert({
  ...parsed.data,
  period_id: periodId,          // ⭐ Asocia a período mensual
  paid_by: profile.id,          // ⭐ Quién pagó realmente
  created_by: profile.id,       // ⭐ Auditoría
  source_type: 'manual',        // ⭐ Rastreo origen
  status: 'confirmed',          // ⭐ Estado inicial
});
```

**updateTransaction() mejorado** - expenses/edit-actions.ts:
```typescript
// 1. SELECT verificación estado locked
const { data: currentMovement } = await supabase
  .from('transactions')
  .select('*, household_id, status, locked_at, locked_by')
  .eq('id', transactionId)
  .single();

// 2. Validación locked (período cerrado)
if (currentMovement.status === 'locked' || currentMovement.locked_at) {
  return fail('No se puede editar una transacción de un período cerrado. Reabre el período primero.');
}

// 3. UPDATE con auditoría
await supabase.from('transactions').update({
  ...parsed.data,
  updated_by: profile.id,           // ⭐ Auditoría
  updated_at: new Date().toISOString()
});
```

**deleteTransaction() mejorado** ⭐ NEW - expenses/actions.ts:
```typescript
// Same pattern que updateTransaction:
// 1. SELECT verificación household + locked
// 2. Validación locked (fail si período cerrado)
// 3. DELETE solo si validaciones pasan
```

#### **Módulo Ahorro Completo** - app/savings/actions.ts (266 líneas)

**8 Server Actions implementadas**:

1. **transferCreditToSavings(creditId, notes?)**
   - RPC: `transfer_credit_to_savings(p_credit_id, p_transferred_by, p_notes)`
   - Schema: `TransferSchema`
   - Retorna: `{ savingsTransactionId: string }`

2. **withdrawFromSavings(amount, reason, categoryId?, createTransaction?)**
   - RPC: `withdraw_from_savings(p_household_id, p_amount, p_reason, p_withdrawn_by, p_create_common_transaction, p_category_id?, p_notes?)`
   - Schema: `WithdrawSchema`
   - Retorna: `{ savingsTransactionId: string, transactionId?: string }`

3. **depositToSavings(amount, profileId, description, category?)**
   - RPC: `deposit_to_savings(p_household_id, p_amount, p_source_profile_id, p_description, p_category, p_notes?, p_created_by)`
   - Schema: `DepositSchema`
   - Retorna: `{ savingsTransactionId: string }`

4. **getSavingsTransactions(params?)**: Query con filtros (type, startDate, endDate, profileId)

5. **getSavingsBalance()**: Retorna balance actual + goal tracking

6. **updateSavingsGoal(goalAmount, goalDeadline)**: UPDATE household_savings

7. **getSavingsHistory()**: Alias sin filtros para UI historial completo

8. **interestAccrualCheck()**: Admin-only, trigger manual cálculo interés

**Schemas Zod**:
```typescript
TransferSchema = z.object({ creditId: z.string().uuid(), notes: z.string().optional() });
WithdrawSchema = z.object({ amount, reason, categoryId?, createCommonTransaction });
DepositSchema = z.object({ amount, profileId, description, category? });
SavingsGoalSchema = z.object({ goalAmount?, goalDeadline?, goalDescription? });
```

#### **Fixes Seguridad Supabase** (Crítico)

**3 Migraciones SQL aplicadas via MCP**:

1. **fix_security_definer_views** (6 oct):
   - Recreadas 2 vistas SIN SECURITY DEFINER: `v_transactions_with_profile`, `v_period_stats`
   - **Impacto**: ✅ 2 ERRORES nivel ERROR eliminados
   - **Motivo**: SECURITY DEFINER bypassea RLS del usuario actual

2. **fix_all_functions_search_path_correct** (6 oct):
   - 41 funciones con `ALTER FUNCTION ... SET search_path = public, pg_temp`
   - **Impacto**: ✅ 36 WARNINGS eliminados
   - **Motivo**: Previene SQL injection via schema poisoning

3. **auth_leaked_password_protection** (Pendiente):
   - Estado: ⏳ Habilitar en Supabase Dashboard → Authentication → Providers → Email
   - Impacto: Bajo (usamos magic link sin contraseñas)

**Build final**: ✅ 26 rutas compiladas, 0 errores TypeScript, 0 warnings linting

**Documentación completa**:
- `docs/MAJOR_REFACTOR_TRANSACTIONS_SYSTEM.md`: Problemas identificados y solución propuesta
- `docs/IMPLEMENTATION_PLAN.md`: Plan de ejecución con SQL completo de las 12 migraciones
- `docs/SESSION_SUMMARY_2025-10-05_SISTEMA_AHORRO.md`: Resumen sesión sistema ahorro
- `docs/SESSION_SUMMARY_2025-10-06_FASE_6.md`: ⭐ Resumen sesión FASE 6 completa

**Estado DB**:
- ✅ 27 columnas nuevas verificadas existentes
- ✅ 9 funciones SQL verificadas existentes
- ✅ Trigger `on_household_created` funcional
- ✅ Tipos TypeScript regenerados (`types/database.ts`)
- ✅ WIPE ejecutado: Household "Casa Test", 2 miembros, 23 categorías auto, 1 household_savings balance 0
- ✅ Seguridad: 2 ERRORES + 36 WARNINGS eliminados (38/40 issues resueltos)

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
│  │  ├─ actions.ts            # Server Actions (CRUD transacciones)
│  │  ├─ schema.ts             # Zod schemas
│  │  └─ components/           # Componentes locales de esta ruta
│  │     ├─ TransactionForm.tsx
│  │     └─ TransactionList.tsx
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
- **Variables/Funciones**: `camelCase` → `getMonthlyTotals`, `createTransaction`
- **Componentes/Tipos**: `PascalCase` → `AddTransactionDialog`, `Transaction`
- **Constantes globales**: `SCREAMING_SNAKE_CASE`
- **Rutas Next**: `kebab-case` → `/app/expenses`
- **SQL**: `snake_case` → `household_id`, `occurred_at`
- **Tablas**: Plurales → `transactions`, `categories`, `household_members`
- **Índices**: Descriptivos → `idx_transactions_household_occurred_at_desc`

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

const TransactionSchema = z.object({
  household_id: z.string().uuid(),
  category_id: z.string().uuid().nullable(),
  type: z.enum(['expense','income']),
  amount: z.coerce.number().positive(),
  currency: z.string().min(1),
  description: z.string().optional(),
  occurred_at: z.coerce.date(),
  paid_by: z.string().uuid(),
  split_type: z.enum(['none','equal','proportional','custom']).default('none'),
  split_data: z.record(z.any()).optional(),
});

export async function createTransaction(formData: FormData): Promise<Result> {
  const parsed = TransactionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
  }
  
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail('No autenticado');
  
  // Asegurar período mensual existe
  const year = parsed.data.occurred_at.getFullYear();
  const month = parsed.data.occurred_at.getMonth() + 1;
  const { data: periodId, error: periodError } = await supabase.rpc('ensure_monthly_period', {
    household_id: parsed.data.household_id,
    year_param: year,
    month_param: month
  });
  
  if (periodError) return fail(periodError.message);
  
  const { error } = await supabase.from('transactions').insert({
    ...parsed.data,
    period_id: periodId,
    created_by: user.id,
    source_type: 'manual',
    status: 'confirmed'
  });
  
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
const result = await createTransaction(formData);
if (!result.ok) {
  toast.error(result.message);
  // Pintar fieldErrors en el formulario con React Hook Form
  if (result.fieldErrors) {
    Object.entries(result.fieldErrors).forEach(([field, errors]) => {
      form.setError(field, { message: errors[0] });
    });
  }
} else {
  toast.success('Transacción guardada');
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
- Mapeo de columnas: `occurred_at`, `type`, `category`, `amount`, `currency`, `description`
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

Ejemplo: `feat: add CSV export for transactions`

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
- **Componentes críticos**: `TransactionForm` (validaciones + submit), `MonthSelector`
- **Testing library**: React Testing Library para componentes
- **NO testear**: Integraciones Supabase profundas (confiar en RLS + proveedor)
- **E2E (opcional fase 2)**: Playwright smoke tests (crear/editar/borrar) - mockear Auth
- **Coverage objetivo MVP**: 60-70% en utilidades y formularios; 0% en integraciones Supabase

#### Qué testear
✅ `lib/date.ts` → rangos de mes, formateo  
✅ `lib/format.ts` → formateo de moneda y fechas  
✅ `lib/csv.ts` → parse/format CSV  
✅ `TransactionForm` → validación Zod, submit  
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
- **Moneda**: EUR (almacenada en `households.settings` JSONB como `{"currency": "EUR"}`)
- **Categorías**: **23 categorías predeterminadas** creadas automáticamente por trigger `on_household_created_create_categories` al insertar household:
  - **15 gasto**: Vivienda 🏠, Supermercado 🛒, Transporte 🚗, Restaurantes 🍽️, Ocio 🎭, Salud 🏥, Educación 📚, Menaje 🪑, Ropa 👕, Mascotas 🐶, Regalos 🎁, Suscripciones 📱, Deportes ⚽, Belleza 💄, Varios ➕
  - **8 ingreso**: Nómina 💰, Freelance 💼, Inversiones 📈, Ventas 🏷️, Devoluciones ↩️, Aportación Cuenta Conjunta 🏦, Bonus 🎉, Varios ➕
- **Household**: Creado por primer usuario; invitación por email para el segundo
- **Ahorro**: Al crear household, trigger también crea automáticamente `household_savings` con balance 0

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
- `contribution_adjustments`: Ajustes manuales con justificación ⭐ MEJORADO
  - **Estados**: `pending`, `active`, `applied`, `cancelled`, `locked`
  - **Auditoría completa**: `created_by`, `updated_by`, `locked_at`, `locked_by`
  - **Relación con transactions**: `income_transaction_id` para reajustes

**Server Actions** (`app/app/contributions/actions.ts`):
- `setMemberIncome()`: Configurar ingreso de un miembro
- `setContributionGoal()`: Configurar meta mensual del hogar
- `calculateAndCreateContributions()`: Generar contribuciones proporcionales
- `updateContributionPaidAmount()`: Actualizar monto pagado
- `addContributionAdjustment()`: Agregar ajuste manual (crea transacciones duales automáticamente) ⭐
- `deleteContributionAdjustment()`: Eliminar ajuste y sus transacciones relacionadas ⭐

**Integración con Transacciones**:
- Cada gasto cuenta como pago hacia la contribución del mes
- El estado se actualiza automáticamente: `pending`, `partial`, `paid`, `overpaid`
- **Ajustes con Transacciones Duales** ⭐ NEW:
  * Ajuste tipo "prepayment" con monto negativo y categoría → crea automáticamente:
    1. Transacción de gasto (expense) en la categoría seleccionada
    2. Transacción de ingreso virtual (income) representando el aporte del miembro
  * Al eliminar ajuste → se eliminan automáticamente TODAS las transacciones relacionadas
  * Búsqueda inteligente por: transaction_id, descripción [Ajuste: razón], [Pre-pago]

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
