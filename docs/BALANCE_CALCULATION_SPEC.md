# Especificación Técnica: Función calculate_member_balance()

**Fecha**: 19 Noviembre 2025
**Autor**: AI Assistant
**Issue**: #57 - Phase 1 (Análisis y Especificación)

---

## 🎯 Objetivo

Especificar la función PostgreSQL `calculate_member_balance()` que calculará dinámicamente el balance de crédito/deuda de cualquier miembro del hogar.

---

## 📋 Firma de la Función

```sql
CREATE OR REPLACE FUNCTION calculate_member_balance(
  p_household_id UUID,
  p_profile_id UUID,
  p_period_id UUID DEFAULT NULL,      -- NULL = agregado de todos los periodos
  p_year INTEGER DEFAULT NULL,        -- Alternativa: filtro por año/mes
  p_month INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
-- Implementación en Issue #58
$$;
```

**Ownership**: `cuentassik_owner` (SECURITY DEFINER para acceso desde `cuentassik_user`)

---

## 🧮 Fórmula de Cálculo

### Balance Base

```
Balance = Expected Contribution
        - (Actual Income Contributions + Direct Expenses)
        + Loans Received
        - Loan Repayments
```

### Interpretación

| Balance | Estado    | Significado                                                            |
| ------- | --------- | ---------------------------------------------------------------------- |
| > 0     | `credit`  | Miembro ha aportado MÁS de lo esperado (crédito a favor)               |
| < 0     | `debt`    | Miembro ha aportado MENOS de lo esperado O ha pedido préstamos (deuda) |
| = 0     | `settled` | Miembro está al día, sin crédito ni deuda                              |

---

## 📊 Componentes del Cálculo

### 1. Expected Contribution (Aportación Esperada)

**Fuente**:

- Tabla `member_monthly_income` (si existe columna `expected_contribution` por miembro)
- O calcular proporcionalmente desde `monthly_periods.expected_contribution`

**SQL**:

```sql
-- Opción A: Si existe member_monthly_income.expected_contribution
SELECT COALESCE(SUM(expected_contribution), 0)
FROM member_monthly_income
WHERE household_id = p_household_id
  AND profile_id = p_profile_id
  AND (p_period_id IS NULL OR period_id = p_period_id)
  AND (p_year IS NULL OR year = p_year)
  AND (p_month IS NULL OR month = p_month);

-- Opción B: Calcular proporcionalmente (legacy)
-- (Si no existe expected_contribution individual, usar contribution_percentage)
SELECT COALESCE(SUM(
  mp.expected_contribution * (mmi.contribution_percentage / 100.0)
), 0)
FROM monthly_periods mp
JOIN member_monthly_income mmi
  ON mmi.household_id = mp.household_id
  AND mmi.year = mp.year
  AND mmi.month = mp.month
WHERE mp.household_id = p_household_id
  AND mmi.profile_id = p_profile_id
  AND (p_period_id IS NULL OR mp.id = p_period_id)
  AND (p_year IS NULL OR mp.year = p_year)
  AND (p_month IS NULL OR mp.month = p_month);
```

**Nota**: Revisar esquema actual para determinar qué opción usar.

---

### 2. Actual Income Contributions (Aportaciones Reales)

**Fuente**: Tabla `transactions`

**Filtros**:

- `type = 'income'`
- `flow_type = 'common'`
- `profile_id = p_profile_id` (quien aportó)

**SQL**:

```sql
SELECT COALESCE(SUM(amount), 0)
FROM transactions
WHERE household_id = p_household_id
  AND profile_id = p_profile_id
  AND type = 'income'
  AND flow_type = 'common'
  AND (p_period_id IS NULL OR period_id = p_period_id)
  AND (
    p_year IS NULL OR p_month IS NULL OR
    (EXTRACT(YEAR FROM occurred_at) = p_year AND EXTRACT(MONTH FROM occurred_at) = p_month)
  );
```

---

### 3. Direct Expenses (Gastos Directos)

**Fuente**: Tabla `transactions`

**Filtros**:

- `type = 'expense_direct'`
- `flow_type = 'direct'`
- `performed_by_profile_id = p_profile_id` (quien realizó el gasto)

**Interpretación**: Los gastos directos son pagados "de bolsillo" por el miembro, reducen su balance disponible (aumento de deuda efectiva).

**SQL**:

```sql
SELECT COALESCE(SUM(amount), 0)
FROM transactions
WHERE household_id = p_household_id
  AND performed_by_profile_id = p_profile_id
  AND type = 'expense_direct'
  AND flow_type = 'direct'
  AND (p_period_id IS NULL OR period_id = p_period_id)
  AND (
    p_year IS NULL OR p_month IS NULL OR
    (EXTRACT(YEAR FROM occurred_at) = p_year AND EXTRACT(MONTH FROM occurred_at) = p_month)
  );
```

---

### 4. Loans Received (Préstamos Recibidos)

**Fuente**: Tabla `transactions` (DESPUÉS de Issue #58)

**Filtros**:

- `type = 'expense'`
- `flow_type = 'common'`
- `category_id = (SELECT id FROM categories WHERE name = 'Préstamo Personal' AND is_system = true)`
- `performed_by_profile_id = p_profile_id` (quien recibe el préstamo)

**Interpretación**: Un préstamo es dinero que el miembro "retira" del fondo común, aumentando su deuda.

**SQL**:

```sql
SELECT COALESCE(SUM(amount), 0)
FROM transactions t
JOIN categories c ON c.id = t.category_id
WHERE t.household_id = p_household_id
  AND t.performed_by_profile_id = p_profile_id
  AND t.type = 'expense'
  AND t.flow_type = 'common'
  AND c.name = 'Préstamo Personal'
  AND c.is_system = true
  AND (p_period_id IS NULL OR t.period_id = p_period_id)
  AND (
    p_year IS NULL OR p_month IS NULL OR
    (EXTRACT(YEAR FROM t.occurred_at) = p_year AND EXTRACT(MONTH FROM t.occurred_at) = p_month)
  );
```

---

### 5. Loan Repayments (Devoluciones de Préstamo)

**Fuente**: Tabla `transactions` (DESPUÉS de Issue #58)

**Filtros**:

- `type = 'income'`
- `flow_type = 'common'`
- `category_id = (SELECT id FROM categories WHERE name = 'Pago Préstamo' AND is_system = true)`
- `profile_id = p_profile_id` (quien devuelve)

**Interpretación**: Una devolución reduce la deuda del miembro.

**SQL**:

```sql
SELECT COALESCE(SUM(amount), 0)
FROM transactions t
JOIN categories c ON c.id = t.category_id
WHERE t.household_id = p_household_id
  AND t.profile_id = p_profile_id
  AND t.type = 'income'
  AND t.flow_type = 'common'
  AND c.name = 'Pago Préstamo'
  AND c.is_system = true
  AND (p_period_id IS NULL OR t.period_id = p_period_id)
  AND (
    p_year IS NULL OR p_month IS NULL OR
    (EXTRACT(YEAR FROM t.occurred_at) = p_year AND EXTRACT(MONTH FROM t.occurred_at) = p_month)
  );
```

---

## 📦 Estructura de Retorno (JSONB)

```json
{
  "balance": 150.5,
  "status": "credit",
  "breakdown": {
    "expected_contribution": 1000.0,
    "actual_contributions": 1100.0,
    "direct_expenses": 50.0,
    "loans_received": 0.0,
    "loan_repayments": 0.0
  },
  "summary": "Tienes un crédito de €150.50 a tu favor. Has aportado más de lo esperado."
}
```

### Campos

| Campo                             | Tipo    | Descripción                                                         |
| --------------------------------- | ------- | ------------------------------------------------------------------- |
| `balance`                         | NUMERIC | Balance final (positivo = crédito, negativo = deuda, cero = al día) |
| `status`                          | TEXT    | Estado: `credit`, `debt`, `settled`                                 |
| `breakdown`                       | JSONB   | Desglose detallado de componentes                                   |
| `breakdown.expected_contribution` | NUMERIC | Aportación esperada total                                           |
| `breakdown.actual_contributions`  | NUMERIC | Aportaciones reales realizadas                                      |
| `breakdown.direct_expenses`       | NUMERIC | Gastos directos del miembro                                         |
| `breakdown.loans_received`        | NUMERIC | Préstamos recibidos del hogar                                       |
| `breakdown.loan_repayments`       | NUMERIC | Devoluciones de préstamos                                           |
| `summary`                         | TEXT    | Mensaje legible para UI                                             |

---

## 🔄 Lógica de Negocio

### Determinación de Status

```sql
CASE
  WHEN v_balance > 0 THEN 'credit'
  WHEN v_balance < 0 THEN 'debt'
  ELSE 'settled'
END
```

### Generación de Summary

```sql
CASE
  WHEN v_balance > 0 THEN
    format('Tienes un crédito de %s a tu favor.',
           to_char(v_balance, 'FM€999,999,999.00'))
  WHEN v_balance < 0 THEN
    format('Tienes una deuda de %s.',
           to_char(ABS(v_balance), 'FM€999,999,999.00'))
  ELSE
    'Estás al día, sin crédito ni deuda.'
END
```

---

## 🛡️ Validaciones y Edge Cases

### 1. Household Inexistente

```sql
IF NOT EXISTS (SELECT 1 FROM households WHERE id = p_household_id) THEN
  RAISE EXCEPTION 'Household % no existe', p_household_id;
END IF;
```

### 2. Miembro No Pertenece al Household

```sql
IF NOT EXISTS (
  SELECT 1 FROM household_members
  WHERE household_id = p_household_id AND profile_id = p_profile_id
) THEN
  RAISE EXCEPTION 'Profile % no es miembro del household %',
    p_profile_id, p_household_id;
END IF;
```

### 3. Periodo Inválido

```sql
IF p_period_id IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM monthly_periods WHERE id = p_period_id
) THEN
  RAISE EXCEPTION 'Periodo % no existe', p_period_id;
END IF;
```

### 4. Año/Mes Sin Datos

Si no hay transactions ni expected_contribution para el periodo solicitado:

- Balance = 0
- Status = 'settled'
- Summary = "No hay datos para este periodo."

---

## 🔍 Escenarios de Uso

### Escenario 1: Balance Actual (Sin Filtros)

```sql
SELECT calculate_member_balance(
  '123e4567-e89b-12d3-a456-426614174000',  -- household_id
  '987fcdeb-51a2-43c1-9876-543210abcdef'   -- profile_id
);
```

**Resultado**: Balance agregado de TODOS los periodos históricos.

---

### Escenario 2: Balance de Periodo Específico

```sql
SELECT calculate_member_balance(
  '123e4567-e89b-12d3-a456-426614174000',  -- household_id
  '987fcdeb-51a2-43c1-9876-543210abcdef',  -- profile_id
  '456def78-90ab-12cd-3456-789012345678'   -- period_id (Noviembre 2025)
);
```

**Resultado**: Balance SOLO de ese periodo mensual.

---

### Escenario 3: Balance Histórico por Año/Mes

```sql
SELECT calculate_member_balance(
  '123e4567-e89b-12d3-a456-426614174000',  -- household_id
  '987fcdeb-51a2-43c1-9876-543210abcdef',  -- profile_id
  NULL,                                     -- period_id
  2024,                                     -- year
  12                                        -- month (Diciembre 2024)
);
```

**Resultado**: Balance de Diciembre 2024 (incluso si no existe period_id).

---

## ⚡ Performance y Optimización

### Índices Necesarios

Verificar existencia de índices en `transactions`:

```sql
-- Ya existentes (verificar con \d transactions)
CREATE INDEX IF NOT EXISTS idx_transactions_household_profile_type
  ON transactions(household_id, profile_id, type);

CREATE INDEX IF NOT EXISTS idx_transactions_household_category
  ON transactions(household_id, category_id);

CREATE INDEX IF NOT EXISTS idx_transactions_period
  ON transactions(period_id) WHERE period_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_occurred_at
  ON transactions(occurred_at);
```

### Estimación de Performance

Con 10,000 transacciones por household:

- **Sin índices**: ~500ms
- **Con índices optimizados**: ~50ms

**Target**: < 100ms para cualquier household.

---

## 🧪 Plan de Testing

Ver `database/migrations/20251118_220000_test_balance_calculation.sql` (Issue #62).

**Casos de prueba**:

1. Balance con solo contribuciones
2. Balance con gastos directos
3. Balance con préstamo activo
4. Balance con préstamo devuelto parcialmente
5. Balance de periodo específico vs agregado
6. Balance con múltiples periodos históricos
7. Miembro sin transactions (balance = 0)

---

## 📎 Dependencias

### Antes de Implementar

- [x] Auditoría de datos legacy (este documento)
- [ ] Crear categorías sistema (Issue #58, Tarea 2.1)
- [ ] Verificar estructura `member_monthly_income`

### Después de Implementar

- [ ] Tests unitarios SQL (Issue #62)
- [ ] Integración en Server Actions (Issue #60)
- [ ] UI consume función (Issue #61)

---

## 🔄 Mantenimiento

### Versionado de Función

```sql
-- v1.0.0 - 19 Nov 2025
-- Initial implementation

-- v1.1.0 - Futuro (ejemplo)
-- + Soporte para múltiples monedas
-- + Cálculo de intereses (si aplica)
```

**Estrategia**: No borrar versiones antiguas, crear nuevas con sufijo `_v2`, etc.

---

## ✅ Checklist de Implementación (Issue #58)

- [ ] Crear función en migración `20251118_160000_create_balance_calculation.sql`
- [ ] Establecer ownership: `ALTER FUNCTION ... OWNER TO cuentassik_owner`
- [ ] Otorgar permisos: `GRANT EXECUTE ON FUNCTION ... TO cuentassik_user`
- [ ] Documentar en comentarios SQL (`COMMENT ON FUNCTION ...`)
- [ ] Tests unitarios pasando (Issue #62)
- [ ] Regenerar types TypeScript: `npm run types:generate:dev`

---

**✅ Especificación completada**
**Próximo documento**: `docs/MIGRATION_PLAN_BALANCE.md`
