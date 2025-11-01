# Database - Instrucciones Específicas

> **Contexto**: Parte de CuentasSiK (ver `/AGENTS.md` principal)
> **Área**: PostgreSQL Local + Migraciones

---

## � **USUARIOS Y PERMISOS POSTGRESQL - CRÍTICO**

### **⚠️ IMPORTANTE: 3 Usuarios Diferentes con Roles Distintos**

**Este proyecto usa PostgreSQL DIRECTO, NO Supabase Cloud**

#### **1. `postgres` (Superusuario PostgreSQL)**

- **Rol**: Administración del servidor PostgreSQL
- **Permisos**: TODOS (CREATE DATABASE, DROP DATABASE, ALTER, etc.)
- **Uso**:
  - Crear/eliminar bases de datos
  - Aplicar migraciones (cambios de estructura)
  - Configuración global
  - Administración de usuarios
- **Cómo usarlo**:

  ```bash
  # Sin contraseña (autenticación peer de Linux)
  sudo -u postgres psql
  sudo -u postgres psql -d cuentassik_dev

  # Desde scripts de migración
  sudo -u postgres psql -d cuentassik_prod -f migration.sql
  ```

#### **2. `cuentassik_user` ⭐ (Usuario de Aplicación - PRINCIPAL)**

- **Rol**: `LOGIN` con mínimos privilegios (NO superuser, NO createdb, NO createrole, NO DDL)
- **Permisos**:
  - `SELECT, INSERT, UPDATE, DELETE` en tablas
  - `USAGE, SELECT` en secuencias
- **Uso**:
  - Aplicación Next.js (DATABASE_URL en .env)
  - Queries desde código TypeScript
  - Consultas manuales para debugging
  - **NO para aplicar migraciones** (usar `postgres` + roles owner)
- **Configuración**:

  ```bash
  # .env.development.local
  DATABASE_URL="postgresql://cuentassik_user:PASSWORD@localhost:5432/cuentassik_dev"

  # .env.production.local
  DATABASE_URL="postgresql://cuentassik_user:PASSWORD@localhost:5432/cuentassik_prod"
  ```

- **Cómo usarlo**:

  ```bash
  # Consulta manual (requiere password si no está en .pgpass)
  psql -U cuentassik_user -d cuentassik_dev

  # O desde sudo postgres (sin password)
  sudo -u postgres psql -U cuentassik_user -d cuentassik_dev
  ```

#### **3. Rol Owner Unificado (NOLOGIN) - v2.1.0**

- **`cuentassik_owner`** ⭐ (Unificado para DEV y PROD)
  - Propietario de TODOS los objetos en AMBAS bases de datos
  - Usado para DDL/migraciones (con `SET ROLE cuentassik_owner;`)
  - Reemplaza a los roles obsoletos por entorno (Issue #6)

**⚠️ Roles OBSOLETOS (eliminados en v2.1.0):**
- ❌ `cuentassik_dev_owner` (reemplazado por `cuentassik_owner`)
- ❌ `cuentassik_prod_owner` (reemplazado por `cuentassik_owner`)

#### **4. `www-data` (Usuario del Sistema Linux - NO PostgreSQL)**

- **Rol**: Usuario que ejecuta el proceso PM2 de Node.js
- **Permisos**: Permisos de sistema (archivos, procesos)
- **NO es usuario de PostgreSQL**: Es del sistema operativo
- **Conexión a DB**: El proceso PM2 ejecutado por `www-data` se conecta a PostgreSQL usando `cuentassik_user` (via DATABASE_URL)

### **Tabla de Operaciones por Usuario**

| Operación                        | `postgres` | `cuentassik_user` | `cuentassik_owner` |
| -------------------------------- | ---------- | ----------------- | ------------------------ |
| Consultar datos (SELECT)         | ✅         | ✅                | ✅                       |
| Insertar/Actualizar/Borrar datos | ✅         | ✅                | ✅                       |
| Crear/Modificar tablas (DDL)     | ✅         | ❌                | ✅ (via SET ROLE)        |
| Aplicar migraciones              | ✅         | ❌                | ✅ (via SET ROLE)        |
| CREATE/DROP DATABASE             | ✅         | ❌                | ❌                       |
| Ver estructura (\d, \dt)         | ✅         | ✅                | ✅                       |

### **⚠️ REGLAS CRÍTICAS**

1. **Migraciones**: SIEMPRE con `sudo -u postgres` (superusuario) y `SET ROLE cuentassik_[env]_owner;` para DDL

   ```bash
   # ✅ CORRECTO
   sudo -u postgres psql -d cuentassik_prod -f migration.sql

   # ❌ INCORRECTO (cuentassik_user no tiene permisos DDL)
   psql -U cuentassik_user -d cuentassik_prod -f migration.sql
   ```

2. **Queries desde código**: SIEMPRE con `cuentassik_user` (via DATABASE_URL)

   ```typescript
   // ✅ Esto usa cuentassik_user automáticamente (DATABASE_URL)
   const result = await query('SELECT * FROM transactions WHERE id = $1', [id]);
   ```

3. **Debugging manual**: Usar `cuentassik_user` o `postgres` según necesites

   ```bash
   # Para ver datos (cuentassik_user es suficiente)
   psql -U cuentassik_user -d cuentassik_dev -c "SELECT * FROM contributions LIMIT 5;"

   # Para ver estructura (ambos funcionan)
   sudo -u postgres psql -d cuentassik_dev -c "\d contributions"
   ```

4. **NUNCA usar psql desde código TypeScript**: Usar `query()` function

   ```typescript
   // ❌ PROHIBIDO
   mcp_shell_execute_command('psql -U postgres -d cuentassik_dev -c "SELECT * FROM table"');

   // ✅ CORRECTO
   const result = await query('SELECT * FROM table WHERE id = $1', [id]);
   ```

---

## �🗄️ **Conexión a Base de Datos desde Código**

### ⚠️ **IMPORTANTE: PostgreSQL Local (NO Supabase Cloud)**

Este proyecto usa **PostgreSQL nativo** instalado en el servidor Debian.
**NO hay conexión a servicios externos de Supabase**.

El archivo `@/lib/supabaseServer.ts` es un **nombre legacy** de cuando migramos.
Internamente usa `node-postgres` (pg) para conectarse a PostgreSQL local.

### Abstracción Personalizada (PostgreSQL via node-postgres)

```typescript
// ✅ Usar desde @/lib/supabaseServer (nombre legacy, es PostgreSQL local)
import {
  query, // Wrapper de pg.query() para SQL nativo con parámetros
  supabaseServer, // Abstracción legacy (NO es Supabase cloud)
  getCurrentUser, // Helper auth local
  getUserHouseholdId, // Helper household local
} from '@/lib/supabaseServer';
```

### SQL Nativo con node-postgres (PREFERIDO)

```typescript
// ✅ CORRECTO: query() es un wrapper de pg.query() con SQL parametrizado
const result = await query(
  `
  SELECT
    c.*,
    p.email as user_email,
    p.full_name
  FROM contributions c
  LEFT JOIN profiles p ON p.id = c.profile_id
  WHERE c.household_id = $1
    AND c.year = $2
    AND c.month = $3
  ORDER BY c.created_at DESC
  `,
  [householdId, year, month],
);

// Verificar resultado
if (!result.rows) {
  console.error('[Query] No data returned');
  return [];
}

return result.rows;
```

### Operaciones Simples con Abstracción (SIN JOINS)

```typescript
// ✅ Para operaciones sin JOINs (abstracción legacy compatible)
const { data, error } = await supabaseServer()
  .from('expenses')
  .select('*')
  .eq('household_id', householdId)
  .order('date', { ascending: false });

if (error) {
  console.error('[Query] Error:', error);
  throw error;
}

return data;
```

### ❌ NO USAR: Sintaxis Supabase Cloud (Foreign Key Syntax)

```typescript
// ❌ INCORRECTO: Esta sintaxis es de Supabase CLOUD, no funciona con PostgreSQL local
const { data } = await supabase
  .from('contributions')
  .select('*, user:auth.users(id, email)');  // ← NO funciona

// ❌ INCORRECTO: Foreign key syntax de Supabase cloud
.select('*, profile:profiles(*)');  // ← NO funciona

// ✅ SOLUCIÓN: Usar query() con SQL JOIN nativo de PostgreSQL
const result = await query(
  `SELECT c.*, p.* FROM contributions c
   LEFT JOIN profiles p ON p.id = c.profile_id`,
  []
);
```

---

## 🔧 **RPCs (Remote Procedure Calls)**

### RPC Optimizado para Miembros

```sql
-- /database/migrations/tested/20241010_007_create_rpc_get_household_members.sql
CREATE OR REPLACE FUNCTION get_household_members_optimized(p_household_id UUID)
RETURNS TABLE (
  profile_id UUID,
  email TEXT,
  role TEXT,
  joined_at TIMESTAMPTZ,
  current_income NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    hm.profile_id,
    p.email,
    hm.role,
    hm.joined_at,
    get_member_income(hm.household_id, hm.profile_id) as current_income
  FROM household_members hm
  JOIN profiles p ON p.id = hm.profile_id
  WHERE hm.household_id = p_household_id
  ORDER BY hm.joined_at ASC;
END;
$$;

-- Performance: ~3.4ms (testado)
```

### Uso del RPC en TypeScript

```typescript
// ✅ Llamar RPC con query()
const membersQuery = await query(`SELECT * FROM get_household_members_optimized($1)`, [
  householdId,
]);

const members = membersQuery.rows || [];

// Resultado:
// [
//   {
//     profile_id: "uuid-123",
//     email: "user@example.com",
//     role: "owner",
//     joined_at: "2024-01-01T00:00:00Z",
//     current_income: "1500.00"
//   },
//   ...
// ]
```

### Ventajas de RPCs

- ✅ Performance optimizado (queries compiladas)
- ✅ Lógica compleja encapsulada
- ✅ Reutilizable desde múltiples lugares
- ✅ Testing más fácil
- ✅ Seguridad (SECURITY DEFINER)

---

## 📋 **Schema Principal**

### Tabla: profiles

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_profiles_email ON profiles(email);

-- Política RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);
```

### Tabla: households

```sql
CREATE TABLE households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  currency TEXT NOT NULL DEFAULT 'EUR',  -- ISO 4217 code
  monthly_contribution_goal NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT check_currency_format CHECK (currency ~ '^[A-Z]{3}$')
);

-- Índices
CREATE INDEX idx_households_created_at ON households(created_at);
```

### Tabla: household_members (N-N)

```sql
CREATE TABLE household_members (
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

  -- ✅ ESENCIAL: Ownership real
  is_owner BOOLEAN NOT NULL DEFAULT FALSE,

  -- ⚠️ REDUNDANTE: Solo por compatibilidad (cleanup pendiente)
  role TEXT NOT NULL DEFAULT 'member',

  joined_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (household_id, profile_id),

  CONSTRAINT check_role CHECK (role IN ('owner', 'member'))
);

-- Índices
CREATE INDEX idx_hm_household ON household_members(household_id);
CREATE INDEX idx_hm_profile ON household_members(profile_id);
CREATE INDEX idx_hm_is_owner ON household_members(is_owner);
```

**Nota Importante**:

- `is_owner` es un BOOLEAN → Usado para lógica (CORRECTO)
- `role` es TEXT → Solo para display (REDUNDANTE, future cleanup)

### Tabla: contributions

```sql
CREATE TABLE contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id),

  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),

  expected_amount NUMERIC(10,2),  -- Calculado automáticamente
  paid_amount NUMERIC(10,2) NOT NULL DEFAULT 0,

  status TEXT NOT NULL DEFAULT 'pending',
  -- 'pending': paid_amount < expected_amount
  -- 'paid': paid_amount = expected_amount
  -- 'overpaid': paid_amount > expected_amount

  adjustments_total NUMERIC(10,2),  -- Suma de ajustes manuales

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT check_status CHECK (status IN ('pending', 'paid', 'overpaid')),
  CONSTRAINT unique_contribution UNIQUE (household_id, profile_id, year, month)
);

-- Índices
CREATE INDEX idx_contributions_household ON contributions(household_id);
CREATE INDEX idx_contributions_profile ON contributions(profile_id);
CREATE INDEX idx_contributions_period ON contributions(household_id, year, month);
CREATE INDEX idx_contributions_status ON contributions(status);
```

### Tabla: expenses

```sql
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id),
  paid_by UUID REFERENCES profiles(id),

  description TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  date DATE NOT NULL,

  is_recurring BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_expenses_household ON expenses(household_id);
CREATE INDEX idx_expenses_category ON expenses(category_id);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_paid_by ON expenses(paid_by);
```

---

## 🔍 **Queries Comunes**

### 1. Obtener Household del Usuario

```typescript
async function getUserHousehold(userId: string) {
  const result = await query(
    `
    SELECT h.*
    FROM households h
    JOIN household_members hm ON hm.household_id = h.id
    WHERE hm.profile_id = $1
    LIMIT 1
    `,
    [userId],
  );

  return result.rows?.[0] || null;
}
```

### 2. Verificar Ownership

```typescript
async function isHouseholdOwner(userId: string, householdId: string): Promise<boolean> {
  const result = await query(
    `
    SELECT is_owner
    FROM household_members
    WHERE household_id = $1 AND profile_id = $2
    `,
    [householdId, userId],
  );

  return result.rows?.[0]?.is_owner || false;
}
```

### 3. Gastos por Categoría

```typescript
async function getCategoryExpenses(householdId: string, year: number, month: number) {
  const result = await query(
    `
    SELECT
      c.name as category_name,
      c.color as category_color,
      COALESCE(SUM(e.amount), 0) as total
    FROM categories c
    LEFT JOIN expenses e ON e.category_id = c.id
      AND e.household_id = $1
      AND EXTRACT(YEAR FROM e.date) = $2
      AND EXTRACT(MONTH FROM e.date) = $3
    WHERE c.household_id = $1
    GROUP BY c.id, c.name, c.color
    ORDER BY total DESC
    `,
    [householdId, year, month],
  );

  return result.rows || [];
}
```

### 4. Balance Personal

```typescript
async function getPersonalBalance(householdId: string, profileId: string) {
  const result = await query(
    `
    SELECT
      COALESCE(SUM(CASE WHEN paid_by = $2 THEN amount ELSE 0 END), 0) as total_paid,
      COALESCE(SUM(CASE WHEN paid_by != $2 THEN amount ELSE 0 END), 0) as total_owed
    FROM expenses
    WHERE household_id = $1
    `,
    [householdId, profileId],
  );

  return result.rows?.[0] || { total_paid: 0, total_owed: 0 };
}
```

---

## � **Auto-generación de Types TypeScript** (✅ Completado)

**Estado**: Issue #8 y #10 completados exitosamente.

### Sistema Implementado

Los TypeScript types se generan **automáticamente** desde el schema PostgreSQL usando `kysely-codegen`.

**Archivo generado**: `types/database.generated.ts`
- **Líneas**: ~1,013 (43 tablas + enums)
- **Formato**: Kysely (interfaces TypeScript nativas)
- **Source of truth**: Schema PostgreSQL actual
- **Mantenimiento**: ✅ CERO (100% automático)

### Regeneración Automática en Migraciones

**Al aplicar cualquier migración**, los types se regeneran automáticamente:

```bash
./scripts/apply_migration.sh dev 20251101_add_new_column.sql

# Output automático:
✅ Migración aplicada exitosamente en DEV (125ms)

🔄 Regenerando types TypeScript desde esquema PostgreSQL...
✅ Types regenerados exitosamente

📝 Recuerda hacer commit de los cambios:
   git add database/migrations/ types/database.generated.ts
   git commit -m 'feat(db): add new column to table'
```

### Regeneración Manual (cuando sea necesario)

```bash
# DEV
npm run types:generate:dev

# PROD
npm run types:generate:prod
```

**VS Code Tasks**:
- `🔄 Regenerar Types (DEV)`
- `🔄 Regenerar Types (PROD)`

### Beneficios

- ✅ **Sincronización perfecta**: Types siempre reflejan schema real
- ✅ **Compilación limpia**: TypeScript nunca se queja de columnas faltantes
- ✅ **Cero mantenimiento**: No hay que actualizar types manualmente
- ✅ **JSDoc automático**: Comentarios SQL se convierten en documentación TypeScript
- ✅ **Workflow fluido**: Aplica migración → Types actualizados → Continúa programando

### Documentación Completa

- `database/README.md` - Sección "🔄 Auto-generación de Types TypeScript"
- `docs/ISSUE_8_AUTO_GENERACION_TYPES.md` - Documentación técnica completa

---

## �📝 **Migraciones**

### Directorio

```
/database/migrations/tested/
├── 20241010_001_initial_schema.sql
├── 20241010_002_create_categories.sql
├── 20241010_003_create_expenses.sql
├── 20241010_004_create_contributions.sql
├── 20241010_005_create_credits.sql
├── 20241010_006_create_savings.sql
└── 20241010_007_create_rpc_get_household_members.sql
```

### Formato de Archivo

```sql
-- Migration: 20241010_007_create_rpc_get_household_members
-- Description: Optimized RPC for fetching household members with income
-- Performance: ~3.4ms (tested with 100 members)
-- Dependencies: profiles, household_members, get_member_income()
-- Author: @Kavalieri
-- Date: 2025-01-10

BEGIN;

-- Drop existing if needed
DROP FUNCTION IF EXISTS get_household_members_optimized(UUID);

-- Create function
CREATE OR REPLACE FUNCTION get_household_members_optimized(p_household_id UUID)
RETURNS TABLE (...)
AS $$
BEGIN
  ...
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_household_members_optimized(UUID) TO authenticated;

-- Test query
-- SELECT * FROM get_household_members_optimized('test-household-uuid');

COMMIT;
```

### Convenciones

1. ✅ Usar transacciones (BEGIN/COMMIT)
2. ✅ Documentar performance esperado
3. ✅ Incluir DROP IF EXISTS
4. ✅ Grant permissions explícitos
5. ✅ Comentar query de test
6. ✅ Naming: `YYYYMMDD_NNN_description.sql`

---

## ⚡ **Performance**

### Índices Críticos

```sql
-- ✅ Siempre indexar foreign keys
CREATE INDEX idx_expenses_household ON expenses(household_id);

-- ✅ Indexar campos de filtro frecuentes
CREATE INDEX idx_expenses_date ON expenses(date);

-- ✅ Índices compuestos para queries complejas
CREATE INDEX idx_contributions_period
  ON contributions(household_id, year, month);
```

### Explain Analyze

```typescript
// ✅ Para debuggear performance
const result = await query(
  `EXPLAIN ANALYZE
   SELECT ...
   FROM ...
   WHERE ...`,
);

console.log('Query plan:', result.rows);
```

### Benchmarking

```typescript
console.time('[Query] get_household_members_optimized');
const members = await query(`SELECT * FROM get_household_members_optimized($1)`, [householdId]);
console.timeEnd('[Query] get_household_members_optimized');
// Output: [Query] get_household_members_optimized: 3.4ms
```

---

## 🔐 **Row Level Security (RLS)**

### Políticas Comunes

```sql
-- Users can only see their households
CREATE POLICY "Users can view their household data"
  ON households FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_id = households.id
        AND profile_id = auth.uid()
    )
  );

-- Owners can modify household
CREATE POLICY "Owners can update household"
  ON households FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_id = households.id
        AND profile_id = auth.uid()
        AND is_owner = TRUE
    )
  );
```

---

## 🔄 **SISTEMA DE MIGRACIONES - DOS ESCENARIOS**

### **Estructura de Directorios**

```
database/
├── migrations/
│   ├── development/      # 📝 Trabajo activo (migraciones en desarrollo)
│   ├── tested/          # ✅ Probadas en DEV (listas para PROD)
│   ├── applied/         # 📦 Aplicadas en PROD (incluye seed baseline)
│   │   └── archive/     # 🗄️ Migraciones antiguas (>3 meses)
│   └── *.sql           # ❌ NUNCA dejar archivos sueltos aquí
├── schemas/             # Definiciones auxiliares (si aplica)
└── scripts/            # Scripts de automatización
```

### **📥 ESCENARIO 1: Sincronizar PROD → DEV**

**Objetivo**: Copiar datos de producción a desarrollo para trabajar con datos reales

**Script**: `database/scripts/scenario_1_sync_prod_to_dev.sh`
**VSCode Task**: "🔄 ESCENARIO 1: Sincronizar PROD → DEV"
**Usuario**: `sudo -u postgres` (superusuario PostgreSQL)

**Qué hace**:

1. Backup de DEV (seguridad)
2. Exporta SOLO datos de PROD (no estructura)
3. Limpia datos de DEV
4. Importa datos de PROD a DEV
5. Verifica integridad

**Resultado**: DEV tiene estructura actual + datos reales de PROD

**Cuándo usar**:

- Quieres trabajar con datos reales en desarrollo
- Necesitas debuggear un issue de producción
- Testing con volumen realista de datos

**⚠️ IMPORTANTE**: NO modifica PROD, solo lee de allí

---

### **🚀 ESCENARIO 2: Desplegar a PRODUCCIÓN**

**Objetivo**: Aplicar cambios de estructura (migraciones) a producción SIN tocar datos

**Script**: `database/scripts/scenario_2_deploy_to_prod.sh`
**VSCode Task**: "🚀 ESCENARIO 2: Desplegar a PRODUCCIÓN"
**Usuario**: `sudo -u postgres` (superusuario PostgreSQL)

**Qué hace**:

1. Backup OBLIGATORIO de PROD
2. Aplica migraciones del directorio `tested/`
3. Solo modifica ESTRUCTURA (tablas, columnas, índices, funciones)
4. **NO toca los datos existentes**
5. Mueve migraciones aplicadas a `applied/`
6. Ofrece reiniciar PM2

**Resultado**: PROD tiene nueva estructura + datos intactos

**Cuándo usar**:

- Nuevas tablas o columnas
- Modificar índices o constraints
- Crear/actualizar RPCs (funciones)
- Cualquier cambio de estructura

**⚠️ CRÍTICO**:

- NUNCA incluir `DELETE`, `UPDATE` o `TRUNCATE` de datos en migraciones
- Solo DDL: `CREATE TABLE`, `ALTER TABLE`, `CREATE INDEX`, `CREATE FUNCTION`, etc.

---

### **🛠️ Workflow Completo de Desarrollo**

**FASE 1: Preparación (datos reales)**

```bash
# VSCode Task: "📥 ESCENARIO 1: Sincronizar PROD → DEV"
# Resultado: DEV tiene datos de PROD
```

**FASE 2: Desarrollo (crear migración)**

```bash
# VSCode Task: "➕ Crear Nueva Migración"
# Crea: database/migrations/development/20250110123456_add_column_xyz.sql

# Contenido ejemplo:
-- 20250110123456_add_column_xyz.sql
ALTER TABLE contributions
ADD COLUMN adjustments_paid_amount NUMERIC(10,2) DEFAULT 0 NOT NULL;

-- Actualizar función si necesario
CREATE OR REPLACE FUNCTION ...
```

**FASE 3: Aplicar en DEV**

```bash
# VSCode Task: "🔧 Aplicar Migraciones en DEV"
# Aplica migration desde development/ a cuentassik_dev
# Usuario: sudo -u postgres
```

**FASE 4: Testing en DEV**

```bash
# Verificar manualmente que funciona
psql -U cuentassik_user -d cuentassik_dev

# Probar en la app (npm run dev)
# Verificar que todo funciona correctamente
```

**FASE 5: Promover a Tested**

```bash
# VSCode Task: "✅ Promover a Tested"
# Mueve migration de development/ a tested/
# Significa: "Esta migración está lista para PROD"
```

**FASE 6: Despliegue a PROD**

```bash
# VSCode Task: "🚀 ESCENARIO 2: Desplegar a PRODUCCIÓN"
# Aplica migrations de tested/ a cuentassik_prod
# Usuario: sudo -u postgres
# Mueve migrations aplicadas a applied/
```

**FASE 7: Verificar PROD**

```bash
# Verificar estructura
sudo -u postgres psql -d cuentassik_prod -c "\d contributions"

# Verificar app funciona
pm2 logs cuentassik-prod

# Probar en navegador
curl https://tu-dominio.com/app
```

---

### **📋 Tabla de Control de Migraciones**

**Tabla**: `_migrations`

```sql
CREATE TABLE _migrations (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) UNIQUE NOT NULL,
  applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

**Cada migración aplicada queda registrada**:

```sql
SELECT * FROM _migrations ORDER BY applied_at DESC LIMIT 10;

--  id |              filename                    |         applied_at
-- ----+------------------------------------------+----------------------------
--  23 | 20250110_add_adjustments_paid_column.sql | 2025-01-10 14:30:45.123+00
--  22 | 20250108_create_rpc_get_members.sql      | 2025-01-08 09:15:22.456+00
```

---

### **⚠️ REGLAS CRÍTICAS DE MIGRACIONES**

1. **NUNCA modificar datos en migraciones**

   ```sql
   -- ❌ PROHIBIDO en migraciones
   DELETE FROM transactions WHERE date < '2024-01-01';
   UPDATE contributions SET paid_amount = 0;
   TRUNCATE TABLE expenses;

   -- ✅ PERMITIDO en migraciones
   ALTER TABLE contributions ADD COLUMN new_field TEXT;
   CREATE INDEX idx_household ON expenses(household_id);
   CREATE FUNCTION calculate_total() RETURNS NUMERIC ...;
   ```

2. **Usar `sudo -u postgres` para aplicar migraciones**

   ```bash
   # ✅ CORRECTO
   sudo -u postgres psql -d cuentassik_prod -f migration.sql

   # ❌ INCORRECTO (sin permisos DDL)
   psql -U cuentassik_user -d cuentassik_prod -f migration.sql
   ```

3. **Backup SIEMPRE antes de ESCENARIO 2**

   - Script lo hace automáticamente
   - Backup va a `/home/kava/workspace/backups/`
   - Formato: `cuentassik_prod_backup_YYYYMMDD_HHMM.sql.gz`

4. **Testar en DEV antes de PROD**

   - NUNCA aplicar migración directamente a PROD
   - Flujo: development → aplicar en DEV → testar → promover a tested → aplicar en PROD

5. **Nombre descriptivo de migraciones**

   ```bash
   # ✅ BUENO
   20250110_add_adjustments_paid_column.sql
   20250108_create_rpc_get_household_members.sql

   # ❌ MALO
   migration.sql
   fix.sql
   update_20250110.sql
   ```

---

### **🔍 VSCode Tasks Disponibles**

**Acceso**: `Ctrl+Shift+P` → `Tasks: Run Task`

#### 🗄️ Migraciones - Creación y Gestión

- `➕ Crear Nueva Migración` - Genera archivo con timestamp en `development/`
- `� Ver Estado de Migraciones` - Muestra cantidad en development/tested/applied/archive
- `⬆️ Promover Migración (dev → tested)` - Mueve migración probada a tested/

#### � Migraciones - Aplicar (DEV)

- `🔄 DEV: Aplicar Migración Específica` - Aplica una migración específica con prompt interactivo
- `� DEV: Aplicar Todas las Migraciones Pendientes` - Aplica todas las migraciones en development/

#### 🚀 Migraciones - Aplicar (PROD)

- `� PROD: Aplicar Migración Específica` - Aplica migración a PROD con doble confirmación de seguridad

#### 🔄 Types - Auto-generación

- `� Regenerar Types (DEV)` - Regenera types/database.generated.ts desde schema DEV
- `� Regenerar Types (PROD)` - Regenera types/database.generated.ts desde schema PROD

#### �️ Database - Sincronización y Auditoría

- `🔄 Sincronizar DEV → PROD (Database)` - Copia datos (no estructura) de PROD a DEV
- `📊 Verificar Estado Bases de Datos` - Muestra contadores de tablas principales en DEV y PROD
- `� Auditoría de Ownership Unificado` - Verifica ownership model correcto (Issue #6)

**Notas**:
- Las migraciones auto-regeneran types al aplicarse (Issue #10)
- Backups automáticos antes de operaciones en PROD
- Panel dedicado para operaciones críticas, compartido para consultas

---

## 🧪 **Testing Queries**

### En psql

```sql
-- Connect
psql -h localhost -U postgres -d cuentassik_dev

-- Test RPC
SELECT * FROM get_household_members_optimized('household-uuid');

-- Check indexes
\d+ expenses

-- Query plan
EXPLAIN ANALYZE
SELECT ...;
```

---

**Última actualización**: 2025-01-10
**Performance target**: < 10ms para queries simples
