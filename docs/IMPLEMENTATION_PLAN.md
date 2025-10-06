# 🚀 Implementación: Sistema de Transacciones Robusto

**Fecha inicio**: 5 de octubre de 2025  
**Fecha actualización**: 6 de octubre de 2025  
**Estado**: 🟢 FASE 6 COMPLETADA - Avanzando a FASE 7  
**Responsable**: AI Agent con MCP Supabase  

---

## 📊 Estado de Fases

- ✅ **FASE 1**: Migraciones Base de Datos (5 oct) - COMPLETADO
- ✅ **FASE 2**: Aplicar Migraciones con MCP (5 oct) - COMPLETADO  
- ✅ **FASE 3**: Wipe y Seed (5 oct) - COMPLETADO
- ✅ **FASE 4**: Generar Tipos TypeScript (5 oct) - COMPLETADO
- ✅ **FASE 5**: Renombrar movements → transactions (6 oct) - COMPLETADO
- ✅ **FASE 6**: Actualizar Server Actions con Auditoría (6 oct) - COMPLETADO ⭐ NEW
- 🔄 **FASE 7**: UI Dashboard 3 Pestañas (6-8 oct) - EN PROGRESO
- ⏳ **FASE 8**: UI Créditos y Períodos (9 oct) - PENDIENTE
- ⏳ **FASE 9**: Testing E2E (10 oct) - PENDIENTE

---

## ✅ FASE 6 COMPLETADA (6 octubre 2025)

### Server Actions con Auditoría Completa ⭐

**Archivos modificados**: 4 archivos, 492 inserciones, 75 eliminaciones

1. **`expenses/actions.ts` - createTransaction() mejorado**:
   - ✅ Llamada automática a `ensure_monthly_period(household_id, year, month)`
   - ✅ Columnas auditoría: `paid_by`, `created_by`, `source_type='manual'`, `status='confirmed'`, `period_id`
   - ✅ Validación: Período debe existir antes de INSERT

2. **`expenses/edit-actions.ts` - updateTransaction() mejorado**:
   - ✅ SELECT adicional: `status, locked_at, locked_by`
   - ✅ Validación locked: `if (status === 'locked' || locked_at) → fail()`
   - ✅ Columnas auditoría: `updated_by`, `updated_at`
   - ✅ Error amigable: "No se puede editar una transacción de un período cerrado"

3. **`expenses/actions.ts` - deleteTransaction() mejorado** ⭐ NEW:
   - ✅ SELECT verificación: household, status, locked_at
   - ✅ Validación locked antes de DELETE
   - ✅ Same pattern que updateTransaction

4. **`app/savings/actions.ts` - Módulo completo nuevo (266 líneas)**:
   - ✅ 8 Server Actions: transfer, withdraw, deposit, getSavingsTransactions, getSavingsBalance, updateSavingsGoal, getSavingsHistory, interestAccrualCheck
   - ✅ 4 Schemas Zod: TransferSchema, WithdrawSchema, DepositSchema, SavingsGoalSchema
   - ✅ 3 RPCs integrados: transfer_credit_to_savings, withdraw_from_savings, deposit_to_savings
   - ✅ Type assertions para TypeScript strict mode

### Fixes Seguridad Supabase ⚠️ CRÍTICO

**3 migraciones aplicadas via MCP**:

1. ✅ `fix_security_definer_views`: Eliminado SECURITY DEFINER
   - v_transactions_with_profile recreada SIN security definer
   - v_period_stats recreada SIN security definer
   - **Impacto**: 2 ERRORES nivel ERROR eliminados

2. ✅ `fix_all_functions_search_path_correct`: Agregado search_path
   - 41 funciones SQL con `SET search_path = public, pg_temp`
   - **Impacto**: 36 WARNINGS eliminados (previene SQL injection via schema poisoning)

3. ⏳ `auth_leaked_password_protection`: Pending habilitar en dashboard
   - **Impacto**: Bajo (usamos magic link sin contraseñas)

### Build & Compilación

- ✅ 26 rutas compiladas exitosamente
- ✅ 0 errores TypeScript
- ✅ Linting passed
- ✅ Commit `35511ee` + push GitHub exitoso

---

## ✅ Decisiones Confirmadas por Usuario

### 1. Split de Gastos: **B - Complejo/Flexible**
```typescript
// Agregar: split_type, split_data JSONB
// Opciones: 'none', 'equal', 'proportional', 'custom'
// Ej: Gasto 100€ → 70% Ana (70€), 30% Luis (30€)
```

### 2. Cierre Mensual: **C - Híbrido + Validación Estricta**
```typescript
// Proponer cierre automático al llegar a último día mes
// BLOQUEAR creación/edición en mes siguiente hasta cerrar actual
// Validación: No permitir trabajar en Oct si Sep no está cerrado
```

### 3. Transacciones Locked: **B - Reapertura Permitida (Solo Owners)**
```typescript
// Owner puede reabrir período cerrado
// Alertas: "⚠️ Esto puede descuadrar contabilidad cerrada"
// Auditoría: Registrar quién reabrió y cuándo
// UI: Botón "Reabrir Mes" con confirmación modal
```

### 4. Ingresos Adicionales: **B - Sistema Créditos Completo**
```typescript
// Nueva tabla: member_credits
// Automático: Si paid > expected → crédito automático
// Manual: Botón "Agregar Crédito" genera movimientos
// Lógica: Créditos se aplican automáticamente en meses futuros
```

### 5. Permisos de Edición: **Estrictos/Auditables**
```typescript
// Owner: Puede editar casi todo (respetando locked)
// Member: NO puede editar sus movimientos una vez creados
// Correcciones: Member solicita a Owner vía mensaje/notificación
// Reajustes: Se gestionan con movimientos de ajuste (no edición directa)
```

### 6. Editar Ajustes: **Generar Movimientos de Reajuste**
```typescript
// NO editar movimientos existentes
// Generar movimientos adicionales de reajuste
// Ej: Prepago 350€ → luego reajuste -50€ = 300€ final
// Recalcular contribución tras reajuste
```

---

## 🔴 Problema Crítico Identificado: Sistema de Meses

### Estado Actual (5 oct 2025)
```sql
-- monthly_periods: 0 filas (tabla existe pero NO se usa)
-- transactions.period_id: NULL en TODAS las transacciones
-- Dashboard: Filtra por occurred_at pero NO valida períodos
-- Contribuciones: Usa year/month pero NO conecta con monthly_periods
```

### Problemas
1. ❌ No hay período activo rastreado
2. ❌ No hay validación "mes debe cerrarse antes de siguiente"
3. ❌ No hay auto-creación de períodos al iniciar mes
4. ❌ Dashboard y contribuciones trabajan con meses "sueltos" sin estructura

### Solución: Sistema de Períodos Mensuales Robusto

#### Nueva Lógica de Períodos

```typescript
// Estado del período
type PeriodStatus = 
  | 'future'      // Mes futuro, no accesible todavía
  | 'active'      // Mes actual, se pueden crear transacciones
  | 'closing'     // Último día del mes, propone cierre
  | 'closed'      // Cerrado, locked (reapertura solo owner)
  | 'historical'  // Meses pasados cerrados

// Reglas de acceso
- Solo 1 período 'active' por household a la vez
- Período 'future' se vuelve 'active' cuando:
  * Es el día 1 del mes Y
  * El mes anterior está 'closed'
- Período 'active' pasa a 'closing' cuando:
  * Es el último día del mes
  * UI muestra banner: "⏰ Último día del mes. ¿Cerrar período?"
- Crear transacción en mes 'future' → ERROR: "Debes cerrar Oct antes de trabajar en Nov"
```

#### Nueva Tabla: `period_access_log`
```sql
-- Auditoría de accesos a períodos
CREATE TABLE period_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID NOT NULL REFERENCES monthly_periods(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('opened', 'closed', 'reopened', 'accessed')),
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason TEXT, -- Para reaberturas
  metadata JSONB DEFAULT '{}'
);
```

---

## 📊 Nuevo Modelo de Datos Completo

### 🔄 Cambios en `transactions`

```sql
-- FASE 1: Ownership y Split
ALTER TABLE transactions
  -- Ownership: Quién pagó
  ADD COLUMN paid_by UUID REFERENCES profiles(id) ON DELETE SET NULL
    COMMENT 'Miembro que pagó/recibió esta transacción',
  
  -- Split de gastos (personalizable)
  ADD COLUMN split_type TEXT NOT NULL DEFAULT 'none'
    CHECK (split_type IN ('none', 'equal', 'proportional', 'custom'))
    COMMENT 'Tipo de división: none (sin dividir), equal (partes iguales), proportional (según ingresos), custom (% manual)',
  
  ADD COLUMN split_data JSONB
    COMMENT 'Datos de división: { profile_id: { amount: X, percentage: Y } }',
  
  -- Estados del ciclo de vida
  ADD COLUMN status TEXT NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('draft', 'pending', 'confirmed', 'locked'))
    COMMENT 'Estado: draft (borrador), pending (esperando validación), confirmed (validado), locked (cerrado con mensualidad)',
  
  -- Rastreo de origen
  ADD COLUMN source_type TEXT
    CHECK (source_type IN ('manual', 'adjustment', 'credit', 'recurring', 'import'))
    COMMENT 'Origen: manual (usuario), adjustment (ajuste), credit (crédito aplicado), recurring (regla), import (importado)',
  
  ADD COLUMN source_id UUID
    COMMENT 'ID del recurso que generó esta transacción',
  
  -- Auditoría completa
  ADD COLUMN created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
    COMMENT 'Usuario que creó la transacción',
  
  ADD COLUMN updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL
    COMMENT 'Usuario que editó por última vez',
  
  ADD COLUMN locked_at TIMESTAMPTZ
    COMMENT 'Fecha y hora de bloqueo (cierre mensual)',
  
  ADD COLUMN locked_by UUID REFERENCES profiles(id) ON DELETE SET NULL
    COMMENT 'Usuario que bloqueó (owner que cerró el mes)';

-- FASE 2: Índices optimizados
CREATE INDEX idx_transactions_paid_by ON transactions(paid_by);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_source ON transactions(source_type, source_id);
CREATE INDEX idx_transactions_locked ON transactions(locked_at) WHERE locked_at IS NOT NULL;
CREATE INDEX idx_transactions_period ON transactions(period_id);
CREATE INDEX idx_transactions_household_occurred ON transactions(household_id, occurred_at DESC);

-- FASE 3: Trigger para validar período activo
CREATE OR REPLACE FUNCTION validate_transaction_period()
RETURNS TRIGGER AS $$
DECLARE
  v_period_status TEXT;
BEGIN
  -- Si tiene period_id, verificar que esté activo
  IF NEW.period_id IS NOT NULL THEN
    SELECT status INTO v_period_status
    FROM monthly_periods
    WHERE id = NEW.period_id;
    
    IF v_period_status NOT IN ('active', 'closing') THEN
      RAISE EXCEPTION 'No se pueden crear/editar transacciones en períodos con status: %', v_period_status;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_transaction_period_before_insert
  BEFORE INSERT OR UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION validate_transaction_period();
```

### 🆕 Nueva Tabla: `member_credits`

```sql
-- Sistema de créditos por miembro
CREATE TABLE member_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Datos del crédito
  amount NUMERIC(10, 2) NOT NULL CHECK (amount != 0)
    COMMENT 'Monto positivo (crédito a favor) o negativo (deuda)',
  
  reason TEXT NOT NULL
    COMMENT 'Razón: "Excedente Oct 2025: +500€" o "Crédito manual por X"',
  
  type TEXT NOT NULL DEFAULT 'automatic'
    CHECK (type IN ('automatic', 'manual', 'adjustment'))
    COMMENT 'Origen: automatic (calculado), manual (agregado por owner), adjustment (corrección)',
  
  -- Estado
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'applied', 'cancelled'))
    COMMENT 'Estado: active (disponible), applied (ya aplicado a contribución), cancelled (anulado)',
  
  applied_to_contribution_id UUID REFERENCES contributions(id) ON DELETE SET NULL
    COMMENT 'Contribución donde se aplicó este crédito',
  
  applied_at TIMESTAMPTZ
    COMMENT 'Fecha y hora de aplicación',
  
  -- Auditoría
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Constraint: Un miembro no puede tener múltiples créditos activos del mismo tipo
  CONSTRAINT unique_active_credit UNIQUE (household_id, profile_id, type, status)
    WHERE status = 'active'
);

CREATE INDEX idx_member_credits_profile ON member_credits(profile_id);
CREATE INDEX idx_member_credits_status ON member_credits(status);
CREATE INDEX idx_member_credits_household ON member_credits(household_id);

COMMENT ON TABLE member_credits IS 
  'Créditos/débitos de miembros acumulados por excedentes o aportes extras. 
   El miembro decide al inicio de mes si aplicar crédito o mantenerlo activo.
   Puede transferirse al fondo de ahorro del hogar en cualquier momento.';
```

### 🆕 Nueva Tabla: `household_savings`

```sql
-- Fondo de ahorro del hogar con trazabilidad completa
CREATE TABLE household_savings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  
  -- Balance actual del fondo
  current_balance NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (current_balance >= 0),
  currency TEXT NOT NULL DEFAULT 'EUR',
  
  -- Metadatos
  goal_amount NUMERIC(10, 2) DEFAULT NULL
    COMMENT 'Meta de ahorro opcional (ej: 10000€ para vacaciones)',
  
  goal_description TEXT
    COMMENT 'Descripción del objetivo de ahorro',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraint: Un solo fondo por household
  CONSTRAINT unique_household_savings UNIQUE (household_id)
);

CREATE INDEX idx_household_savings_household ON household_savings(household_id);

COMMENT ON TABLE household_savings IS 
  'Fondo de ahorro común del hogar. 
   Los miembros pueden transferir sus excedentes/créditos al fondo.
   Totalmente trazable con savings_transactions.';

-- Transacciones del fondo de ahorro
CREATE TABLE savings_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  savings_id UUID NOT NULL REFERENCES household_savings(id) ON DELETE CASCADE,
  
  -- Tipo de transacción
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'transfer_from_credit', 'interest', 'adjustment'))
    COMMENT 'Tipo: deposit (depósito manual), withdrawal (retiro), transfer_from_credit (desde crédito miembro), interest (intereses), adjustment (ajuste manual)',
  
  -- Datos de la transacción
  amount NUMERIC(10, 2) NOT NULL CHECK (amount != 0),
  
  balance_before NUMERIC(10, 2) NOT NULL
    COMMENT 'Balance del fondo ANTES de esta transacción',
  
  balance_after NUMERIC(10, 2) NOT NULL
    COMMENT 'Balance del fondo DESPUÉS de esta transacción',
  
  -- Origen/Destino
  source_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL
    COMMENT 'Miembro origen (si aplica)',
  
  source_credit_id UUID REFERENCES member_credits(id) ON DELETE SET NULL
    COMMENT 'Crédito origen (si es transfer_from_credit)',
  
  destination_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL
    COMMENT 'Transacción común generada (si retiro va a gastos comunes)',
  
  -- Descripción y metadatos
  description TEXT NOT NULL,
  notes TEXT,
  
  -- Auditoría
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Constraint: Balance after debe ser consistente
  CONSTRAINT check_balance_consistency CHECK (balance_after = balance_before + amount)
);

CREATE INDEX idx_savings_transactions_savings ON savings_transactions(savings_id, created_at DESC);
CREATE INDEX idx_savings_transactions_type ON savings_transactions(type);
CREATE INDEX idx_savings_transactions_profile ON savings_transactions(source_profile_id);

COMMENT ON TABLE savings_transactions IS 
  'Registro completo de movimientos del fondo de ahorro.
   Cada transacción incluye balance antes/después para auditoría profesional.';
```

### 🔄 Mejoras en `monthly_periods`

```sql
-- Mejorar tabla existente
ALTER TABLE monthly_periods
  -- Auto-cierre configurable
  ADD COLUMN auto_close_enabled BOOLEAN NOT NULL DEFAULT false
    COMMENT 'Si true, propone cierre automático último día del mes',
  
  -- Reconciliación
  ADD COLUMN reconciled BOOLEAN NOT NULL DEFAULT false
    COMMENT 'Si true, todas las transacciones están revisadas y validadas',
  
  -- Metadatos de cierre
  ADD COLUMN closure_notes TEXT
    COMMENT 'Notas del owner al cerrar el mes',
  
  -- Reaperturas
  ADD COLUMN reopened_count INTEGER NOT NULL DEFAULT 0
    COMMENT 'Número de veces que se ha reabierto este período',
  
  ADD COLUMN last_reopened_at TIMESTAMPTZ
    COMMENT 'Última fecha de reapertura',
  
  ADD COLUMN last_reopened_by UUID REFERENCES profiles(id) ON DELETE SET NULL
    COMMENT 'Último usuario que reabrió';

-- Actualizar constraint de status
ALTER TABLE monthly_periods
  DROP CONSTRAINT IF EXISTS monthly_periods_status_check;

ALTER TABLE monthly_periods
  ADD CONSTRAINT monthly_periods_status_check
    CHECK (status IN ('future', 'active', 'closing', 'closed', 'historical'));

-- Índices adicionales
CREATE INDEX idx_monthly_periods_household_date 
  ON monthly_periods(household_id, year, month);

CREATE INDEX idx_monthly_periods_status
  ON monthly_periods(status);

-- Constraint único: Un solo período por household/year/month
CREATE UNIQUE INDEX idx_monthly_periods_unique
  ON monthly_periods(household_id, year, month);

-- Constraint: Solo 1 período 'active' por household
CREATE UNIQUE INDEX idx_monthly_periods_one_active
  ON monthly_periods(household_id)
  WHERE status = 'active';
```

### 🔄 Mejoras en `contribution_adjustments`

```sql
-- Mejorar estados y auditoría
ALTER TABLE contribution_adjustments
  DROP CONSTRAINT IF EXISTS contribution_adjustments_status_check;

ALTER TABLE contribution_adjustments
  ADD CONSTRAINT contribution_adjustments_status_check
    CHECK (status IN ('pending', 'active', 'applied', 'cancelled', 'locked'));

-- Agregar columnas de auditoría faltantes
ALTER TABLE contribution_adjustments
  ADD COLUMN updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL
    COMMENT 'Usuario que editó por última vez',
  
  ADD COLUMN locked_at TIMESTAMPTZ
    COMMENT 'Fecha y hora de bloqueo (cierre mensual)',
  
  ADD COLUMN locked_by UUID REFERENCES profiles(id) ON DELETE SET NULL
    COMMENT 'Usuario que bloqueó el ajuste',
  
  -- Para ajustes editados: rastrear reajustes
  ADD COLUMN original_amount NUMERIC(10, 2)
    COMMENT 'Monto original si fue editado',
  
  ADD COLUMN readjustment_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL
    COMMENT 'Transacción de reajuste generada al editar';

COMMENT ON COLUMN contribution_adjustments.status IS 
  'Estado del ajuste: 
   - pending: Creado, esperando aprobación
   - active: Aprobado y activo, movimientos generados
   - applied: Aplicado a la contribución del mes
   - cancelled: Cancelado, movimientos eliminados
   - locked: Cerrado con mensualidad, NO editable';
```

### 🔄 Mejoras en `households`

```sql
-- Agregar estado y configuración
ALTER TABLE households
  ADD COLUMN status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'archived'))
    COMMENT 'Estado del hogar: active (en uso), inactive (pausado), archived (histórico)',
  
  ADD COLUMN settings JSONB NOT NULL DEFAULT '{}'
    COMMENT 'Configuración del hogar: auto_close_periods, require_period_closure, etc.';

CREATE INDEX idx_households_status ON households(status);

-- Valores por defecto en settings
UPDATE households
SET settings = jsonb_build_object(
  'auto_close_periods', true,
  'require_period_closure', true,
  'allow_period_reopening', true,
  'max_reopen_count', 3
)
WHERE settings = '{}';
```

---

## 🔧 Funciones SQL Nuevas

### 1. Auto-crear Período Mensual

```sql
-- Crear período si no existe
CREATE OR REPLACE FUNCTION ensure_monthly_period(
  p_household_id UUID,
  p_year INT,
  p_month INT
) RETURNS UUID AS $$
DECLARE
  v_period_id UUID;
  v_prev_month_closed BOOLEAN;
  v_is_current_month BOOLEAN;
BEGIN
  -- Verificar si ya existe
  SELECT id INTO v_period_id
  FROM monthly_periods
  WHERE household_id = p_household_id
    AND year = p_year
    AND month = p_month;
  
  IF v_period_id IS NOT NULL THEN
    RETURN v_period_id;
  END IF;
  
  -- Verificar si es el mes actual
  v_is_current_month := (
    EXTRACT(YEAR FROM CURRENT_DATE) = p_year AND
    EXTRACT(MONTH FROM CURRENT_DATE) = p_month
  );
  
  -- Verificar si mes anterior está cerrado (si aplica)
  IF p_month > 1 THEN
    SELECT (status = 'closed') INTO v_prev_month_closed
    FROM monthly_periods
    WHERE household_id = p_household_id
      AND year = p_year
      AND month = p_month - 1;
  ELSE
    -- Mes enero, verificar diciembre año anterior
    SELECT (status = 'closed') INTO v_prev_month_closed
    FROM monthly_periods
    WHERE household_id = p_household_id
      AND year = p_year - 1
      AND month = 12;
  END IF;
  
  -- Si mes anterior NO está cerrado, no permitir crear siguiente
  IF v_prev_month_closed = FALSE THEN
    RAISE EXCEPTION 'Debes cerrar el mes anterior antes de trabajar en %/%', p_month, p_year;
  END IF;
  
  -- Crear nuevo período
  INSERT INTO monthly_periods (
    household_id,
    year,
    month,
    status,
    opening_balance,
    total_income,
    total_expenses,
    closing_balance
  )
  VALUES (
    p_household_id,
    p_year,
    p_month,
    CASE 
      WHEN v_is_current_month THEN 'active'
      WHEN p_year > EXTRACT(YEAR FROM CURRENT_DATE) OR 
           (p_year = EXTRACT(YEAR FROM CURRENT_DATE) AND p_month > EXTRACT(MONTH FROM CURRENT_DATE))
      THEN 'future'
      ELSE 'active' -- Meses pasados sin crear → active para permitir trabajo histórico
    END,
    0, 0, 0, 0
  )
  RETURNING id INTO v_period_id;
  
  RETURN v_period_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. Cerrar Período Mensual

```sql
-- Función mejorada para cerrar período
CREATE OR REPLACE FUNCTION close_monthly_period(
  p_household_id UUID,
  p_year INT,
  p_month INT,
  p_closed_by UUID,
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_period_id UUID;
  v_start_date DATE;
  v_end_date DATE;
  v_total_income NUMERIC;
  v_total_expenses NUMERIC;
  v_closing_balance NUMERIC;
  v_transactions_locked INT;
  v_adjustments_locked INT;
BEGIN
  -- Calcular rango de fechas
  v_start_date := make_date(p_year, p_month, 1);
  v_end_date := (v_start_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
  
  -- Obtener período
  SELECT id INTO v_period_id
  FROM monthly_periods
  WHERE household_id = p_household_id
    AND year = p_year
    AND month = p_month;
  
  IF v_period_id IS NULL THEN
    RAISE EXCEPTION 'Período mensual no encontrado: %/%', p_month, p_year;
  END IF;
  
  -- Calcular totales
  SELECT 
    COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)
  INTO v_total_income, v_total_expenses
  FROM transactions
  WHERE household_id = p_household_id
    AND occurred_at BETWEEN v_start_date AND v_end_date;
  
  v_closing_balance := v_total_income - v_total_expenses;
  
  -- Actualizar período
  UPDATE monthly_periods
  SET 
    status = 'closed',
    closed_at = NOW(),
    closed_by = p_closed_by,
    closure_notes = p_notes,
    reconciled = true,
    total_income = v_total_income,
    total_expenses = v_total_expenses,
    closing_balance = v_closing_balance
  WHERE id = v_period_id;
  
  -- Bloquear transacciones del mes
  UPDATE transactions
  SET 
    status = 'locked',
    locked_at = NOW(),
    locked_by = p_closed_by
  WHERE household_id = p_household_id
    AND occurred_at BETWEEN v_start_date AND v_end_date
    AND status != 'locked';
  
  GET DIAGNOSTICS v_transactions_locked = ROW_COUNT;
  
  -- Bloquear ajustes del mes
  UPDATE contribution_adjustments ca
  SET 
    status = 'locked',
    locked_at = NOW(),
    locked_by = p_closed_by
  FROM contributions c
  WHERE ca.contribution_id = c.id
    AND c.household_id = p_household_id
    AND c.year = p_year
    AND c.month = p_month
    AND ca.status != 'locked';
  
  GET DIAGNOSTICS v_adjustments_locked = ROW_COUNT;
  
  -- Registrar en log
  INSERT INTO period_access_log (period_id, profile_id, action, metadata)
  VALUES (
    v_period_id,
    p_closed_by,
    'closed',
    jsonb_build_object(
      'transactions_locked', v_transactions_locked,
      'adjustments_locked', v_adjustments_locked,
      'closing_balance', v_closing_balance,
      'notes', p_notes
    )
  );
  
  -- Retornar resumen
  RETURN jsonb_build_object(
    'success', true,
    'period_id', v_period_id,
    'total_income', v_total_income,
    'total_expenses', v_total_expenses,
    'closing_balance', v_closing_balance,
    'transactions_locked', v_transactions_locked,
    'adjustments_locked', v_adjustments_locked
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3. Reabrir Período Mensual

```sql
-- Función para reabrir período (solo owners)
CREATE OR REPLACE FUNCTION reopen_monthly_period(
  p_household_id UUID,
  p_year INT,
  p_month INT,
  p_reopened_by UUID,
  p_reason TEXT
) RETURNS JSONB AS $$
DECLARE
  v_period_id UUID;
  v_max_reopen_count INT;
  v_current_reopen_count INT;
  v_transactions_unlocked INT;
  v_adjustments_unlocked INT;
BEGIN
  -- Obtener configuración de household
  SELECT 
    (settings->>'max_reopen_count')::INT
  INTO v_max_reopen_count
  FROM households
  WHERE id = p_household_id;
  
  v_max_reopen_count := COALESCE(v_max_reopen_count, 3);
  
  -- Obtener período
  SELECT id, reopened_count INTO v_period_id, v_current_reopen_count
  FROM monthly_periods
  WHERE household_id = p_household_id
    AND year = p_year
    AND month = p_month;
  
  IF v_period_id IS NULL THEN
    RAISE EXCEPTION 'Período mensual no encontrado: %/%', p_month, p_year;
  END IF;
  
  -- Validar límite de reaperturas
  IF v_current_reopen_count >= v_max_reopen_count THEN
    RAISE EXCEPTION 'Límite de reaperturas alcanzado (máximo: %)', v_max_reopen_count;
  END IF;
  
  -- Actualizar período
  UPDATE monthly_periods
  SET 
    status = 'active',
    reopened_count = reopened_count + 1,
    last_reopened_at = NOW(),
    last_reopened_by = p_reopened_by
  WHERE id = v_period_id;
  
  -- Desbloquear transacciones
  UPDATE transactions
  SET 
    status = 'confirmed',
    locked_at = NULL,
    locked_by = NULL
  WHERE period_id = v_period_id
    AND status = 'locked';
  
  GET DIAGNOSTICS v_transactions_unlocked = ROW_COUNT;
  
  -- Desbloquear ajustes
  UPDATE contribution_adjustments ca
  SET 
    status = 'active',
    locked_at = NULL,
    locked_by = NULL
  FROM contributions c
  WHERE ca.contribution_id = c.id
    AND c.household_id = p_household_id
    AND c.year = p_year
    AND c.month = p_month
    AND ca.status = 'locked';
  
  GET DIAGNOSTICS v_adjustments_unlocked = ROW_COUNT;
  
  -- Registrar en log
  INSERT INTO period_access_log (period_id, profile_id, action, reason, metadata)
  VALUES (
    v_period_id,
    p_reopened_by,
    'reopened',
    p_reason,
    jsonb_build_object(
      'transactions_unlocked', v_transactions_unlocked,
      'adjustments_unlocked', v_adjustments_unlocked,
      'reopen_count', v_current_reopen_count + 1
    )
  );
  
  -- Retornar resumen
  RETURN jsonb_build_object(
    'success', true,
    'period_id', v_period_id,
    'transactions_unlocked', v_transactions_unlocked,
    'adjustments_unlocked', v_adjustments_unlocked,
    'reopen_count', v_current_reopen_count + 1,
    'remaining_reopens', v_max_reopen_count - (v_current_reopen_count + 1)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 4. Aplicar Crédito a Contribución

```sql
-- Aplicar crédito automáticamente al calcular contribución
CREATE OR REPLACE FUNCTION apply_member_credits(
  p_contribution_id UUID
) RETURNS NUMERIC AS $$
DECLARE
  v_profile_id UUID;
  v_household_id UUID;
  v_credit_amount NUMERIC := 0;
  v_credit_id UUID;
BEGIN
  -- Obtener datos de la contribución
  SELECT profile_id, household_id
  INTO v_profile_id, v_household_id
  FROM contributions
  WHERE id = p_contribution_id;
  
  -- Buscar créditos activos del miembro
  SELECT id, amount INTO v_credit_id, v_credit_amount
  FROM member_credits
  WHERE household_id = v_household_id
    AND profile_id = v_profile_id
    AND status = 'active'
  ORDER BY created_at ASC
  LIMIT 1; -- Aplicar el más antiguo primero
  
  IF v_credit_id IS NOT NULL THEN
    -- Marcar crédito como aplicado
    UPDATE member_credits
    SET 
      status = 'applied',
      applied_to_contribution_id = p_contribution_id,
      applied_at = NOW()
    WHERE id = v_credit_id;
    
    -- Retornar monto del crédito
    RETURN v_credit_amount;
  END IF;
  
  RETURN 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 🔒 RLS Policies Actualizadas

```sql
-- Transacciones: Locked NO editables
DROP POLICY IF EXISTS "locked_transactions_readonly" ON transactions;
CREATE POLICY "locked_transactions_readonly"
  ON transactions FOR UPDATE
  USING (status != 'locked');

-- Transacciones: Members NO pueden editar (solo owners)
DROP POLICY IF EXISTS "members_can_edit_transactions" ON transactions;
CREATE POLICY "owners_can_edit_transactions"
  ON transactions FOR UPDATE
  USING (
    status != 'locked' AND
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = transactions.household_id
        AND hm.profile_id IN (
          SELECT id FROM profiles WHERE auth_user_id = auth.uid()
        )
        AND hm.role = 'owner'
    )
  );

-- Ajustes: Locked NO editables
DROP POLICY IF EXISTS "locked_adjustments_readonly" ON contribution_adjustments;
CREATE POLICY "locked_adjustments_readonly"
  ON contribution_adjustments FOR UPDATE
  USING (status != 'locked');

-- Períodos: Solo owners pueden cerrar/reabrir
DROP POLICY IF EXISTS "owners_can_manage_periods" ON monthly_periods;
CREATE POLICY "owners_can_manage_periods"
  ON monthly_periods FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = monthly_periods.household_id
        AND hm.profile_id IN (
          SELECT id FROM profiles WHERE auth_user_id = auth.uid()
        )
        AND hm.role = 'owner'
    )
  );

-- Créditos: Members pueden ver los suyos, owners pueden ver todos
DROP POLICY IF EXISTS "members_can_view_own_credits" ON member_credits;
CREATE POLICY "members_can_view_own_credits"
  ON member_credits FOR SELECT
  USING (
    profile_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = member_credits.household_id
        AND hm.profile_id IN (
          SELECT id FROM profiles WHERE auth_user_id = auth.uid()
        )
        AND hm.role = 'owner'
    )
  );
```

---

## 📝 Orden de Implementación

### ✅ FASE 1: Migraciones Base de Datos (HOY - Yo con MCP)

1. ✅ `20251005_001_add_transaction_ownership.sql`
   - Agregar: paid_by, split_type, split_data, status, source_*, created_by, updated_by, locked_*
   - Índices optimizados

2. ✅ `20251005_002_create_member_credits.sql`
   - Crear tabla member_credits completa

3. ✅ `20251005_003_improve_monthly_periods.sql`
   - Agregar: auto_close_enabled, reopened_count, last_reopened_*, closure_notes
   - Actualizar status enum
   - Constraints: uno activo, único por mes

4. ✅ `20251005_004_create_period_access_log.sql`
   - Crear tabla auditoría de períodos

5. ✅ `20251005_005_improve_adjustments.sql`
   - Agregar: updated_by, locked_*, original_amount, readjustment_transaction_id
   - Actualizar status enum

6. ✅ `20251005_006_improve_households.sql`
   - Agregar: status, settings JSONB

7. ✅ `20251005_007_create_period_functions.sql`
   - ensure_monthly_period()
   - close_monthly_period()
   - reopen_monthly_period()
   - apply_member_credits()

8. ✅ `20251005_008_update_rls_policies.sql`
   - Todas las policies nuevas

**⭐ NUEVAS MIGRACIONES (Sistema de Ahorro + Categorías)**

9. 🔄 `20251005_009_create_savings_system.sql`
   - Crear: household_savings, savings_transactions
   - Funciones: transfer_credit_to_savings(), withdraw_from_savings()
   - RLS policies para fondo de ahorro

10. 🔄 `20251005_010_improve_member_credits_savings.sql`
   - Agregar: auto_apply, transferred_to_savings, monthly_decision
   - Lógica de decisión mensual del miembro

11. 🔄 `20251005_011_seed_default_categories.sql`
   - Categorías gasto: Vivienda, Supermercado, Transporte, Restaurantes, Ocio, Salud, Educación, Menaje, Ropa, Mascotas, Regalos, Varios
   - Categorías ingreso: Nómina, Freelance, Inversiones, Ventas, Devoluciones, Aportación Cuenta Conjunta, Varios

### ✅ FASE 2: Aplicar Migraciones con MCP

```typescript
// Aplicar secuencialmente con mcp_supabase_apply_migration()
for each migration {
  await mcp_supabase_apply_migration({
    project_id: "fizxvvtakvmmeflmbwud",
    name: migration_name,
    query: migration_sql
  });
  
  // Verificar
  await mcp_supabase_list_tables({
    project_id: "fizxvvtakvmmeflmbwud",
    schemas: ["public"]
  });
}
```

### ✅ FASE 3: Wipe y Seed (Yo con MCP)

```sql
-- Script wipe preservando estructura
-- Script seed con datos de prueba robustos
```

### ✅ FASE 4: Generar Tipos TypeScript

```bash
npx supabase gen types typescript --project-id fizxvvtakvmmeflmbwud > types/database.ts
```

### 🔄 FASE 5: Renombrar movements → transactions (2-3 días)

- 50+ archivos
- Rutas, componentes, acciones, textos UI

### 🔄 FASE 6: Actualizar Server Actions (2 días)

- Auditoría: created_by, updated_by
- Validaciones: período activo, locked status
- Integrar: ensure_monthly_period(), apply_member_credits()

### 🔄 FASE 7: UI Nuevas Funcionalidades (2-3 días)

- Selector "Pagado por" + Split configuración
- Badges de estado
- Dashboard con tabs
- Sistema cierre mensual (botones, modales, validaciones)
- Banner "Último día del mes, ¿cerrar?"
- Sistema créditos (visualización, aplicación)

---

## ⏱️ Estimación Temporal

- **Hoy (5 oct)**: FASE 1, 2, 3, 4 → Migraciones + Wipe + Tipos (6-8 horas)
- **6-7 oct**: FASE 5 → Renombrar movements (full day)
- **8-9 oct**: FASE 6 → Server Actions (full days)
- **10-12 oct**: FASE 7 → UI (3 full days)
- **13 oct**: Testing completo + ajustes

**Total**: ~8-9 días calendario = **5-6 días laborables full-time**

---

**Documento creado**: 5 de octubre de 2025, 05:10 UTC  
**Estado**: 🟢 LISTO PARA IMPLEMENTAR  
**Próxima acción**: Empezar FASE 1 - Crear migraciones SQL
