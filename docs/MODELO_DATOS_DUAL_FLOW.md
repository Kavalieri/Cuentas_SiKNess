# Modelo de Datos Dual-Flow Corregido

> **Fecha**: Octubre 2025
> **Estado**: Especificación corregida post-clarificación
> **Objetivo**: Definir estructura de datos para 4 tipos de transacciones

---

## 🎯 **CONCEPTO CLAVE: DUAL-FLOW**

### Flujos del Sistema

```typescript
// FLUJO COMÚN: Dinero real de/hacia fondo común del hogar
type CommonFlow = {
  type: 'ingreso' | 'gasto';
  source: 'fondo_comun';
  balance_effect: 'real'; // Mueve el balance real
};

// FLUJO DIRECTO: Miembro paga "de su bolsillo" pero es gasto común
type DirectFlow = {
  type: 'ingreso_directo' | 'gasto_directo';
  source: 'miembro_individual';
  balance_effect: 'neutro'; // Balance neto = 0 (in + out)
  purpose: 'documentar_gasto_previo';
};
```

---

## 📊 **ESTRUCTURA DE TRANSACCIONES**

### Tabla `transactions` Extendida

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id),
  member_id UUID NOT NULL REFERENCES household_members(profile_id),

  -- Dual-flow specific fields
  transaction_type transaction_type_enum NOT NULL,  -- 4 tipos
  flow_type flow_type_enum NOT NULL,                -- 'comun' | 'directo'
  paired_transaction_id UUID REFERENCES transactions(id), -- Para gastos directos

  -- Standard fields
  amount DECIMAL(12,2) NOT NULL,
  category_id UUID REFERENCES categories(id),
  description TEXT NOT NULL,
  occurred_at TIMESTAMP NOT NULL,
  period_month TEXT NOT NULL, -- 'YYYY-MM'

  -- Review and audit
  review_status review_status_enum DEFAULT 'pending',
  approved_by UUID REFERENCES household_members(profile_id),
  created_by UUID NOT NULL REFERENCES household_members(profile_id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indices optimizados
CREATE INDEX idx_transactions_dual_flow ON transactions(household_id, period_month, flow_type);
CREATE INDEX idx_transactions_paired ON transactions(paired_transaction_id) WHERE paired_transaction_id IS NOT NULL;
```

### ENUMs Actualizados

```sql
-- Tipos de transacción (4 tipos)
CREATE TYPE transaction_type_enum AS ENUM (
  'ingreso',          -- Flujo común: dinero entra al fondo
  'gasto',            -- Flujo común: dinero sale del fondo
  'ingreso_directo',  -- Flujo directo: ingreso ficticio para equilibrar
  'gasto_directo'     -- Flujo directo: gasto real pagado "de su bolsillo"
);

-- Identificador de flujo
CREATE TYPE flow_type_enum AS ENUM (
  'comun',    -- Movimiento real del fondo común
  'directo'   -- Movimiento documentativo (miembro → común)
);

-- Estados del período mensual
CREATE TYPE period_status_enum AS ENUM (
  'configuracion',   -- Definiendo objetivo y miembros
  'pre_validacion',  -- Solo gastos directos permitidos
  'validado',        -- Contribuciones calculadas y bloqueadas
  'cerrado'          -- Período finalizado e inmutable
);
```

---

## 🔄 **LÓGICA DE TRANSACCIONES DUALES**

### Caso: Gasto Directo (Trigger Automático)

```sql
-- Función que ejecuta el trigger para gastos directos
CREATE OR REPLACE FUNCTION create_paired_transaction()
RETURNS TRIGGER AS $$
DECLARE
  paired_id UUID;
BEGIN
  -- Solo para gastos directos
  IF NEW.transaction_type = 'gasto_directo' AND NEW.flow_type = 'directo' THEN
    -- Crear ingreso ficticio asociado
    INSERT INTO transactions (
      household_id, member_id, transaction_type, flow_type,
      amount, description, occurred_at, period_month,
      created_by, paired_transaction_id
    ) VALUES (
      NEW.household_id, NEW.member_id, 'ingreso_directo', 'directo',
      NEW.amount, 'Ingreso ficticio: ' || NEW.description, NEW.occurred_at, NEW.period_month,
      NEW.created_by, NEW.id  -- Se vincula al gasto
    ) RETURNING id INTO paired_id;

    -- Actualizar el gasto con la referencia al ingreso
    UPDATE transactions SET paired_transaction_id = paired_id WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger que ejecuta automáticamente
CREATE TRIGGER tr_create_paired_transaction
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION create_paired_transaction();
```

### Validaciones de Período

```sql
-- Función para validar qué tipos se permiten según estado del período
CREATE OR REPLACE FUNCTION validate_transaction_by_period_status(
  p_household_id UUID,
  p_period_month TEXT,
  p_transaction_type transaction_type_enum
) RETURNS BOOLEAN AS $$
DECLARE
  period_status period_status_enum;
BEGIN
  -- Obtener estado del período
  SELECT status INTO period_status
  FROM monthly_periods
  WHERE household_id = p_household_id AND period_month = p_period_month;

  -- Si no existe período, solo permitir gastos directos
  IF period_status IS NULL THEN
    RETURN p_transaction_type IN ('gasto_directo', 'ingreso_directo');
  END IF;

  -- Lógica según estado
  CASE period_status
    WHEN 'configuracion' THEN
      RETURN p_transaction_type IN ('gasto_directo', 'ingreso_directo');
    WHEN 'pre_validacion' THEN
      RETURN p_transaction_type IN ('gasto_directo', 'ingreso_directo');
    WHEN 'validado' THEN
      RETURN TRUE;  -- Todos los tipos permitidos
    WHEN 'cerrado' THEN
      RETURN FALSE;  -- Ningún tipo permitido
  END CASE;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;
```

---

## 💰 **CÁLCULO DE CONTRIBUCIONES**

### Stored Procedure Principal

```sql
CREATE OR REPLACE FUNCTION calculate_contributions_with_direct_discounts(
  p_household_id UUID,
  p_period_month TEXT,
  p_target_amount DECIMAL
) RETURNS TABLE (
  member_id UUID,
  base_contribution DECIMAL,
  direct_expenses_total DECIMAL,
  final_contribution DECIMAL,
  contribution_percentage DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH member_incomes AS (
    -- Obtener ingresos de cada miembro para el período
    SELECT
      hm.profile_id as member_id,
      COALESCE(mi.monthly_income, 0) as income
    FROM household_members hm
    LEFT JOIN member_incomes mi ON mi.member_id = hm.profile_id
      AND mi.period_month = p_period_month
    WHERE hm.household_id = p_household_id
  ),
  income_totals AS (
    SELECT
      member_id,
      income,
      SUM(income) OVER () as total_household_income
    FROM member_incomes
  ),
  direct_expenses AS (
    -- Sumar gastos directos por miembro en el período
    SELECT
      t.member_id,
      COALESCE(SUM(t.amount), 0) as direct_total
    FROM transactions t
    WHERE t.household_id = p_household_id
      AND t.period_month = p_period_month
      AND t.transaction_type = 'gasto_directo'
      AND t.flow_type = 'directo'
    GROUP BY t.member_id
  )
  SELECT
    it.member_id,
    -- Contribución base según proporción de ingresos
    ROUND((it.income / it.total_household_income) * p_target_amount, 2) as base_contribution,
    COALESCE(de.direct_total, 0) as direct_expenses_total,
    -- Contribución final = base - gastos directos
    ROUND((it.income / it.total_household_income) * p_target_amount, 2) - COALESCE(de.direct_total, 0) as final_contribution,
    ROUND((it.income / it.total_household_income) * 100, 2) as contribution_percentage
  FROM income_totals it
  LEFT JOIN direct_expenses de ON de.member_id = it.member_id;
END;
$$ LANGUAGE plpgsql;
```

---

## 📈 **VISTAS MATERIALIZADAS**

### Dashboard Principal

```sql
CREATE MATERIALIZED VIEW mv_household_dashboard_dual_flow AS
SELECT
  h.id as household_id,
  mp.period_month,
  mp.status as period_status,
  mp.target_amount,

  -- Totales por flujo
  SUM(CASE WHEN t.flow_type = 'comun' AND t.transaction_type = 'ingreso'
           THEN t.amount ELSE 0 END) as common_income,
  SUM(CASE WHEN t.flow_type = 'comun' AND t.transaction_type = 'gasto'
           THEN t.amount ELSE 0 END) as common_expenses,
  SUM(CASE WHEN t.flow_type = 'directo' AND t.transaction_type = 'gasto_directo'
           THEN t.amount ELSE 0 END) as direct_expenses,

  -- Balance neto (solo flujo común afecta)
  SUM(CASE WHEN t.flow_type = 'comun' AND t.transaction_type = 'ingreso'
           THEN t.amount ELSE 0 END) -
  SUM(CASE WHEN t.flow_type = 'comun' AND t.transaction_type = 'gasto'
           THEN t.amount ELSE 0 END) as net_balance,

  -- Métricas de progreso
  COUNT(CASE WHEN t.review_status = 'pending' THEN 1 END) as pending_reviews,
  COUNT(*) as total_transactions

FROM households h
LEFT JOIN monthly_periods mp ON mp.household_id = h.id
LEFT JOIN transactions t ON t.household_id = h.id AND t.period_month = mp.period_month
GROUP BY h.id, mp.period_month, mp.status, mp.target_amount;

-- Índice para performance
CREATE UNIQUE INDEX idx_mv_dashboard_dual_flow ON mv_household_dashboard_dual_flow(household_id, period_month);
```

---

## ✅ **VALIDACIONES Y CONSTRAINTS**

### Constraints de Negocio

```sql
-- Un gasto directo debe tener siempre un ingreso directo pareado
ALTER TABLE transactions ADD CONSTRAINT chk_direct_expense_paired
  CHECK (
    (transaction_type = 'gasto_directo' AND paired_transaction_id IS NOT NULL) OR
    (transaction_type != 'gasto_directo')
  );

-- Los ingresos directos son siempre ficticios (creados por sistema)
ALTER TABLE transactions ADD CONSTRAINT chk_direct_income_paired
  CHECK (
    (transaction_type = 'ingreso_directo' AND paired_transaction_id IS NOT NULL) OR
    (transaction_type != 'ingreso_directo')
  );

-- Coherencia de flujos
ALTER TABLE transactions ADD CONSTRAINT chk_flow_type_consistency
  CHECK (
    (flow_type = 'directo' AND transaction_type IN ('gasto_directo', 'ingreso_directo')) OR
    (flow_type = 'comun' AND transaction_type IN ('ingreso', 'gasto'))
  );
```

---

**🔥 MODELO DE DATOS DUAL-FLOW: Especificación técnica completa 🔥**

_Este modelo será implementado en las migraciones del sistema paralelo._
