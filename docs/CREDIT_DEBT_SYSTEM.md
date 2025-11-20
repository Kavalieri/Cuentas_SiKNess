# Sistema de Crédito y Deuda entre Miembros

**Fecha**: 20 Noviembre 2025
**Versión**: 1.0.0
**Estado**: ✅ Implementado y Funcional

---

## 📚 Índice

1. [Concepto Fundamental](#concepto-fundamental)
2. [Diferencia con Préstamos](#diferencia-con-préstamos)
3. [Cálculo de Balance Neto](#cálculo-de-balance-neto)
4. [Interpretación de Resultados](#interpretación-de-resultados)
5. [Queries SQL](#queries-sql)
6. [Componentes UI](#componentes-ui)
7. [Ejemplos Prácticos](#ejemplos-prácticos)
8. [Edge Cases](#edge-cases)

---

## Concepto Fundamental

El sistema de **crédito/deuda entre miembros** calcula automáticamente el balance relativo de cada miembro con respecto al hogar, basándose en:

1. **Contribuciones al fondo común** (ingresos comunes)
2. **Consumo proporcional de gastos comunes**
3. **Balance histórico acumulado**

### Principio de Equilibrio

```
En un hogar equilibrado, la suma de todos los balances SIEMPRE es cero.

Σ(balances de todos los miembros) = 0

Si un miembro tiene +€100 de crédito,
otro(s) miembro(s) deben tener -€100 de deuda.
```

**Esto NO es**:

- ❌ Deuda directa entre dos personas específicas
- ❌ Préstamo explícito de persona A a persona B
- ❌ Obligación contractual de pago

**Esto ES**:

- ✅ Balance contable relativo al hogar
- ✅ Indicador de quién ha aportado más vs consumido menos
- ✅ Métrica de equilibrio financiero
- ✅ Base para ajustes voluntarios entre miembros

---

## Diferencia con Préstamos

| Aspecto          | Crédito/Deuda (Automático)           | Préstamos (Household-to-Member)                |
| ---------------- | ------------------------------------ | ---------------------------------------------- |
| **Origen**       | Cálculo automático de contribuciones | Solicitud explícita al hogar                   |
| **Workflow**     | Sin aprobación necesaria             | Requiere aprobación del owner                  |
| **Registro**     | Calculado desde transactions         | Tabla `loan_requests`                          |
| **Devolución**   | No requiere acción específica        | Transacción de devolución obligatoria          |
| **Visibilidad**  | `/sickness/credito-deuda`            | `/sickness/configuracion/prestamos-pendientes` |
| **Persistencia** | Entre períodos (acumulado)           | Tracked individualmente hasta liquidar         |
| **Categorías**   | Todas las comunes                    | Solo "Préstamo Personal" / "Pago Préstamo"     |
| **Impacto**      | Balance global del miembro           | Deuda explícita separada                       |

### Ejemplo Comparativo

**Escenario 1: Crédito/Deuda (Automático)**

```
Hogar de 2 personas (Kava y Yumi)
Gastos comunes del mes: €1,000
Reparto esperado: €500 cada uno

Aportes reales:
  Kava: €300
  Yumi: €700

Balance automático:
  Kava: -€200 (debe al hogar, consumió más de lo aportado)
  Yumi: +€200 (crédito a favor, aportó más de lo consumido)

NO requiere acción inmediata.
Se equilibra en próximos períodos o mediante ajuste voluntario.
```

**Escenario 2: Préstamo (Explícito)**

```
Kava necesita €500 urgentes.
Solicita préstamo del fondo común.
Owner aprueba.
Se crea transacción: categoría "Préstamo Personal".

Deuda explícita Kava: €500
Esta deuda es INDEPENDIENTE del balance de contribuciones.
Requiere devolución mediante transacción "Pago Préstamo".
```

**Combinación**:

```
Kava puede tener:
  Balance contribuciones: +€50 (crédito a favor)
  Deuda préstamos: +€500 (debe al hogar)

Balance final: +€50 - €500 = -€450 (deuda neta total)
```

---

## Cálculo de Balance Neto

### Fórmula General

```typescript
Balance Neto Miembro =
  SUM(Contribuciones al Hogar) -
  Consumo Proporcional de Gastos Comunes -
  Deuda de Préstamos

Donde:
  Contribuciones = transacciones: type='income', flow_type='common', performed_by=miembro
  Consumo Proporcional = (Total Gastos Comunes / Número de Miembros)
  Deuda Préstamos = (Préstamos Recibidos - Devoluciones Hechas)
```

### Implementación por Período

**Ubicación**: `lib/contributions/getContributionsData.ts`

```typescript
// Para cada período mensual
for (const period of periods) {
  const data = await getContributionsData(householdId, {
    year: period.year,
    month: period.month,
  });

  // Balance individual del período
  for (const contrib of data.contributions) {
    const periodBalance = contrib.overpaid_amount - contrib.pending_amount;

    // Acumular en balance global
    const current = balances.get(contrib.profile_id) ?? 0;
    balances.set(contrib.profile_id, current + periodBalance);
  }
}
```

### Componentes del Balance

#### 1. Contribuciones (Ingresos Comunes)

**Query**:

```sql
SELECT
  t.performed_by_profile_id as profile_id,
  SUM(t.amount) AS total
FROM transactions t
LEFT JOIN categories c ON c.id = t.category_id
WHERE t.household_id = $1
  AND t.type = 'income'
  AND t.flow_type = 'common'
  AND (c.name IS NULL OR c.name <> 'Pago Préstamo')  -- Excluir pagos de préstamo
  AND t.period_id = $2
GROUP BY t.performed_by_profile_id;
```

**Características**:

- ✅ Solo ingresos comunes (`flow_type='common'`)
- ✅ Excluye pagos de préstamo (se contabilizan aparte)
- ✅ Agrupado por `performed_by_profile_id` (quien ejecutó)

#### 2. Gastos Directos (Descuento de Contribución)

**Query**:

```sql
SELECT
  performed_by_profile_id,
  SUM(amount) AS total
FROM transactions
WHERE household_id = $1
  AND flow_type = 'direct'
  AND (type = 'expense' OR type = 'expense_direct')
  AND period_id = $2
GROUP BY performed_by_profile_id;
```

**Efecto**:

- ✅ Reducen la contribución esperada del miembro
- ✅ NO afectan balance del hogar
- ✅ Se consideran "ya pagado de su bolsillo"

#### 3. Consumo Proporcional de Gastos Comunes

**Cálculo**:

```typescript
// Total de gastos comunes del hogar
const totalCommonExpenses = await query(`
  SELECT SUM(amount) as total
  FROM transactions
  WHERE household_id = $1
    AND flow_type = 'common'
    AND type = 'expense'
    AND period_id = $2
`);

// Consumo proporcional por miembro
const memberCount = await getMemberCount(householdId);
const consumoProporcion = totalCommonExpenses / memberCount;

// Cada miembro "consume" esta cantidad del fondo común
```

**Nota**: Este cálculo es simplificado. En realidad, CuentasSiK usa un sistema más sofisticado basado en `contribution_settings` (porcentajes, iguales, personalizados).

#### 4. Balance del Período

**Fórmula**:

```typescript
expected_contribution = total_common_expenses / members - direct_expenses;
paid_contribution = common_incomes_by_member;
overpaid = max(0, paid - expected);
pending = max(0, expected - paid);

period_balance = overpaid - pending;
```

**Ejemplo Octubre 2025**:

```
Hogar de 2 miembros (Kava y Yumi)
Total gastos comunes: €1,000
Contribución esperada por miembro: €500

Kava:
  Gastos directos: €100
  Esperado ajustado: €400 (€500 - €100)
  Aportado: €400
  Balance: €0 (equilibrado)

Yumi:
  Gastos directos: €50
  Esperado ajustado: €450 (€500 - €50)
  Aportado: €600
  Overpaid: €150
  Balance: +€150 (crédito a favor)
```

---

## Interpretación de Resultados

### Balance Positivo (Crédito a Favor)

```
Usuario: Yumi
Balance: +€150.00

Interpretación:
- Ha aportado €150 MÁS de lo que le correspondía
- Tiene "crédito" con el hogar
- Otros miembros han consumido parte de su aporte excedente
```

**Acciones Posibles**:

1. ✅ Mantener crédito para próximos períodos
2. ✅ Reducir aportación en próximo período
3. ✅ Solicitar devolución (mediante ajuste manual del owner)
4. ❌ NO requiere acción inmediata

### Balance Negativo (Deuda Pendiente)

```
Usuario: Kava
Balance: -€200.00

Interpretación:
- Ha aportado €200 MENOS de lo que le correspondía
- Tiene "deuda" con el hogar
- Ha consumido más de lo que aportó
- Otros miembros han cubierto su parte
```

**Acciones Posibles**:

1. ✅ Aumentar aportación en próximo período
2. ✅ Hacer aportación extra voluntaria
3. ✅ Ajustar gastos personales
4. ❌ NO hay obligación legal de pago inmediato

### Balance Cero (Equilibrado)

```
Usuario: Alex
Balance: €0.00

Interpretación:
- Ha aportado exactamente lo que le correspondía
- Está equilibrado con el hogar
- Sin crédito ni deuda
```

**Estado**: ✅ Ideal

---

## Queries SQL

### 1. Balance Global de Todos los Miembros

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

-- Paso 3: Calcular balance por período (loop en código)
-- Ver getContributionsData() para lógica detallada

-- Paso 4: Obtener deuda de préstamos
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

-- Paso 5: Balance final por miembro
-- balance_final = balance_periodos - deuda_prestamos
```

### 2. Estadísticas del Hogar

**Ubicación**: `lib/balance/queries.ts` → `calculateHouseholdStats()`

```typescript
export function calculateHouseholdStats(balances: MemberBalance[]) {
  const EPSILON = 0.01; // Tolerancia para redondeo

  return {
    // Total de créditos a favor
    total_credit: balances
      .filter((b) => b.current_balance >= EPSILON)
      .reduce((sum, b) => sum + b.current_balance, 0),

    // Total de deudas pendientes
    total_debt: balances
      .filter((b) => b.current_balance <= -EPSILON)
      .reduce((sum, b) => sum + Math.abs(b.current_balance), 0),

    // Cantidad de miembros con crédito
    members_with_credit: balances.filter((b) => b.current_balance >= EPSILON).length,

    // Cantidad de miembros con deuda
    members_with_debt: balances.filter((b) => b.current_balance <= -EPSILON).length,
  };
}
```

### 3. Verificación de Equilibrio

**Test de Integridad**:

```typescript
export function calculateHouseholdTotal(balances: MemberBalance[]): number {
  const total = balances.reduce((sum, member) => sum + member.current_balance, 0);

  // En un sistema balanceado, total SIEMPRE debe ser ≈0
  const EPSILON = 0.01;
  const isBalanced = Math.abs(total) < EPSILON;

  if (!isBalanced) {
    console.warn(`⚠️ Hogar desbalanceado: total = €${total.toFixed(2)}`);
  }

  return total;
}
```

---

## Componentes UI

### 1. Página Principal: `/sickness/credito-deuda`

**Archivo**: `app/sickness/credito-deuda/page.tsx`

**Secciones**:

#### A. Resumen Global

```typescript
<Card>
  <CardHeader>Resumen de Saldos</CardHeader>
  <CardContent>
    <div>Total Créditos a Favor: €{summary.total_credits}</div>
    <div>Total Deudas Pendientes: €{summary.total_debts}</div>
    <div>Estado: {isBalanced ? 'Balanceado' : 'Desbalanceado'}</div>
  </CardContent>
</Card>
```

#### B. Tarjetas por Miembro

```typescript
<MemberBalanceCard
  member={{
    profile_id,
    display_name,
    current_balance,
    // ...
  }}
/>
```

**Características de Tarjeta**:

- Avatar y nombre del miembro
- Balance global prominente (verde/rojo/gris)
- Badge de estado (Crédito/Deuda/Al día)
- Desglose de préstamos (si aplica) ✅ NEW
- Link a historial detallado

#### C. Acciones Rápidas

```typescript
<Card>
  <CardHeader>Mis Acciones</CardHeader>
  <CardContent>
    <Link href="/sickness/credito-deuda/solicitar-prestamo">
      <Button>Solicitar Préstamo</Button>
    </Link>
    <Link href="/sickness/credito-deuda/devolver-prestamo">
      <Button variant="secondary">Devolver Préstamo</Button>
    </Link>
    <Link href="/sickness/credito-deuda/historial-prestamos">
      <Button variant="outline">Ver Historial de Préstamos</Button>
    </Link>
  </CardContent>
</Card>
```

### 2. Historial Detallado: `/sickness/credito-deuda/miembro/[profileId]`

**Archivo**: `app/sickness/credito-deuda/miembro/[profileId]/page.tsx`

**Funcionalidades**:

- Balance global acumulado (card destacada)
- Tabla período por período:
  - Fecha (mes/año)
  - Esperado
  - Pagado
  - Overpaid
  - Pending
  - Balance del período
  - Balance acumulado (running balance)
- Gráfico de evolución (opcional)

**Query Principal**:

```typescript
const historyRes = await getMemberBalanceHistory(profileId);

// Retorna:
{
  member: { name, avatar, role },
  current_balance: number,
  history: [
    {
      period: 'Octubre 2025',
      expected: 477.37,
      paid: 477.36,
      overpaid: 0.00,
      pending: 0.00,
      period_balance: 0.00,
      running_balance: 50.00  // Balance acumulado hasta ese período
    },
    // ...
  ]
}
```

### 3. Componente de Desglose: `LoanBreakdown`

**Archivo**: `app/sickness/credito-deuda/_components/LoanBreakdown.tsx` (NEW)

**Muestra**:

```
┌─────────────────────────────────────┐
│ 📄 Préstamos del Hogar              │
├─────────────────────────────────────┤
│ Préstamos Recibidos     €500.00 🔻  │
│ Devoluciones Hechas     €200.00 🔺  │
├─────────────────────────────────────┤
│ Deuda Neta:             €300.00 ⚠️  │
└─────────────────────────────────────┘
```

**Condiciones**:

- Solo se muestra si `hasLoanActivity` (loan_expenses > 0 || loan_repayments > 0)
- Colores: rojo (préstamos), verde (devoluciones)
- Badge: destructive (deuda) / secondary (liquidado)

---

## Ejemplos Prácticos

### Caso 1: Hogar Equilibrado (2 Miembros)

```
Hogar: Kava + Yumi
Período: Octubre 2025

Gastos comunes totales: €1,000
Aportaciones:
  Kava: €500
  Yumi: €500

Balance:
  Kava: €0 (equilibrado)
  Yumi: €0 (equilibrado)

Total hogar: €0 ✅

Interpretación: Ambos aportaron exactamente lo que consumieron.
```

### Caso 2: Miembro con Crédito

```
Hogar: Kava + Yumi + Alex
Período: Noviembre 2025

Gastos comunes totales: €1,500
Esperado por miembro: €500

Aportaciones:
  Kava: €450 (€50 menos)
  Yumi: €700 (€200 más)
  Alex: €350 (€150 menos)

Balance:
  Kava: -€50 (deuda)
  Yumi: +€200 (crédito) ← Ha cubierto parte de los otros
  Alex: -€150 (deuda)

Total hogar: -€50 + €200 - €150 = €0 ✅

Interpretación:
- Yumi ha aportado de más, compensando las faltas de Kava y Alex
- Los €200 de crédito de Yumi equivalen a las deudas de Kava y Alex
```

### Caso 3: Balance Histórico Acumulado

```
Usuario: Kava

Enero 2025:
  Esperado: €500, Pagado: €550
  Balance período: +€50

Febrero 2025:
  Esperado: €500, Pagado: €480
  Balance período: -€20

Marzo 2025:
  Esperado: €500, Pagado: €500
  Balance período: €0

Balance Acumulado:
  Enero: +€50
  Febrero: +€50 - €20 = +€30
  Marzo: +€30 + €0 = +€30

Balance Global: +€30 (crédito a favor)

Interpretación:
- A pesar de haber pagado menos en febrero, el exceso de enero
  compensa, resultando en crédito neto de €30.
```

### Caso 4: Crédito + Deuda de Préstamo

```
Usuario: Alex

Balance de Contribuciones:
  Histórico: +€100 (crédito a favor por contribuciones)

Préstamos:
  15 Oct: Recibió €500 (Préstamo Personal)
  01 Nov: Devolvió €200 (Pago Préstamo)
  Deuda préstamos: €300

Balance Final:
  €100 (crédito contribuciones) - €300 (deuda préstamos) = -€200

Interpretación:
- Tiene crédito histórico por haber aportado de más en períodos pasados
- Sin embargo, su deuda de préstamo supera ese crédito
- Balance neto: €200 de deuda con el hogar
```

### Caso 5: Gastos Directos

```
Usuario: Yumi
Período: Diciembre 2025

Gastos comunes hogar: €1,200
Miembros: 3
Esperado base: €400 por miembro

Yumi tiene gastos directos: €150 (compras personales con su dinero)

Cálculo:
  Esperado ajustado: €400 - €150 = €250
  Yumi aporta: €300
  Overpaid: €50

Balance período: +€50

Interpretación:
- Los €150 de gastos directos reducen su contribución esperada
- Al aportar €300, supera su esperado ajustado (€250)
- Resulta en crédito de €50 para ese período
```

---

## Edge Cases

### 1. Hogar con 1 Solo Miembro

```
Balance SIEMPRE será €0

Razón: No hay otros miembros con quienes compartir gastos.
Todo lo que gasta lo paga él mismo.
```

### 2. Nuevo Miembro se Une a Mitad de Período

```
Problema: ¿Cómo calcular su contribución esperada?

Solución Actual:
- Contribución prorrateada por días del período
- Si se une día 15 de 30 días → 50% del esperado
- Se registra en `household_members.joined_at`
```

### 3. Miembro Sale del Hogar

```
Problema: ¿Qué pasa con su balance pendiente?

Solución Actual:
- Balance se mantiene en historial
- Owner puede hacer ajuste manual (transacción de equilibrio)
- NO se elimina automáticamente
```

### 4. Error de Redondeo

```
Problema: Suma de balances no es exactamente €0.00

Ejemplo:
  Kava: +€50.01
  Yumi: -€50.00
  Total: +€0.01 (error de redondeo)

Solución:
- Usar EPSILON = 0.01 en comparaciones
- Considerar balances < €0.01 como "equilibrados"
- En queries: COALESCE(..., 0)
```

### 5. Período sin Gastos Comunes

```
Problema: ¿Qué pasa si no hay gastos comunes en el mes?

Resultado:
  expected_contribution = 0
  paid_contribution = (ingresos comunes del mes)
  balance = paid (todo va a crédito)

Ejemplo:
  Kava aporta €500, pero no hubo gastos comunes
  Balance período: +€500 (crédito a favor para próximos períodos)
```

### 6. Deuda vs Préstamo

```
Diferencia crucial:

Deuda (Balance Negativo):
  - Automático, calculado
  - NO requiere devolución formal
  - Se equilibra en próximos períodos
  - Sin registro en loan_requests

Préstamo (Explícito):
  - Solicitado y aprobado
  - Requiere devolución mediante transacción específica
  - Tracked en loan_requests
  - Categorías especiales del sistema

Usuario puede tener AMBOS simultáneamente.
```

---

## 🔗 Referencias

**Archivos Clave**:

- `lib/balance/queries.ts` - Cálculos de balance
- `lib/balance/actions.ts` - Server actions
- `lib/contributions/getContributionsData.ts` - Contribuciones por período
- `app/sickness/credito-deuda/page.tsx` - UI principal
- `app/sickness/credito-deuda/miembro/[profileId]/page.tsx` - Historial detallado

**Documentación Relacionada**:

- `BALANCE_SYSTEM.md` - Sistema de balance personal (overview completo)
- `LOAN_SYSTEM.md` - Sistema de préstamos household-to-member
- `GESTION_PERIODOS_MENSUALES.md` - Gestión de períodos
- `ANALISIS_PROBLEMA_PERIODOS_CERRADOS.md` - Bug crítico resuelto

**Issues GitHub**:

- Issue #60 - Sistema de Balance Global
- Issue #53 - Bug períodos cerrados
- Issue #36-40 - Sistema de préstamos

---

**Última Actualización**: 20 Noviembre 2025
**Autor**: AI Assistant (GitHub Copilot)
**Estado**: ✅ Documentación completa del sistema crédito/deuda
