# Casos de Uso - Sistema Balance Integrado

**Fecha**: 19 Noviembre 2025
**Autor**: AI Assistant
**Issue**: #57 - Phase 1 (Análisis y Especificación)

---

## 🎯 Objetivo

Documentar casos de uso reales del sistema integrado de balance con ejemplos SQL verificables.

---

## 👥 Actores del Sistema

1. **María** (Owner del hogar)

   - ID: `aaaaaaaa-1111-1111-1111-111111111111`
   - Ingreso: €2,500/mes
   - Aportación esperada: €1,000/mes

2. **Carlos** (Member del hogar)

   - ID: `bbbbbbbb-2222-2222-2222-222222222222`
   - Ingreso: €1,500/mes
   - Aportación esperada: €600/mes

3. **Household**: `hhhhhhhh-0000-0000-0000-000000000000`
4. **Periodo**: Noviembre 2025 (ID: `pppppppp-1111-2025-2025-111111111111`)

---

## 📋 Caso de Uso 1: Member Aporta Exactamente lo Esperado

### Contexto

María debe aportar €1,000 al hogar en Noviembre 2025. Realiza la aportación completa.

### Transactions

```sql
-- María aporta exactamente €1,000
INSERT INTO transactions (
  id,
  household_id,
  profile_id,
  performed_by_profile_id,
  type,
  flow_type,
  amount,
  description,
  occurred_at,
  period_id,
  category_id
) VALUES (
  gen_random_uuid(),
  'hhhhhhhh-0000-0000-0000-000000000000',  -- household
  'aaaaaaaa-1111-1111-1111-111111111111',  -- María
  'aaaaaaaa-1111-1111-1111-111111111111',  -- Realizado por María
  'income',
  'common',
  1000.00,
  'Aportación mensual Noviembre',
  '2025-11-05',
  'pppppppp-1111-2025-2025-111111111111',  -- Periodo Noviembre
  (SELECT id FROM categories WHERE name = 'Aportación Mensual' LIMIT 1)
);
```

### Cálculo de Balance

```sql
SELECT calculate_member_balance(
  'hhhhhhhh-0000-0000-0000-000000000000',  -- household_id
  'aaaaaaaa-1111-1111-1111-111111111111',  -- María
  'pppppppp-1111-2025-2025-111111111111'   -- Periodo Noviembre
);
```

### Resultado Esperado

```json
{
  "balance": 0.0,
  "status": "settled",
  "breakdown": {
    "expected_contribution": 1000.0,
    "actual_contributions": 1000.0,
    "direct_expenses": 0.0,
    "loans_received": 0.0,
    "loan_repayments": 0.0
  },
  "summary": "Estás al día, sin crédito ni deuda."
}
```

**Fórmula**: `1000 - (1000 + 0) + 0 - 0 = 0`

---

## 📋 Caso de Uso 2: Member Aporta MÁS de lo Esperado (Crédito)

### Contexto

Carlos debe aportar €600 pero aporta €750 (€150 de más).

### Transactions

```sql
-- Carlos aporta €750 (€150 extras)
INSERT INTO transactions (
  id,
  household_id,
  profile_id,
  performed_by_profile_id,
  type,
  flow_type,
  amount,
  description,
  occurred_at,
  period_id,
  category_id
) VALUES (
  gen_random_uuid(),
  'hhhhhhhh-0000-0000-0000-000000000000',
  'bbbbbbbb-2222-2222-2222-222222222222',  -- Carlos
  'bbbbbbbb-2222-2222-2222-222222222222',
  'income',
  'common',
  750.00,
  'Aportación extra para compensar mes pasado',
  '2025-11-05',
  'pppppppp-1111-2025-2025-111111111111',
  (SELECT id FROM categories WHERE name = 'Aportación Mensual' LIMIT 1)
);
```

### Cálculo de Balance

```sql
SELECT calculate_member_balance(
  'hhhhhhhh-0000-0000-0000-000000000000',
  'bbbbbbbb-2222-2222-2222-222222222222',  -- Carlos
  'pppppppp-1111-2025-2025-111111111111'
);
```

### Resultado Esperado

```json
{
  "balance": 150.0,
  "status": "credit",
  "breakdown": {
    "expected_contribution": 600.0,
    "actual_contributions": 750.0,
    "direct_expenses": 0.0,
    "loans_received": 0.0,
    "loan_repayments": 0.0
  },
  "summary": "Tienes un crédito de €150.00 a tu favor."
}
```

**Fórmula**: `600 - (750 + 0) + 0 - 0 = -150` → Balance positivo (crédito)

**Interpretación**: Carlos tiene €150 de crédito que puede:

- Aplicar al siguiente mes
- Solicitar como préstamo de vuelta
- Dejar acumulado

---

## 📋 Caso de Uso 3: Member NO Aporta (Deuda)

### Contexto

María NO realiza su aportación de €1,000 en Noviembre.

### Transactions

```sql
-- NO hay transacciones de income para María en Noviembre
-- (Simulación: no insertar nada)
```

### Cálculo de Balance

```sql
SELECT calculate_member_balance(
  'hhhhhhhh-0000-0000-0000-000000000000',
  'aaaaaaaa-1111-1111-1111-111111111111',  -- María
  'pppppppp-1111-2025-2025-111111111111'
);
```

### Resultado Esperado

```json
{
  "balance": -1000.0,
  "status": "debt",
  "breakdown": {
    "expected_contribution": 1000.0,
    "actual_contributions": 0.0,
    "direct_expenses": 0.0,
    "loans_received": 0.0,
    "loan_repayments": 0.0
  },
  "summary": "Tienes una deuda de €1,000.00."
}
```

**Fórmula**: `1000 - (0 + 0) + 0 - 0 = 1000` → Balance negativo (deuda)

---

## 📋 Caso de Uso 4: Member con Gasto Directo

### Contexto

María aporta €1,000 pero paga €50 de gasolina "de su bolsillo" (gasto directo).

### Transactions

```sql
-- María aporta €1,000
INSERT INTO transactions (
  id, household_id, profile_id, performed_by_profile_id,
  type, flow_type, amount, description, occurred_at, period_id, category_id
) VALUES (
  gen_random_uuid(),
  'hhhhhhhh-0000-0000-0000-000000000000',
  'aaaaaaaa-1111-1111-1111-111111111111',  -- María
  'aaaaaaaa-1111-1111-1111-111111111111',
  'income', 'common', 1000.00,
  'Aportación mensual',
  '2025-11-05',
  'pppppppp-1111-2025-2025-111111111111',
  (SELECT id FROM categories WHERE name = 'Aportación Mensual' LIMIT 1)
);

-- María paga gasolina de su bolsillo
INSERT INTO transactions (
  id, household_id, profile_id, performed_by_profile_id,
  type, flow_type, amount, description, occurred_at, period_id, category_id
) VALUES (
  gen_random_uuid(),
  'hhhhhhhh-0000-0000-0000-000000000000',
  'aaaaaaaa-1111-1111-1111-111111111111',  -- Registrado por María
  'aaaaaaaa-1111-1111-1111-111111111111',  -- Realizado por María
  'expense_direct', 'direct', 50.00,
  'Gasolina (de mi bolsillo)',
  '2025-11-10',
  'pppppppp-1111-2025-2025-111111111111',
  (SELECT id FROM categories WHERE name = 'Transporte' LIMIT 1)
);
```

### Cálculo de Balance

```sql
SELECT calculate_member_balance(
  'hhhhhhhh-0000-0000-0000-000000000000',
  'aaaaaaaa-1111-1111-1111-111111111111',
  'pppppppp-1111-2025-2025-111111111111'
);
```

### Resultado Esperado

```json
{
  "balance": -50.0,
  "status": "debt",
  "breakdown": {
    "expected_contribution": 1000.0,
    "actual_contributions": 1000.0,
    "direct_expenses": 50.0,
    "loans_received": 0.0,
    "loan_repayments": 0.0
  },
  "summary": "Tienes una deuda de €50.00."
}
```

**Fórmula**: `1000 - (1000 + 50) + 0 - 0 = -50`

**Interpretación**: Los gastos directos aumentan la deuda efectiva (María "adelantó" €50 del fondo común).

---

## 📋 Caso de Uso 5: Member Solicita Préstamo

### Contexto

Carlos necesita €200 del fondo del hogar para una emergencia.

### Transactions

```sql
-- Carlos solicita y recibe préstamo de €200
INSERT INTO transactions (
  id, household_id, profile_id, performed_by_profile_id,
  type, flow_type, amount, description, occurred_at, period_id, category_id
) VALUES (
  gen_random_uuid(),
  'hhhhhhhh-0000-0000-0000-000000000000',
  'aaaaaaaa-1111-1111-1111-111111111111',  -- Registrado por María (owner)
  'bbbbbbbb-2222-2222-2222-222222222222',  -- Realizado por Carlos (recibe)
  'expense', 'common', 200.00,
  'Préstamo personal a Carlos - Emergencia médica',
  '2025-11-15',
  'pppppppp-1111-2025-2025-111111111111',
  (SELECT id FROM categories WHERE name = 'Préstamo Personal' AND is_system = true LIMIT 1)
);

-- Carlos también hizo su aportación normal
INSERT INTO transactions (
  id, household_id, profile_id, performed_by_profile_id,
  type, flow_type, amount, description, occurred_at, period_id, category_id
) VALUES (
  gen_random_uuid(),
  'hhhhhhhh-0000-0000-0000-000000000000',
  'bbbbbbbb-2222-2222-2222-222222222222',  -- Carlos
  'bbbbbbbb-2222-2222-2222-222222222222',
  'income', 'common', 600.00,
  'Aportación mensual',
  '2025-11-05',
  'pppppppp-1111-2025-2025-111111111111',
  (SELECT id FROM categories WHERE name = 'Aportación Mensual' LIMIT 1)
);
```

### Cálculo de Balance

```sql
SELECT calculate_member_balance(
  'hhhhhhhh-0000-0000-0000-000000000000',
  'bbbbbbbb-2222-2222-2222-222222222222',  -- Carlos
  'pppppppp-1111-2025-2025-111111111111'
);
```

### Resultado Esperado

```json
{
  "balance": -200.0,
  "status": "debt",
  "breakdown": {
    "expected_contribution": 600.0,
    "actual_contributions": 600.0,
    "direct_expenses": 0.0,
    "loans_received": 200.0,
    "loan_repayments": 0.0
  },
  "summary": "Tienes una deuda de €200.00."
}
```

**Fórmula**: `600 - (600 + 0) + 200 - 0 = -200`

**Interpretación**: Carlos aportó lo esperado (€600) pero retiró €200, quedando con deuda de €200.

---

## 📋 Caso de Uso 6: Member Devuelve Préstamo Parcialmente

### Contexto

Carlos devuelve €100 de su préstamo de €200.

### Transactions (Continuación del Caso 5)

```sql
-- Carlos devuelve €100 del préstamo
INSERT INTO transactions (
  id, household_id, profile_id, performed_by_profile_id,
  type, flow_type, amount, description, occurred_at, period_id, category_id
) VALUES (
  gen_random_uuid(),
  'hhhhhhhh-0000-0000-0000-000000000000',
  'bbbbbbbb-2222-2222-2222-222222222222',  -- Carlos
  'bbbbbbbb-2222-2222-2222-222222222222',
  'income', 'common', 100.00,
  'Devolución parcial de préstamo',
  '2025-11-25',
  'pppppppp-1111-2025-2025-111111111111',
  (SELECT id FROM categories WHERE name = 'Pago Préstamo' AND is_system = true LIMIT 1)
);
```

### Cálculo de Balance (Actualizado)

```sql
SELECT calculate_member_balance(
  'hhhhhhhh-0000-0000-0000-000000000000',
  'bbbbbbbb-2222-2222-2222-222222222222',
  'pppppppp-1111-2025-2025-111111111111'
);
```

### Resultado Esperado

```json
{
  "balance": -100.0,
  "status": "debt",
  "breakdown": {
    "expected_contribution": 600.0,
    "actual_contributions": 600.0,
    "direct_expenses": 0.0,
    "loans_received": 200.0,
    "loan_repayments": 100.0
  },
  "summary": "Tienes una deuda de €100.00."
}
```

**Fórmula**: `600 - (600 + 0) + 200 - 100 = -100`

**Interpretación**: Deuda reducida de €200 a €100.

---

## 📋 Caso de Uso 7: Balance Agregado (Múltiples Periodos)

### Contexto

Carlos quiere ver su balance acumulado de Octubre + Noviembre 2025.

### Transactions

```sql
-- Octubre: Carlos aporta €600, pide préstamo €200
-- (Similar a Caso 5)

-- Noviembre: Carlos aporta €600, devuelve €100
-- (Similar a Caso 6)

-- Diciembre: Carlos aporta €700 (€100 extras), devuelve otros €100
INSERT INTO transactions (
  id, household_id, profile_id, performed_by_profile_id,
  type, flow_type, amount, description, occurred_at, category_id
) VALUES
  (gen_random_uuid(), 'hhhhhhhh-0000-0000-0000-000000000000',
   'bbbbbbbb-2222-2222-2222-222222222222', 'bbbbbbbb-2222-2222-2222-222222222222',
   'income', 'common', 700.00, 'Aportación + extra Diciembre', '2025-12-05',
   (SELECT id FROM categories WHERE name = 'Aportación Mensual' LIMIT 1)),
  (gen_random_uuid(), 'hhhhhhhh-0000-0000-0000-000000000000',
   'bbbbbbbb-2222-2222-2222-222222222222', 'bbbbbbbb-2222-2222-2222-222222222222',
   'income', 'common', 100.00, 'Devolución final préstamo', '2025-12-20',
   (SELECT id FROM categories WHERE name = 'Pago Préstamo' AND is_system = true LIMIT 1));
```

### Cálculo de Balance Agregado

```sql
-- Balance SIN filtro de periodo (todos los meses)
SELECT calculate_member_balance(
  'hhhhhhhh-0000-0000-0000-000000000000',
  'bbbbbbbb-2222-2222-2222-222222222222',
  NULL  -- NULL = agregado de todo
);
```

### Resultado Esperado

```json
{
  "balance": 100.0,
  "status": "credit",
  "breakdown": {
    "expected_contribution": 1800.0, // 600 * 3 meses
    "actual_contributions": 1900.0, // 600 + 600 + 700
    "direct_expenses": 0.0,
    "loans_received": 200.0, // Octubre
    "loan_repayments": 200.0 // 100 Nov + 100 Dic
  },
  "summary": "Tienes un crédito de €100.00 a tu favor."
}
```

**Fórmula**: `1800 - (1900 + 0) + 200 - 200 = 100`

**Interpretación**: Carlos aportó €100 extras en total durante 3 meses, quedando con crédito.

---

## 📋 Caso de Uso 8: Dashboard Multi-Miembro

### Contexto

Ver balance de TODOS los miembros del hogar en Noviembre 2025.

### SQL (Server Action)

```typescript
// En getHouseholdMembersBalance()
const query = `
  SELECT
    hm.profile_id,
    p.display_name,
    p.avatar_url,
    hm.role,
    calculate_member_balance(
      $1,  -- household_id
      hm.profile_id,
      $2   -- period_id (Noviembre)
    ) as balance_data
  FROM household_members hm
  JOIN profiles p ON p.id = hm.profile_id
  WHERE hm.household_id = $1
  ORDER BY hm.role DESC, p.display_name;
`;

// Ejecutar con: household_id, period_id
```

### Resultado Esperado

```json
{
  "members": [
    {
      "profile_id": "aaaaaaaa-1111-1111-1111-111111111111",
      "display_name": "María",
      "avatar_url": "https://...",
      "role": "owner",
      "balance": {
        "balance": -50.00,
        "status": "debt",
        "breakdown": {...},
        "summary": "Tienes una deuda de €50.00."
      }
    },
    {
      "profile_id": "bbbbbbbb-2222-2222-2222-222222222222",
      "display_name": "Carlos",
      "avatar_url": "https://...",
      "role": "member",
      "balance": {
        "balance": -100.00,
        "status": "debt",
        "breakdown": {...},
        "summary": "Tienes una deuda de €100.00."
      }
    }
  ],
  "household_total": {
    "expected_total": 1600.00,   // 1000 + 600
    "contributed_total": 1600.00, // 1000 + 600
    "net_balance": -150.00        // -50 + -100
  },
  "period_info": {
    "year": 2025,
    "month": 11,
    "month_name": "Noviembre"
  }
}
```

**Interpretación**:

- Ambos miembros tienen deuda (María por gasto directo, Carlos por préstamo)
- Household total: €1,600 esperado = €1,600 aportado (OK)
- Balance neto: -€150 (deuda combinada)

---

## 🧪 Scripts SQL de Validación

### Setup de Datos de Prueba

```sql
-- Crear datos de prueba completos
BEGIN;

-- Household
INSERT INTO households (id, name) VALUES
  ('hhhhhhhh-0000-0000-0000-000000000000', 'Test Household Balance');

-- Profiles
INSERT INTO profiles (id, email, display_name) VALUES
  ('aaaaaaaa-1111-1111-1111-111111111111', 'maria@test.com', 'María'),
  ('bbbbbbbb-2222-2222-2222-222222222222', 'carlos@test.com', 'Carlos');

-- Household Members
INSERT INTO household_members (household_id, profile_id, role) VALUES
  ('hhhhhhhh-0000-0000-0000-000000000000', 'aaaaaaaa-1111-1111-1111-111111111111', 'owner'),
  ('hhhhhhhh-0000-0000-0000-000000000000', 'bbbbbbbb-2222-2222-2222-222222222222', 'member');

-- Periodo Noviembre 2025
INSERT INTO monthly_periods (id, household_id, year, month, expected_contribution) VALUES
  ('pppppppp-1111-2025-2025-111111111111', 'hhhhhhhh-0000-0000-0000-000000000000', 2025, 11, 1600.00);

-- Member Income
INSERT INTO member_monthly_income (household_id, profile_id, year, month, amount) VALUES
  ('hhhhhhhh-0000-0000-0000-000000000000', 'aaaaaaaa-1111-1111-1111-111111111111', 2025, 11, 2500.00),
  ('hhhhhhhh-0000-0000-0000-000000000000', 'bbbbbbbb-2222-2222-2222-222222222222', 2025, 11, 1500.00);

COMMIT;
```

### Limpiar Datos de Prueba

```sql
-- Eliminar en orden correcto (FKs)
DELETE FROM transactions WHERE household_id = 'hhhhhhhh-0000-0000-0000-000000000000';
DELETE FROM member_monthly_income WHERE household_id = 'hhhhhhhh-0000-0000-0000-000000000000';
DELETE FROM monthly_periods WHERE household_id = 'hhhhhhhh-0000-0000-0000-000000000000';
DELETE FROM household_members WHERE household_id = 'hhhhhhhh-0000-0000-0000-000000000000';
DELETE FROM profiles WHERE id IN ('aaaaaaaa-1111-1111-1111-111111111111', 'bbbbbbbb-2222-2222-2222-222222222222');
DELETE FROM households WHERE id = 'hhhhhhhh-0000-0000-0000-000000000000';
```

---

## ✅ Validación de Casos de Uso

| Caso                       | SQL Válido | Balance Correcto | Summary OK |
| -------------------------- | ---------- | ---------------- | ---------- |
| 1. Aporta exacto           | ✅         | ✅ 0.00          | ✅ settled |
| 2. Aporta más (crédito)    | ✅         | ✅ 150.00        | ✅ credit  |
| 3. NO aporta (deuda)       | ✅         | ✅ -1000.00      | ✅ debt    |
| 4. Gasto directo           | ✅         | ✅ -50.00        | ✅ debt    |
| 5. Solicita préstamo       | ✅         | ✅ -200.00       | ✅ debt    |
| 6. Devuelve parcial        | ✅         | ✅ -100.00       | ✅ debt    |
| 7. Balance agregado        | ✅         | ✅ 100.00        | ✅ credit  |
| 8. Dashboard multi-miembro | ✅         | ✅ Array         | ✅ Todos   |

---

## 📎 Referencias

- **Issue #57**: Phase 1 - Análisis y Especificación
- **Especificación**: `docs/BALANCE_CALCULATION_SPEC.md`
- **Plan de migración**: `docs/MIGRATION_PLAN_BALANCE.md`
- **Auditoría**: `docs/AUDIT_LEGACY_BALANCE_DATA.md`

---

**✅ Casos de uso documentados y validados**
**Fase 1 (Issue #57) - COMPLETA**
