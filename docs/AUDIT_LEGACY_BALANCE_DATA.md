# Auditoría de Datos Legacy - Sistema Balance

**Fecha**: 19 Noviembre 2025
**Autor**: AI Assistant
**Issue**: #57 - Phase 1 (Análisis y Especificación)

---

## 🎯 Objetivo

Auditar las tablas legacy del sistema de balance/crédito/deuda para planificar su migración al sistema integrado basado en `transactions`.

---

## 📊 Estado Actual de Datos

### Entornos Analizados

**Fecha auditoría**: 2025-11-19

| Tabla            | DEV (Registros) | PROD (Registros) | Estado   |
| ---------------- | --------------- | ---------------- | -------- |
| `personal_loans` | 0               | 0                | ✅ Vacía |
| `refund_claims`  | 0               | 0                | ✅ Vacía |
| `member_credits` | 0               | 0                | ✅ Vacía |

**Conclusión**: Las tres tablas legacy están **completamente vacías** en ambos entornos.

**Implicación**: La migración de datos será **TRIVIAL** ya que no hay datos históricos que preservar.

---

## 🗄️ Estructura de Tablas Legacy

### 1. `personal_loans` (16 columnas)

**Propósito**: Gestionar préstamos personales desde el fondo del hogar.

```sql
CREATE TABLE personal_loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'settled')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  requested_by UUID NOT NULL REFERENCES profiles(id),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  withdrawal_transaction_id UUID REFERENCES transactions(id),
  settled_at TIMESTAMPTZ,
  settled_by UUID REFERENCES profiles(id),
  settlement_transaction_id UUID REFERENCES transactions(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Índices** (6):

- `idx_personal_loans_active` - Préstamos activos por household/profile
- `idx_personal_loans_household`
- `idx_personal_loans_pending` - Préstamos pendientes de aprobación
- `idx_personal_loans_profile`
- `idx_personal_loans_status`

**Foreign Keys** (7):

- household_id → households
- profile_id → profiles
- requested_by → profiles
- approved_by → profiles
- settled_by → profiles
- withdrawal_transaction_id → transactions
- settlement_transaction_id → transactions

**Workflow implícito**:

1. Usuario solicita préstamo → `status='pending'`
2. Admin aprueba → `status='approved'`, crea transaction de "retiro"
3. Usuario devuelve → `status='settled'`, crea transaction de "pago"

**Problema**: Sistema de estados complejo, transacciones vinculadas pero **NO integradas** en cálculo de balance.

---

### 2. `refund_claims` (13 columnas)

**Propósito**: Reclamar reembolsos por gastos directos pagados "de bolsillo".

```sql
CREATE TABLE refund_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  expense_transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  refund_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  refund_amount NUMERIC(10,2) NOT NULL CHECK (refund_amount > 0),
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_profile_id UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  approved_by_profile_id UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Índices** (4):

- `idx_refund_claims_expense_tx`
- `idx_refund_claims_household`
- `idx_refund_claims_profile`
- `idx_refund_claims_status`

**Foreign Keys** (5):

- household_id → households
- expense_transaction_id → transactions
- refund_transaction_id → transactions
- profile_id → profiles
- created_by_profile_id → profiles
- approved_by_profile_id → profiles

**Constraint especial**: `expense_must_be_direct` (validación de gasto directo)

**Workflow implícito**:

1. Usuario gasta "de su bolsillo" → crea transaction tipo `expense_direct`
2. Crea refund_claim vinculado al gasto
3. Admin aprueba → genera refund_transaction
4. Sistema complejo de seguimiento entre gastos y reembolsos

**Problema**: Confusión conceptual. Si un gasto directo es "de bolsillo", ¿por qué necesita reembolso? Ya está integrado en flujo dual (Issue #30, #33).

**Análisis crítico**: Esta tabla parece **redundante** con el sistema de flujo dual existente. Los gastos directos (`expense_direct`) ya están contemplados en el cálculo de balance.

---

### 3. `member_credits` (18 columnas)

**Propósito**: Gestionar créditos a favor de miembros (excedentes de aportación).

```sql
CREATE TABLE member_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID,
  profile_id UUID,
  amount NUMERIC,
  currency TEXT,
  source_period_id UUID,
  source_month INTEGER,
  source_year INTEGER,
  status TEXT,
  applied_to_period_id UUID,
  applied_to_contribution_id UUID,
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  monthly_decision TEXT
    CHECK (monthly_decision IN ('apply_to_month', 'keep_active', 'transfer_to_savings')),
  reserved_at TIMESTAMPTZ,
  created_by_profile_id UUID REFERENCES profiles(id),
  updated_by_profile_id UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Índices** (3):

- `idx_member_credits_created_by`
- `idx_member_credits_household_creator`
- `idx_member_credits_updated_by`

**Foreign Keys** (2):

- created_by_profile_id → profiles
- updated_by_profile_id → profiles

**Workflow implícito**:

1. Usuario aporta más de lo esperado en un periodo → genera crédito
2. Crédito puede:
   - Aplicarse a siguiente mes (`apply_to_month`)
   - Mantenerse activo (`keep_active`)
   - Transferirse a ahorros (`transfer_to_savings`)
3. Sistema de estados para tracking

**Problema**: Los créditos **DEBEN calcularse dinámicamente** basándose en aportaciones vs esperado. Almacenarlos en tabla separada introduce:

- Duplicación de datos
- Riesgo de desincronización
- Complejidad innecesaria

**Análisis crítico**: Esta tabla es **completamente innecesaria**. El balance de un miembro puede calcularse en cualquier momento con:

```sql
Balance = Expected Contribution
        - (Actual Income Contributions + Direct Expenses)
        + Loans Received
        - Loan Repayments
```

Si Balance > 0 → Crédito
Si Balance < 0 → Deuda

---

## 🔍 Análisis de Impacto

### Datos Existentes

**✅ RESULTADO**: **CERO datos en las tres tablas** (ambos entornos).

**Implicación**: **NO hay migración de datos que realizar**. Solo deprecar estructura.

---

### Relaciones con Otras Tablas

#### `personal_loans`

- **Vincula** transactions existentes (withdrawal_transaction_id, settlement_transaction_id)
- **Problema**: Estas transactions NO están categorizadas como "préstamo"
- **Solución**: Crear categorías sistema y usar transactions directamente

#### `refund_claims`

- **Vincula** transactions de tipo `expense_direct` y refund
- **Problema**: Confusión con flujo dual existente
- **Solución**: Los gastos directos ya afectan balance. Eliminar concepto de "refund_claim".

#### `member_credits`

- **NO vincula** otras tablas (solo profiles)
- **Problema**: Datos calculables almacenados
- **Solución**: Calcular dinámicamente con función PostgreSQL

---

## 📋 Inventario de Columnas Legacy

### Total: 47 columnas en 3 tablas

| Tabla            | Columnas | Mantenimiento        | Complejidad       |
| ---------------- | -------- | -------------------- | ----------------- |
| `personal_loans` | 16       | Alta (triggers, FKs) | Alta (estados)    |
| `refund_claims`  | 13       | Media (FKs, checks)  | Media (workflow)  |
| `member_credits` | 18       | Media (triggers)     | Alta (decisiones) |

**Todas reemplazables por**:

- 2 categorías sistema ("Préstamo Personal", "Pago Préstamo")
- 1 función PostgreSQL (`calculate_member_balance()`)
- 0 tablas adicionales

**Reducción**: 47 columnas + 3 tablas → 2 categorías + 1 función

---

## ✅ Conclusiones

### 1. Estado de Datos

- ✅ **Tablas completamente vacías** (DEV y PROD)
- ✅ **NO hay datos históricos** que migrar
- ✅ **NO hay usuarios afectados** por cambio de estructura

### 2. Oportunidad

Esta situación es **IDEAL** para el rediseño:

- No hay datos legacy que convertir
- No hay riesgo de pérdida de información
- Podemos deprecar tablas inmediatamente (sin datos)
- Rollback trivial si es necesario

### 3. Estrategia de Migración

Dado que las tablas están vacías:

**Fase 3 (Issue #59) será MUY SIMPLE**:

1. ~~Migrar personal_loans → transactions~~ (NO hay datos)
2. ~~Migrar refund_claims → transactions~~ (NO hay datos)
3. ~~Migrar member_credits~~ (NO hay datos, se calculará)
4. Renombrar tablas: `_legacy_personal_loans`, etc.
5. Mantener durante 6 meses (seguridad)
6. Eliminar en v4.0.0

**Tiempo estimado Fase 3**: 30 minutos (vs 3+ horas si tuviera datos)

### 4. Riesgos Identificados

| Riesgo                                | Probabilidad | Impacto | Mitigación                              |
| ------------------------------------- | ------------ | ------- | --------------------------------------- |
| Código referencia tablas legacy       | Media        | Alto    | Buscar referencias antes de deprecar    |
| Triggers/Functions dependen de tablas | Baja         | Medio   | Auditar funciones PostgreSQL            |
| UI usa datos legacy                   | Media        | Alto    | Revisar `/app/sickness/credito-deuda/*` |

### 5. Siguiente Paso

Proceder con **Tarea 5.2** (Issue #57): Diseñar categorías sistema y especificar función `calculate_member_balance()`.

---

## 📎 Referencias

- **Issue #57**: Phase 1 - Análisis y Especificación
- **Issue #58**: Phase 2 - Implementación Base (categorías y función)
- **Issue #59**: Phase 3 - Migración de Datos Legacy
- **Baseline Schema**: `database/migrations/20251105_150000_baseline_v3.0.0_complete.sql`
- **Issues previos**: #30 (real_payer_id), #33 (paid_by)

---

**✅ Auditoría completada exitosamente**
**Próximo documento**: `docs/BALANCE_CALCULATION_SPEC.md`
