# Sistema de Balance Personal en CuentasSiK

**Fecha**: 20 Noviembre 2025
**Versión**: 1.0.0
**Estado**: ✅ Implementado y Funcional

---

## 📚 Índice

1. [Arquitectura General](#arquitectura-general)
2. [Tipos de Flujo](#tipos-de-flujo)
3. [Cálculo de Balance Personal](#cálculo-de-balance-personal)
4. [Integración con Periodos Mensuales](#integración-con-periodos-mensuales)
5. [Queries SQL](#queries-sql)
6. [Componentes UI](#componentes-ui)
7. [Ejemplos Prácticos](#ejemplos-prácticos)

---

## Arquitectura General

El sistema de balance personal en CuentasSiK rastrea el equilibrio financiero de cada miembro con respecto al hogar. Este balance es **GLOBAL y ACUMULADO**, persistiendo entre períodos mensuales.

### Principio Fundamental

```
Balance Personal = Contribuciones al Hogar - Consumo Proporcional - Deuda de Préstamos
```

**Interpretación**:

- **Balance > 0**: Miembro tiene crédito a favor (ha aportado más de lo que consumió)
- **Balance < 0**: Miembro tiene deuda con el hogar (ha consumido más de lo que aportó)
- **Balance = 0**: Miembro está equilibrado

### Diferencia con Contribuciones Mensuales

| Aspecto             | Balance Personal (Global)   | Contribuciones Mensuales |
| ------------------- | --------------------------- | ------------------------ |
| **Ámbito**          | Acumulado histórico         | Por período específico   |
| **Ubicación**       | `/sickness/credito-deuda`   | `/sickness/periodo`      |
| **Tabla Principal** | Calculado dinámicamente     | `contributions`          |
| **Persistencia**    | Entre períodos              | Solo en período activo   |
| **Reset**           | Nunca (salvo ajuste manual) | Cada mes nuevo           |

---

## Tipos de Flujo

### 1. Flujo Común (`flow_type = 'common'`)

Transacciones que afectan el **balance del hogar completo**.

**Ejemplos**:

- ✅ **Ingresos comunes** (`type='income'`): Aportaciones de miembros a la cuenta conjunta
- ✅ **Gastos comunes** (`type='expense'`): Supermercado, facturas, gastos compartidos
- ✅ **Préstamos del hogar** (`category='Préstamo Personal'`): Préstamo desde fondo común a un miembro
- ✅ **Pago de préstamos** (`category='Pago Préstamo'`): Devolución de préstamo al hogar

**Características**:

- Todos los miembros "consumen" proporcionalmente
- Afectan el balance global del hogar
- Se consideran en el cálculo de crédito/deuda

### 2. Flujo Directo (`flow_type = 'direct'`)

Transacciones que afectan **solo al miembro que las ejecuta**.

**Ejemplos**:

- ✅ **Gastos directos** (`type='expense_direct'`): Compras personales con dinero propio
- ✅ **Ingresos directos** (`type='income_direct'`): Ingresos personales (salario, etc.)

**Características**:

- NO afectan el balance global del hogar
- Solo visibles en el balance personal del miembro
- NO se consideran en cálculo de crédito/deuda
- Se usan para calcular contribuciones esperadas

---

## Cálculo de Balance Personal

### Fórmula Detallada

```typescript
Balance Personal = balance_periodos - deuda_prestamos

Donde:
  balance_periodos = Σ(overpaid_amount - pending_amount) de todos los períodos cerrados/activos
  deuda_prestamos = Σ(prestamos_recibidos - devoluciones_hechas)
```

### Componentes del Balance

#### 1. Balance de Períodos

**Fuente**: Tabla `monthly_periods` + cálculo de contribuciones

**Cálculo por Período**:

```typescript
periodo_balance = overpaid_amount - pending_amount

Donde:
  overpaid_amount = paid - expected  (cuando paid > expected)
  pending_amount = expected - paid   (cuando paid < expected)
```

**Ejemplo Octubre 2025**:

```
Kava:
  expected_contribution: €477.37
  paid_direct: €327.00
  paid_common: €150.36
  total_paid: €477.36
  overpaid: €0.00 (477.36 ≈ 477.37)
  pending: €0.00
  periodo_balance: €0.00
```

#### 2. Deuda de Préstamos

**Fuente**: Tabla `transactions` con categorías especiales

**Categorías del Sistema**:

- **`Préstamo Personal`**: Dinero recibido del fondo común (INCREMENTA deuda)
- **`Pago Préstamo`**: Dinero devuelto al fondo común (DECREMENTA deuda)

**Cálculo**:

```sql
deuda_prestamos =
  SUM(CASE WHEN category_name = 'Préstamo Personal' THEN amount ELSE 0 END) -
  SUM(CASE WHEN category_name = 'Pago Préstamo' THEN amount ELSE 0 END)
```

**Ejemplo**:

```
Kava solicita préstamo de €500 → deuda_prestamos = +€500
Kava devuelve €200 → deuda_prestamos = +€300
Kava devuelve €300 → deuda_prestamos = €0
```

#### 3. Balance Final

**Combinación**:

```typescript
// lib/balance/queries.ts - línea 144
current_balance = (balances.get(m.profile_id) ?? 0) - (loanDebtMap.get(m.profile_id) ?? 0);
```

**Ejemplo Completo**:

```
Usuario: Kava
  balance_periodos: +€50.00 (ha aportado de más históricamente)
  deuda_prestamos: +€300.00 (debe del préstamo)

Balance Final: €50.00 - €300.00 = -€250.00 (DEUDA)

Interpretación: Aunque Kava tiene crédito histórico de €50, su deuda de préstamo
de €300 hace que su balance final sea negativo (€250 de deuda neta).
```

---

## Integración con Periodos Mensuales

### Tabla `monthly_periods`

**Campos Relevantes**:

```sql
id UUID PRIMARY KEY
household_id UUID
year INTEGER
month INTEGER
phase period_phase_enum  -- 'preparing', 'validation', 'active', 'closing', 'closed'
status TEXT              -- 'open', 'pending_close', 'closed'
```

### Fases del Período

| Fase           | Descripción             | Impacto en Balance         |
| -------------- | ----------------------- | -------------------------- |
| **preparing**  | Preparación inicial     | NO contar pagos reales     |
| **validation** | Validación de ingresos  | Contar pagos realizados    |
| **active**     | Período activo          | Contar pagos realizados    |
| **closing**    | En proceso de cierre    | Contar pagos realizados    |
| **closed**     | Cerrado definitivamente | Contar pagos realizados ✅ |

### ⚠️ Bug Crítico Resuelto (Issue #60)

**Problema Anterior** (hasta commit d8e0480):

```typescript
// ❌ INCORRECTO
const shouldCountDirectAsPaid = currentPhase === 'validation' || currentPhase === 'active';
// PROBLEMA: Excluía 'closed', causando cálculos incorrectos en períodos cerrados
```

**Solución Implementada**:

```typescript
// ✅ CORRECTO
const shouldCountDirectAsPaid = currentPhase !== 'preparing';
// Ahora 'closed' también cuenta pagos: shouldCountDirectAsPaid = true
```

**Resultado**:

- ✅ Períodos cerrados mantienen cálculos correctos
- ✅ Balance NO cambia al cerrar el período
- ✅ Consistencia entre períodos activos y cerrados

**Documentación**: `docs/ANALISIS_PROBLEMA_PERIODOS_CERRADOS.md`

---

## Queries SQL

### 1. Obtener Balance de Todos los Miembros

**Ubicación**: `lib/balance/queries.ts` → `getMemberBalances()`

```sql
-- Paso 1: Obtener miembros del hogar
SELECT
  hm.profile_id,
  p.display_name,
  p.email,
  p.avatar_url,
  hm.role
FROM household_members hm
JOIN profiles p ON p.id = hm.profile_id
WHERE hm.household_id = $1
ORDER BY p.email;

-- Paso 2: Obtener períodos cerrados/activos
SELECT id, year, month, phase
FROM monthly_periods
WHERE household_id = $1
  AND phase IN ('active', 'closing', 'closed')
ORDER BY year, month;

-- Paso 3: Calcular deuda de préstamos
SELECT
  t.performed_by_profile_id as profile_id,
  COALESCE(SUM(CASE
    WHEN c.name = 'Préstamo Personal' THEN t.amount
    WHEN c.name = 'Pago Préstamo' THEN -t.amount
    ELSE 0
  END), 0) as net_debt
FROM transactions t
LEFT JOIN categories c ON c.id = t.category_id
WHERE t.household_id = $1
  AND t.flow_type = 'common'
  AND c.name IN ('Préstamo Personal', 'Pago Préstamo')
GROUP BY t.performed_by_profile_id;

-- Paso 4: Calcular última transacción
SELECT
  performed_by_profile_id as profile_id,
  MAX(occurred_at) as last_transaction
FROM transactions
WHERE household_id = $1
GROUP BY performed_by_profile_id;
```

### 2. Cálculo de Balance por Período

**Ubicación**: `lib/contributions/getContributionsData.ts`

```typescript
// Para cada período, calcular:
for (const contrib of data.contributions) {
  const current = balances.get(contrib.profile_id) ?? 0;
  const periodBalance = contrib.overpaid_amount - contrib.pending_amount;
  balances.set(contrib.profile_id, current + periodBalance);
}
```

### 3. Estadísticas del Hogar

**Ubicación**: `lib/balance/queries.ts` → `calculateHouseholdStats()`

```typescript
export function calculateHouseholdStats(balances: MemberBalance[]) {
  const EPSILON = 0.01;

  return {
    total_credit: balances
      .filter((b) => b.current_balance >= EPSILON)
      .reduce((sum, b) => sum + b.current_balance, 0),

    total_debt: balances
      .filter((b) => b.current_balance <= -EPSILON)
      .reduce((sum, b) => sum + Math.abs(b.current_balance), 0),

    members_with_credit: balances.filter((b) => b.current_balance >= EPSILON).length,

    members_with_debt: balances.filter((b) => b.current_balance <= -EPSILON).length,
  };
}
```

---

## Componentes UI

### 1. Página Principal: `/sickness/credito-deuda`

**Archivo**: `app/sickness/credito-deuda/page.tsx`

**Funcionalidades**:

- Resumen global de créditos y deudas
- Tarjetas individuales por miembro
- Desglose de préstamos (NEW en Issue #60)
- Acciones rápidas (solicitar/devolver préstamo)

**Server Actions Utilizadas**:

```typescript
import { getHouseholdMembersBalance } from '@/lib/balance/actions';

const balancesRes = await getHouseholdMembersBalance();
// Retorna: { members: Array, summary: Object }
```

### 2. Tarjeta de Balance: `MemberBalanceCard`

**Archivo**: `app/sickness/credito-deuda/_components/MemberBalanceCard.tsx`

**Características**:

- Balance global prominente
- Estado visual (crédito/deuda/liquidado)
- Desglose de préstamos (si aplica)
- Link a historial detallado

**Integración con Préstamos**:

```typescript
const loanBalanceRes = await getMemberLoanBalance(member.profile_id);
const loanData = loanBalanceRes.ok ? loanBalanceRes.data : null;

{
  loanData && loanData.net_debt !== 0 && (
    <LoanBreakdown
      loanExpenses={loanData.loan_expenses}
      loanRepayments={loanData.loan_repayments}
      netDebt={loanData.net_debt}
    />
  );
}
```

### 3. Desglose de Préstamos: `LoanBreakdown`

**Archivo**: `app/sickness/credito-deuda/_components/LoanBreakdown.tsx`

**Muestra**:

- Préstamos recibidos (rojo)
- Devoluciones hechas (verde)
- Deuda neta con badge de estado

### 4. Historial de Préstamos: `/sickness/credito-deuda/historial-prestamos`

**Archivo**: `app/sickness/credito-deuda/historial-prestamos/page.tsx` (NEW)

**Funcionalidades**:

- Tabla completa de solicitudes
- Filtros por estado (pendiente/aprobado/rechazado/cancelado)
- Estadísticas resumidas
- Motivos de rechazo destacados

---

## Ejemplos Prácticos

### Caso 1: Miembro Equilibrado

```
Usuario: Yumi
Período Octubre 2025:
  Contribución esperada: €522.63
  Gastos directos: €200.00
  Aportaciones comunes: €322.63
  Total pagado: €522.63
  Balance período: €0.00

Balance histórico: €0.00
Préstamos: €0.00

Balance Final: €0.00 (EQUILIBRADO ✅)
```

### Caso 2: Miembro con Crédito

```
Usuario: Kava
Historico períodos:
  Enero 2025: +€50.00 (pagó de más)
  Febrero 2025: +€30.00 (pagó de más)
  Marzo 2025: -€10.00 (pagó de menos)
  Total histórico: +€70.00

Préstamos: €0.00

Balance Final: +€70.00 (CRÉDITO A FAVOR ✅)
```

### Caso 3: Miembro con Deuda de Préstamo

```
Usuario: Alex
Balance histórico: +€100.00 (crédito a favor)

Préstamos:
  15 Oct 2025: Recibió €500.00 (Préstamo Personal)
  01 Nov 2025: Devolvió €200.00 (Pago Préstamo)
  Deuda neta: €300.00

Balance Final: +€100.00 - €300.00 = -€200.00 (DEUDA ❌)

Interpretación: Aunque tiene crédito histórico, su deuda de préstamo
supera ese crédito, resultando en balance negativo.
```

### Caso 4: Período Cerrado

```
Período: Octubre 2025 (phase='closed', status='closed')

Usuario: Kava
  Contribución esperada: €477.37
  Gastos directos: €327.00
  Aportaciones comunes: €150.36
  Total pagado: €477.36

Cálculo:
  shouldCountDirectAsPaid = (phase !== 'preparing') = TRUE ✅
  paidDirect = €327.00
  paidCommon = €150.36
  paid = €477.36
  pending = max(0, €477.37 - €477.36) = €0.01 ≈ €0.00

Balance Período: €0.00 (liquidado)

IMPORTANTE: Este cálculo NO cambia cuando el período pasa de 'active' a 'closed'
debido al fix del bug crítico (commit d8e0480).
```

---

## 🔗 Referencias

**Archivos Clave**:

- `lib/balance/queries.ts` - Queries de balance
- `lib/balance/actions.ts` - Server actions
- `lib/contributions/getContributionsData.ts` - Cálculo de contribuciones
- `app/api/periods/contributions/route.ts` - API de contribuciones
- `app/sickness/credito-deuda/page.tsx` - UI principal

**Documentación Relacionada**:

- `LOAN_SYSTEM.md` - Sistema de préstamos household-to-member
- `CREDIT_DEBT_SYSTEM.md` - Sistema de crédito/deuda entre miembros
- `ANALISIS_PROBLEMA_PERIODOS_CERRADOS.md` - Bug crítico resuelto
- `GESTION_PERIODOS_MENSUALES.md` - Gestión de períodos

**Issues Relacionados**:

- Issue #60 - Sistema de Balance Global
- Issue #53 - Bug períodos cerrados
- Issue #36-40 - Sistema de préstamos (rewrite completo)

---

**Última Actualización**: 20 Noviembre 2025
**Autor**: AI Assistant (GitHub Copilot)
**Estado**: ✅ Documentación completa y verificada
