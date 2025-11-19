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
mcp_shell_execute_command('psql -h 127.0.0.1 -U cuentassik_user -d cuentassik_dev -c "SELECT 1"');
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

- Rol `LOGIN` de mínimos privilegios (NO superuser, NO createdb, NO createrole, NO DDL)
- Privilegios: `SELECT, INSERT, UPDATE, DELETE` en tablas y `USAGE, SELECT` en secuencias
- NO es owner de los objetos; el owner es `cuentassik_owner` (rol unificado)
- Usado en:
  - Aplicación Next.js (DATABASE_URL en .env)
  - Queries manuales para debugging
  - Scripts de sincronización de datos (no estructura)

3. **`cuentassik_owner`** ⭐ (Rol NOLOGIN para DDL - Unificado v2.1.0)

- Rol unificado para AMBOS entornos (DEV y PROD)
- Tipo: `NOLOGIN` (no puede conectar directamente)
- Propietario de TODOS los objetos de base de datos en ambos entornos
- Usado para: DDL/migraciones (CREATE, ALTER, DROP, funciones SECURITY DEFINER)
- **Ejecución**: Conectarse como `postgres` y ejecutar `SET ROLE cuentassik_owner;` dentro de migraciones

**⚠️ Roles OBSOLETOS (eliminados en Issue #6 - v2.1.0):**
- ❌ `cuentassik_dev_owner` (reemplazado por `cuentassik_owner`)
- ❌ `cuentassik_prod_owner` (reemplazado por `cuentassik_owner`)

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

**NO usar comandos psql directos desde el código. Usar `query()` en el código.**

📚 **Documentación completa**: [database/README.md](database/README.md)

### Compatibilidad de Esquemas (Migraciones en curso)

- **Columnas opcionales**: Algunas instalaciones aún no tienen `monthly_periods.phase`, `monthly_periods.is_current` o `member_monthly_income`. Antes de consultarlas, verifica su existencia con `information_schema` y ofrece un _fallback_ a columnas legacy (`status`, `member_incomes`).
- **Enums**: Utiliza helpers de `lib/dualFlow.ts` en lugar de escribir literales de flujo (`common`, `direct`). Si necesitas nuevos valores, actualiza el enum y crea migración en `database/migrations`.
- **Consultas parametrizadas**: Siempre usa `query()` con placeholders (`$1, $2`) para evitar inyección y mantener compatibilidad entre DEV/PROD.

---

## 🏷️ Sistema de Categorías (Estructura de 3 Niveles)

### Arquitectura Real de Tablas

**⚠️ IMPORTANTE**: El sistema usa una jerarquía de **3 niveles** (NO 2):

```
category_parents (Grupos)
    ↓ parent_id
categories (Categorías)
    ↓ category_id
subcategories (Subcategorías)
    ↓ subcategory_id
transactions
```

### 1. `category_parents` (Nivel 1 - "Grupos")

```sql
Tabla: category_parents
Columnas principales:
  - id UUID PRIMARY KEY
  - household_id UUID (FK households)
  - name TEXT NOT NULL  -- Ej: "Otros Ingresos", "Hogar"
  - icon TEXT NOT NULL
  - type TEXT NOT NULL  -- CHECK: 'income' | 'expense'
  - display_order INTEGER DEFAULT 0
  - created_at TIMESTAMPTZ DEFAULT now()
  - updated_at TIMESTAMPTZ DEFAULT now()

Índices:
  - idx_category_parents_household (household_id, type, display_order)
  
Constraints:
  - type IN ('income', 'expense')
```

**Ejemplos reales**:
- "Otros Ingresos" (type: 'income')
- "Hogar" (type: 'expense')
- "Transporte" (type: 'expense')

### 2. `categories` (Nivel 2 - "Categorías")

```sql
Tabla: categories
Columnas principales:
  - id UUID PRIMARY KEY
  - household_id UUID (FK households)
  - parent_id UUID (FK category_parents) ⭐ CLAVE
  - name TEXT  -- Ej: "Aportación Cuenta Conjunta"
  - icon TEXT
  - type TEXT
  - is_system BOOLEAN DEFAULT FALSE
  - display_order INTEGER DEFAULT 0
  - created_by_profile_id UUID
  - updated_by_profile_id UUID
  - created_at TIMESTAMPTZ DEFAULT now()
  - updated_at TIMESTAMPTZ DEFAULT now()

Índices:
  - idx_categories_parent_id (parent_id, display_order)
  - idx_categories_is_system WHERE is_system = true
  
Foreign Keys:
  - parent_id → category_parents(id) ON DELETE SET NULL
  - created_by_profile_id → profiles(id)
  - updated_by_profile_id → profiles(id)
```

**Ejemplos reales**:
- "Aportación Cuenta Conjunta" (parent: "Otros Ingresos")
- "Supermercado" (parent: "Hogar")
- "Préstamo Personal" (parent: NULL, is_system: TRUE) ⭐ Categoría especial

### 3. `subcategories` (Nivel 3 - "Subcategorías")

```sql
Tabla: subcategories
Columnas principales:
  - id UUID PRIMARY KEY
  - household_id UUID (FK households)
  - category_id UUID (FK categories) ⭐ CLAVE
  - name TEXT  -- Ej: "Otros", "Frutas y verduras"
  - created_at TIMESTAMPTZ DEFAULT now()

Foreign Keys:
  - category_id → categories(id) ON DELETE CASCADE
```

**Ejemplos reales**:
- "Otros" (category: "Aportación Cuenta Conjunta")
- "Frutas y verduras" (category: "Supermercado")

### 4. `transactions` (Uso de Categorías)

```sql
Tabla: transactions (fragmento relevante)
Columnas de categorización:
  - category_id UUID (FK categories) ⚠️ GENERALMENTE NULL
  - subcategory_id UUID (FK subcategories) ⭐ PRINCIPAL
  
Regla: 
  - Se guarda SOLO subcategory_id
  - category_id generalmente es NULL
  - Para obtener grupo + categoría: JOIN mediante subcategory → category → category_parent
```

### Consultas Correctas (3 Niveles)

**❌ INCORRECTO** (Asume category_id en transactions):
```sql
SELECT t.*, c.name as categoria
FROM transactions t
LEFT JOIN categories c ON c.id = t.category_id  -- ⚠️ Esto da NULL
WHERE t.id = 'xxx';
```

**✅ CORRECTO** (JOIN mediante subcategory_id):
```sql
SELECT 
  t.id,
  t.amount,
  t.description,
  t.occurred_at,
  cp.name as grupo,           -- Nivel 1
  c.name as categoria,        -- Nivel 2
  sc.name as subcategoria     -- Nivel 3
FROM transactions t
LEFT JOIN subcategories sc ON sc.id = t.subcategory_id          -- ⭐ START aquí
LEFT JOIN categories c ON c.id = sc.category_id                 -- ⭐ Subir a categoría
LEFT JOIN category_parents cp ON cp.id = c.parent_id            -- ⭐ Subir a grupo
WHERE t.household_id = $1
ORDER BY t.occurred_at DESC;
```

### Categorías de Sistema (is_system = TRUE)

Creadas en migración `20251119_160000_create_loan_categories.sql`:

1. **"Préstamo Personal"** (income, common)
   - Para registrar préstamos recibidos entre miembros
   - Incrementa el crédito del prestamista hacia el prestatario
   
2. **"Pago Préstamo"** (income, common)
   - Para registrar devoluciones de préstamos
   - Decrementa el crédito del prestamista hacia el prestatario

**Uso en consultas**:
```sql
-- Excluir pagos de préstamo al calcular contribuciones
WHERE (c.name IS NULL OR c.name <> 'Pago Préstamo')
```

### Errores Comunes a Evitar

**❌ NO hacer**:
```sql
-- Error 1: Buscar tabla que no existe
LEFT JOIN category_groups cg ...  -- ⚠️ NO EXISTE

-- Error 2: Asumir category_id tiene valor
WHERE t.category_id IS NOT NULL  -- ⚠️ Generalmente es NULL

-- Error 3: JOIN directo desde transactions a category_parents
LEFT JOIN category_parents cp ON cp.id = t.category_id  -- ⚠️ INCORRECTO
```

**✅ SÍ hacer**:
```sql
-- Correcto 1: Siempre partir de subcategory_id
LEFT JOIN subcategories sc ON sc.id = t.subcategory_id

-- Correcto 2: JOIN en cascada (3 niveles)
LEFT JOIN subcategories sc ON sc.id = t.subcategory_id
LEFT JOIN categories c ON c.id = sc.category_id
LEFT JOIN category_parents cp ON cp.id = c.parent_id

-- Correcto 3: Verificar existencia de categoría por nombre
WHERE (c.name IS NULL OR c.name <> 'Pago Préstamo')
```

### Ejemplo Completo: Transacción con Categorización

**Dato en UI**:
- Grupo: "Otros Ingresos"
- Categoría: "Aportación Cuenta Conjunta"
- Subcategoría: "Otros"
- Monto: 150.36€
- Fecha: 04/11/2025

**Dato en DB** (`transaction_id = '244082f4-23c2-46f3-9b1b-323e68833302'`):
```sql
transactions:
  - subcategory_id = 'dd2d048b-1d72-4f66-b28f-58d0d200680d'  -- "Otros"
  - category_id = NULL  ⚠️ No se guarda

subcategories (id = 'dd2d048b...'):
  - name = 'Otros'
  - category_id = '9fa72930-5aa5-450a-b4ec-e9723be29695'  -- "Aportación Cuenta Conjunta"

categories (id = '9fa72930...'):
  - name = 'Aportación Cuenta Conjunta'
  - parent_id = 'abc123...'  -- "Otros Ingresos"

category_parents (id = 'abc123...'):
  - name = 'Otros Ingresos'
  - type = 'income'
```

**Consulta para obtener todo**:
```sql
SELECT 
  cp.name as grupo,
  c.name as categoria,
  sc.name as subcategoria,
  t.amount,
  t.occurred_at
FROM transactions t
LEFT JOIN subcategories sc ON sc.id = t.subcategory_id
LEFT JOIN categories c ON c.id = sc.category_id
LEFT JOIN category_parents cp ON cp.id = c.parent_id
WHERE t.id = '244082f4-23c2-46f3-9b1b-323e68833302';

-- Resultado:
-- grupo           | categoria                       | subcategoria | amount | occurred_at
-- Otros Ingresos  | Aportación Cuenta Conjunta     | Otros        | 150.36 | 2025-11-04
```

---

## 🔄 Sistema de Auto-generación de Types (✅ Completado)

**Estado**: ✅ **Issue #8 y #10 COMPLETADOS**

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

### Regeneración Manual

```bash
# DEV
npm run types:generate:dev

# PROD
npm run types:generate:prod
```

**VS Code Tasks disponibles**:
- `🔄 Regenerar Types (DEV)`
- `🔄 Regenerar Types (PROD)`

**Documentación completa**:
- `docs/ISSUE_8_AUTO_GENERACION_TYPES.md`
- `database/README.md` (sección auto-generación)

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

## 💰 Sistema de Contribuciones y Períodos (CRÍTICO)

### Tabla `contributions` - ⚠️ NO SE USA

```sql
Tabla: contributions
Estado: VACÍA (0 filas en DEV y PROD)
Uso: NO UTILIZADA por el sistema actual

Columnas:
  - id UUID
  - household_id UUID
  - profile_id UUID
  - year INTEGER
  - month INTEGER
  - expected_amount NUMERIC  -- NO expected_contribution
  - paid_amount NUMERIC  -- NO actual_contribution
  - status TEXT
  - created_at TIMESTAMP

⚠️ IMPORTANTE:
- Esta tabla NO se usa para cálculos
- Todos los cálculos son en TIEMPO REAL desde transactions
- NO consultar ni escribir en esta tabla
- Deprecada según ANALISIS_PROBLEMA_PERIODOS_CERRADOS.md
```

### Tabla `transactions` - Campos Relevantes para Contribuciones

```sql
Tabla: transactions
Columnas principales para contribuciones:
  - id UUID PRIMARY KEY
  - household_id UUID (FK households)
  - period_id UUID (FK monthly_periods)  -- Vinculación al período
  - type TEXT  -- 'income', 'expense', 'income_direct', 'expense_direct'
  - flow_type TEXT  -- 'common', 'direct'
  - amount NUMERIC
  - occurred_at DATE  -- NO timestamp
  - performed_by_profile_id UUID  -- ⭐ QUIÉN EJECUTÓ (source of truth)
  - profile_id UUID  -- Quién registró
  - is_compensatory_income BOOLEAN  -- TRUE para ingresos de equilibrio
  - transaction_pair_id UUID  -- Vincula gasto directo con ingreso compensatorio

Tipos de transacciones relevantes:
  1. income + common → Aportación a cuenta conjunta
  2. expense + common → Gasto del hogar
  3. expense_direct + direct → Gasto directo de un miembro
  4. income_direct + direct → Ingreso compensatorio (equilibrio dual-flow)
```

### Tabla `monthly_periods` - Fases y Estados

```sql
Tabla: monthly_periods
Columnas principales:
  - id UUID PRIMARY KEY
  - household_id UUID
  - year INTEGER
  - month INTEGER
  - phase period_phase_enum  -- ⭐ CRÍTICO para lógica de cálculo
  - status TEXT  -- 'open', 'pending_close', 'closed'
  - snapshot_contribution_goal NUMERIC  -- Presupuesto bloqueado al cerrar
  - snapshot_budget NUMERIC
  - contribution_disabled BOOLEAN DEFAULT FALSE
  - opened_at TIMESTAMP
  - closed_at TIMESTAMP

Enum phase:
  - 'preparing' → Preparación inicial, NO contar pagos reales
  - 'validation' → Validación de ingresos
  - 'active' → Período activo, contar pagos
  - 'closing' → En proceso de cierre
  - 'closed' → Cerrado, contar pagos (⚠️ era el bug)
```

### Lógica de Cálculo de Contribuciones (⚠️ BUG CRÍTICO RESUELTO)

**Archivo**: `/app/api/periods/contributions/route.ts`

**ANTES (BUG - Línea 174)** ❌:
```typescript
const shouldCountDirectAsPaid = currentPhase === 'validation' || currentPhase === 'active';
// PROBLEMA: Excluía 'closed', causando cálculos incorrectos en períodos cerrados
```

**DESPUÉS (FIX - Commit d8e0480)** ✅:
```typescript
// REGLA CRÍTICA (Línea 174):
// Contar gastos directos y aportaciones comunes en todas las fases excepto 'preparing'
// - preparing: Solo mostrar contribuciones esperadas (sin contar ejecución real)
// - validation/active/closing/closed: Contar todo lo ejecutado (gastos directos + ingresos comunes)
// Esto mantiene la consistencia: el cálculo NO cambia al cerrar el periodo
const shouldCountDirectAsPaid = currentPhase !== 'preparing';
```

**Fórmula de Cálculo**:
```typescript
// Líneas 227-228 (route.ts)
const paidDirect = shouldCountDirectAsPaid ? directExpenses : 0;
const paidCommon = shouldCountDirectAsPaid ? (commonIncomesMap.get(m.profile_id) ?? 0) : 0;
const paid = paidDirect + paidCommon;
const pending = Math.max(0, (finalExpected ?? 0) - paid);
```

### Patrones de Consulta Correctos

**Gastos Directos (lines ~199-208 route.ts)**:
```sql
SELECT 
  performed_by_profile_id,
  SUM(amount) AS total
FROM transactions
WHERE household_id = $1
  AND flow_type = 'direct'
  AND (type = 'expense' OR type = 'expense_direct')  -- ⚠️ AMBOS tipos
  AND (
    period_id = $2 
    OR (period_id IS NULL AND occurred_at >= $3 AND occurred_at < $4)
  )
GROUP BY performed_by_profile_id;
```

**Contribuciones Comunes (lines ~212-225 route.ts)**:
```sql
SELECT 
  t.performed_by_profile_id as profile_id,
  SUM(t.amount) AS total
FROM transactions t
LEFT JOIN categories c ON c.id = t.category_id
WHERE t.household_id = $1
  AND t.type = 'income'
  AND t.flow_type = 'common'
  AND (c.name IS NULL OR c.name <> 'Pago Préstamo')  -- ⚠️ Excluir pagos de préstamo
  AND (
    t.period_id = $2 
    OR (t.period_id IS NULL AND t.occurred_at >= $3 AND t.occurred_at < $4)
  )
GROUP BY t.performed_by_profile_id;
```

**Ingresos de Miembros**:
```sql
-- Patrón: DISTINCT ON para obtener el ingreso más reciente
SELECT DISTINCT ON (profile_id)
  profile_id,
  monthly_income,
  effective_from
FROM member_incomes
WHERE household_id = $1
  AND effective_from <= $2  -- Fecha de corte
ORDER BY profile_id, effective_from DESC;
```

### Vista Materializada `mv_member_pending_contributions`

```sql
Vista: mv_member_pending_contributions
Uso: Cálculos de balance de miembros
Refresco: Automático mediante triggers

Columnas relevantes:
  - household_id UUID
  - profile_id UUID
  - expected_contribution NUMERIC  -- Contribución esperada mensual
  - actual_contributions NUMERIC  -- Aportaciones comunes realizadas
  - direct_expenses_current_month NUMERIC  -- Gastos directos del mes actual
  - pending_amount NUMERIC  -- Pendiente calculado

Lógica:
  - Calcula desde transactions en tiempo real
  - NO usa la tabla contributions
  - Incluye gastos directos como parte del pago
```

### Errores Comunes a Evitar

**❌ NO hacer**:
```typescript
// Error 1: Usar tabla contributions
const contrib = await query('SELECT * FROM contributions WHERE profile_id = $1', [profileId]);
// ⚠️ La tabla está VACÍA, no tiene datos

// Error 2: Usar nombres de columnas incorrectos
WHERE expected_contribution > 0  -- ⚠️ Se llama expected_amount

// Error 3: Solo buscar un tipo de gasto directo
WHERE type = 'expense' AND flow_type = 'direct'  -- ⚠️ Falta 'expense_direct'

// Error 4: Excluir fases incorrectamente
if (phase === 'active' || phase === 'validation')  -- ⚠️ Excluye 'closed'

// Error 5: Usar performed_by vs paid_by
WHERE paid_by_profile_id = $1  -- ⚠️ No existe, se llama performed_by_profile_id
```

**✅ SÍ hacer**:
```typescript
// Correcto 1: Calcular desde transactions
const directExpenses = await query(`
  SELECT SUM(amount) FROM transactions
  WHERE flow_type = 'direct' 
    AND (type = 'expense' OR type = 'expense_direct')
    AND performed_by_profile_id = $1
`, [profileId]);

// Correcto 2: Incluir todas las fases excepto 'preparing'
const shouldCount = currentPhase !== 'preparing';

// Correcto 3: Excluir pagos de préstamo
LEFT JOIN categories c ON c.id = t.category_id
WHERE (c.name IS NULL OR c.name <> 'Pago Préstamo')

// Correcto 4: Usar performed_by_profile_id
WHERE t.performed_by_profile_id = $1
```

### Caso Real: Cálculo Octubre 2025 (Resuelto)

**Problema Detectado**:
- Octubre 2025 (phase: 'closed') mostraba cálculos incorrectos
- Noviembre 2025 (phase: 'active') mostraba cálculos correctos

**Causa Raíz**:
```typescript
// ANTES (BUG):
const shouldCountDirectAsPaid = currentPhase === 'validation' || currentPhase === 'active';
// Cuando phase = 'closed': shouldCountDirectAsPaid = false
// Resultado: paidDirect = 0, paidCommon = 0 (ignoraba pagos reales)
```

**Solución Aplicada**:
```typescript
// DESPUÉS (FIX):
const shouldCountDirectAsPaid = currentPhase !== 'preparing';
// Ahora 'closed' también cuenta pagos: shouldCountDirectAsPaid = true
```

**Resultado**:
- ✅ Octubre 2025: Cálculos ahora correctos (150.36€ + 327€ = 477.36€ pagado)
- ✅ Noviembre 2025: Sigue funcionando correctamente
- ✅ User validation: "Ya lo valido yo, el cálculo ya es correcto"

**Documentación Completa**: `docs/ANALISIS_PROBLEMA_PERIODOS_CERRADOS.md`

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
2. Aplica migraciones del directorio `tested/` (conexión como `postgres` y `SET ROLE cuentassik_owner;` para crear/alterar objetos)
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

**Atajos recomendados:** usa las tareas de VS Code en `.vscode/tasks.json` (prefijo 🟢/🔴/🔄) siempre que exista una para la operación que necesites antes de invocar comandos manuales.

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

## ✅ Checklist al Implementar Nueva Funcionalidad

1. ✅ Usa `getUserHouseholdId()` para obtener el hogar activo
2. ✅ Filtra TODAS las consultas por `household_id`
3. ✅ Valida input con Zod en Server Actions
4. ✅ Usa `revalidatePath()` tras mutaciones
5. ✅ Mantén el código compilando
6. ✅ Si modificas DB, crea migración en `development/`
7. ✅ Protege consultas contra diferencias de esquema (columnas/tablas opcionales)
8. ✅ Prueba en DEV antes de promocionar a `tested/`
9. ✅ Usa MCPs para Git, GitHub, Shell y consulta de documentación

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
