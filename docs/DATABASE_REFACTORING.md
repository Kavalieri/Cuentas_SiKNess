# Refactorización de Base de Datos - Arquitectura Robusta

## Fecha: 3 de Octubre de 2025

## 🎯 Objetivo

Reestructurar la base de datos para seguir las mejores prácticas de apps financieras exitosas (Splitwise, YNAB, Mint) y crear una arquitectura escalable, clara y profesional.

## 📋 Problemas Identificados

### 1. **Dependencia de `auth.users` como fuente de verdad**
❌ **Problema**: Usamos `auth.users` directamente en `household_members`, `movements`, etc.
- `auth.users` es para **autenticación**, no para datos de aplicación
- No podemos añadir campos personalizados (display_name, avatar, preferences)
- No podemos gestionar usuarios desde el portal de Supabase fácilmente
- Email visible por todas partes en lugar de nombre amigable

### 2. **Nombres de tabla poco descriptivos**
❌ `movements` → No es claro, podría ser cualquier cosa
✅ `transactions` → Estándar en aplicaciones financieras

### 3. **Mezcla de conceptos**
❌ Roles de sistema (`system_admins`) vs roles de hogar (`household_members.role`)
- Está bien tenerlos separados, pero falta claridad en la separación

### 4. **Falta de escalabilidad**
❌ Si queremos añadir:
- Compartir entre hogares (invitar usuarios externos)
- Sistema de amigos
- Organizaciones/equipos
- Múltiples identidades por usuario

La estructura actual no es flexible.

## 🏗️ Arquitectura Propuesta (Inspirada en Splitwise + YNAB)

### Comparación con la Competencia

#### **Splitwise** (Modelo Multi-Tenant Exitoso)
```
users (profiles independientes)
├── user_id (PK)
├── email
├── display_name
└── avatar

groups (hogares/grupos)
├── group_id (PK)
└── name

group_members (relación many-to-many)
├── group_id (FK → groups)
├── user_id (FK → users, NO auth.users)
└── role

expenses (transacciones)
├── expense_id (PK)
├── group_id (FK → groups)
├── paid_by (FK → users)
├── description
└── amount
```

#### **YNAB (You Need A Budget)**
```
users (profiles)
budgets (presupuestos/hogares)
budget_users (miembros)
accounts (cuentas bancarias)
transactions (movimientos)
categories
```

#### **Mint (Intuit)**
```
users (profiles)
accounts (cuentas)
transactions (movimientos)
budgets
goals
```

### 🆕 Estructura Propuesta para CuentasSiK

```sql
-- USUARIOS (Fuente de Verdad)
profiles
├── id (UUID PK)
├── auth_user_id (UUID UNIQUE FK → auth.users) -- Solo para vincular
├── display_name (TEXT NOT NULL)              -- Nombre visible
├── email (TEXT, cache de auth.users.email)   -- Para mostrar
├── avatar_url (TEXT)
├── bio (TEXT)
├── created_at
└── updated_at

-- HOGARES (Unchanged)
households
├── id (UUID PK)
├── name (TEXT)
├── description (TEXT)
├── avatar_url (TEXT)
└── created_at

-- MEMBRESÍAS (Ahora apunta a profiles)
household_members
├── household_id (FK → households)
├── profile_id (FK → profiles.id)  -- ✅ CAMBIO: Era user_id → auth.users
├── role (TEXT: 'owner' | 'member')
└── PRIMARY KEY (household_id, profile_id)

-- TRANSACCIONES (Renombrado de movements)
transactions
├── id (UUID PK)
├── household_id (FK → households)
├── profile_id (FK → profiles.id)   -- ✅ CAMBIO: Era user_id → auth.users
├── category_id (FK → categories)
├── period_id (FK → monthly_periods)
├── type (TEXT: 'expense' | 'income')
├── amount (NUMERIC)
├── currency (TEXT)
├── description (TEXT)              -- ✅ CAMBIO: Era 'note'
├── occurred_at (DATE)
└── created_at (TIMESTAMPTZ)

-- CATEGORÍAS (Unchanged structure)
categories
├── id (UUID PK)
├── household_id (FK → households)
├── name (TEXT)
├── icon (TEXT)
└── type (TEXT)

-- PERÍODOS (Unchanged structure)
monthly_periods
├── id (UUID PK)
├── household_id (FK → households)
├── year (INTEGER)
├── month (INTEGER)
├── status (TEXT)
├── opening_balance (NUMERIC)
├── total_income (NUMERIC)
├── total_expenses (NUMERIC)
└── closing_balance (NUMERIC)

-- CONTRIBUCIONES (Ahora apunta a profiles)
contributions
├── id (UUID PK)
├── household_id (FK → households)
├── profile_id (FK → profiles.id)   -- ✅ CAMBIO
├── year (INTEGER)
├── month (INTEGER)
└── ...

member_incomes
├── id (UUID PK)
├── household_id (FK → households)
├── profile_id (FK → profiles.id)   -- ✅ CAMBIO
└── ...

pre_payments
├── id (UUID PK)
├── household_id (FK → households)
├── profile_id (FK → profiles.id)   -- ✅ CAMBIO
└── ...

-- CONFIGURACIÓN DE USUARIO (Unchanged structure)
user_settings
├── profile_id (FK → profiles.id)   -- ✅ CAMBIO
├── active_household_id (FK → households)
└── preferences (JSONB)

-- INVITACIONES (Unchanged structure)
invitations
├── id (UUID PK)
├── household_id (FK → households)
├── email (TEXT)
└── ...

-- ADMINISTRADORES DEL SISTEMA (Sigue apuntando a auth.users)
system_admins
├── user_id (FK → auth.users)       -- ✅ CORRECTO: auth para permisos
└── created_at
```

## 🔄 Cambios Necesarios

### 1. **Crear tabla `profiles`**

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read all profiles (para mostrar nombres en listas)
CREATE POLICY "Anyone can read profiles" ON profiles FOR SELECT USING (true);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE 
  USING (auth_user_id = auth.uid());
```

### 2. **Función para obtener profile_id actual**

```sql
CREATE OR REPLACE FUNCTION get_current_profile_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile_id UUID;
BEGIN
  SELECT id INTO v_profile_id
  FROM profiles
  WHERE auth_user_id = auth.uid();
  
  RETURN v_profile_id;
END;
$$;
```

### 3. **Trigger para auto-crear profile**

```sql
CREATE OR REPLACE FUNCTION sync_auth_user_to_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO profiles (auth_user_id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', SPLIT_PART(NEW.email, '@', 1))
  )
  ON CONFLICT (auth_user_id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_auth_user_to_profile();
```

### 4. **Renombrar `movements` → `transactions`**

```sql
ALTER TABLE movements RENAME TO transactions;
ALTER TABLE transactions RENAME COLUMN note TO description;

-- Actualizar índices
DROP INDEX IF EXISTS idx_movements_household_occurred_at_desc;
CREATE INDEX idx_transactions_household_occurred_at_desc 
  ON transactions (household_id, occurred_at DESC);

DROP INDEX IF EXISTS idx_movements_household_type_occurred_at_desc;
CREATE INDEX idx_transactions_household_type_occurred_at_desc 
  ON transactions (household_id, type, occurred_at DESC);

DROP INDEX IF EXISTS idx_movements_period;
CREATE INDEX idx_transactions_period 
  ON transactions (period_id);
```

### 5. **Actualizar FKs en todas las tablas**

```sql
-- Añadir columna profile_id (nueva)
ALTER TABLE household_members ADD COLUMN profile_id UUID REFERENCES profiles(id);

-- Migrar datos: mapear auth user_id → profile_id
UPDATE household_members hm
SET profile_id = p.id
FROM profiles p
WHERE hm.user_id = p.auth_user_id;

-- Hacer NOT NULL y eliminar user_id viejo
ALTER TABLE household_members ALTER COLUMN profile_id SET NOT NULL;
ALTER TABLE household_members DROP COLUMN user_id;

-- Actualizar PRIMARY KEY
ALTER TABLE household_members DROP CONSTRAINT household_members_pkey;
ALTER TABLE household_members ADD PRIMARY KEY (household_id, profile_id);

-- Repetir para: transactions, contributions, member_incomes, pre_payments, user_settings
```

### 6. **Actualizar RLS Policies**

Cambiar `auth.uid()` por `get_current_profile_id()` donde sea necesario.

## 📦 Plan de Migración

### Fase 1: Preparación (No Rompe Nada)
1. ✅ Crear tabla `profiles`
2. ✅ Crear función `get_current_profile_id()`
3. ✅ Crear trigger para sincronizar auth.users → profiles
4. ✅ Poblar profiles con usuarios existentes

### Fase 2: Migración de Estructura
1. ✅ Renombrar `movements` → `transactions`
2. ✅ Renombrar columna `note` → `description`
3. ✅ Añadir columna `profile_id` a todas las tablas con user_id

### Fase 3: Migración de Datos
1. ✅ Mapear user_id → profile_id en todas las tablas
2. ✅ Verificar integridad
3. ✅ Eliminar columnas `user_id` antiguas

### Fase 4: Actualizar Código
1. ✅ Cambiar imports y referencias
2. ✅ Actualizar queries de Supabase
3. ✅ Actualizar RLS policies
4. ✅ Regenerar tipos TypeScript

### Fase 5: Testing y Limpieza
1. ✅ Probar flujos completos
2. ✅ Wipe de datos de prueba (manteniendo estructura)
3. ✅ Verificar que todo funciona

## 🎯 Ventajas de la Nueva Arquitectura

### ✅ Escalabilidad
- Usuarios independientes de hogares
- Fácil añadir features multi-tenant
- Compartir entre hogares sin duplicar usuarios

### ✅ Claridad
- `profiles` = usuarios de la aplicación
- `auth.users` = solo autenticación
- `system_admins` = permisos de sistema
- `household_members` = permisos de hogar
- `transactions` = nombre profesional y claro

### ✅ UX Mejorada
- Display name en lugar de email
- Avatares personalizables
- Bio/perfil editable
- Gestión fácil desde Supabase portal

### ✅ Mantenibilidad
- Separación clara de responsabilidades
- Código más limpio
- Queries más simples
- RLS policies más claras

## 🔍 Comparación Antes/Después

### ANTES ❌
```typescript
// Obtener usuario actual
const { data: { user } } = await supabase.auth.getUser();
const email = user.email; // ❌ Email por todas partes

// Query movimientos
const { data } = await supabase
  .from('movements') // ❌ Nombre poco claro
  .select('*, user:auth.users(email)') // ❌ Join complejo
  .eq('user_id', user.id);
```

### DESPUÉS ✅
```typescript
// Obtener usuario actual
const profileId = await getCurrentProfileId();
const { data: profile } = await supabase
  .from('profiles')
  .select('display_name, avatar_url')
  .eq('id', profileId)
  .single();

console.log(profile.display_name); // ✅ Nombre amigable

// Query transacciones
const { data } = await supabase
  .from('transactions') // ✅ Nombre claro
  .select('*, profile:profiles(display_name, avatar_url)') // ✅ Join simple
  .eq('profile_id', profileId);
```

## 📝 Naming Conventions Finales

### Tablas (Plurales)
- `profiles` (usuarios)
- `households` (hogares)
- `household_members` (membresías)
- `transactions` (transacciones)
- `categories` (categorías)
- `monthly_periods` (períodos)
- `contributions` (contribuciones)
- `member_incomes` (ingresos de miembros)
- `pre_payments` (prepagos)
- `user_settings` (configuración)
- `invitations` (invitaciones)
- `system_admins` (administradores)

### Columnas (snake_case)
- `profile_id` (no user_id)
- `household_id`
- `auth_user_id` (solo en profiles)
- `display_name` (no name, para claridad)
- `occurred_at` (no date)
- `created_at`, `updated_at`

### Funciones (snake_case)
- `get_current_profile_id()`
- `sync_auth_user_to_profile()`
- `ensure_monthly_period()`

## 🚀 Próximos Pasos

1. Crear migración SQL completa
2. Ejecutar en entorno de desarrollo
3. Probar todos los flujos
4. Actualizar código TypeScript
5. Regenerar tipos
6. Wipe y crear datos frescos
7. Deploy a producción

---

**Resultado**: Base de datos profesional, escalable y clara, siguiendo las mejores prácticas de apps financieras exitosas. ✨
