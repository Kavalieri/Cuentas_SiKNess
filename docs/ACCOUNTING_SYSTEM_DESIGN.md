# Sistema Contable Profesional - Diseño e Implementación

## Fecha: 3 de Octubre de 2025

## 🎯 Objetivo
Implementar un sistema de contabilidad familiar profesional basado en **cierre mensual** y **balance de arrastre**, siguiendo las mejores prácticas de software como Splitwise, YNAB, Mint, y sistemas contables tradicionales.

## 📊 Modelo Contable: Sistema de Períodos Cerrados

### Concepto Principal
Cada mes es un **período contable** que puede estar en uno de estos estados:
- **`open`**: Mes actual, se pueden añadir/editar movimientos
- **`pending_close`**: Mes pasado, esperando revisión y cierre
- **`closed`**: Mes cerrado, movimientos bloqueados, balance consolidado

### Flujo del Balance

```
┌─────────────────────────────────────────────────────────────┐
│ Mes Anterior (Cerrado)                                      │
│ Balance Inicial: 1000€                                      │
│ + Ingresos: 2000€                                           │
│ - Gastos: 1500€                                             │
│ = Balance Final: 1500€ ◄──┐                                │
└─────────────────────────────┘  │                            │
                                 │ Balance de Arrastre        │
┌────────────────────────────────▼─────────────────────────┐  │
│ Mes Actual (Abierto)                                     │  │
│ Balance Inicial: 1500€ (heredado)                        │  │
│ + Ingresos: 2200€                                        │  │
│ - Gastos: 1800€                                          │  │
│ = Balance Proyectado: 1900€                              │  │
└──────────────────────────────────────────────────────────┘  │
                                                               │
                                 Al cerrar el mes ─────────────┘
```

## 🗄️ Estructura de Datos

### Nueva Tabla: `monthly_periods`

```sql
CREATE TABLE monthly_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  status TEXT NOT NULL CHECK (status IN ('open', 'pending_close', 'closed')),
  
  -- Balance del mes
  opening_balance NUMERIC(12,2) NOT NULL DEFAULT 0, -- Balance inicial (del mes anterior)
  total_income NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_expenses NUMERIC(12,2) NOT NULL DEFAULT 0,
  closing_balance NUMERIC(12,2) NOT NULL DEFAULT 0, -- Balance final
  
  -- Metadatos
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Un solo período por mes/hogar
  UNIQUE(household_id, year, month)
);

CREATE INDEX idx_monthly_periods_household_date ON monthly_periods(household_id, year DESC, month DESC);
CREATE INDEX idx_monthly_periods_status ON monthly_periods(household_id, status);
```

### Modificación: Tabla `movements`

Añadir referencia al período:

```sql
ALTER TABLE movements ADD COLUMN period_id UUID REFERENCES monthly_periods(id);
CREATE INDEX idx_movements_period ON movements(period_id);

-- Constraint: No modificar movimientos de períodos cerrados
ALTER TABLE movements ADD CONSTRAINT check_period_not_closed 
  CHECK (
    period_id IS NULL OR 
    EXISTS (
      SELECT 1 FROM monthly_periods 
      WHERE id = period_id AND status != 'closed'
    )
  );
```

## 🔄 Flujo de Operaciones

### 1. Creación Automática de Períodos

Cuando un usuario accede por primera vez o cambia de mes:

```typescript
async function ensureMonthlyPeriod(householdId: string, year: number, month: number) {
  // Verificar si existe
  let period = await getPeriod(householdId, year, month);
  
  if (!period) {
    // Obtener balance del mes anterior
    const previousMonth = getPreviousMonth(year, month);
    const previousPeriod = await getPeriod(householdId, previousMonth.year, previousMonth.month);
    
    const openingBalance = previousPeriod?.closing_balance || 0;
    
    // Crear nuevo período
    period = await createPeriod({
      household_id: householdId,
      year,
      month,
      status: isCurrentMonth(year, month) ? 'open' : 'pending_close',
      opening_balance: openingBalance
    });
  }
  
  return period;
}
```

### 2. Registro de Movimientos

```typescript
async function createMovement(data: MovementInput) {
  // 1. Obtener o crear período del mes
  const period = await ensureMonthlyPeriod(
    data.household_id, 
    data.occurred_at.getFullYear(),
    data.occurred_at.getMonth() + 1
  );
  
  // 2. Verificar que el período no esté cerrado
  if (period.status === 'closed') {
    throw new Error('No se pueden añadir movimientos a un período cerrado');
  }
  
  // 3. Insertar movimiento
  const movement = await db.movements.insert({
    ...data,
    period_id: period.id
  });
  
  // 4. Actualizar totales del período
  await updatePeriodTotals(period.id);
  
  return movement;
}
```

### 3. Actualización de Totales

```typescript
async function updatePeriodTotals(periodId: string) {
  const result = await db.query(`
    UPDATE monthly_periods
    SET 
      total_income = (
        SELECT COALESCE(SUM(amount), 0) 
        FROM movements 
        WHERE period_id = $1 AND type = 'income'
      ),
      total_expenses = (
        SELECT COALESCE(SUM(amount), 0) 
        FROM movements 
        WHERE period_id = $1 AND type = 'expense'
      ),
      closing_balance = opening_balance + 
        (SELECT COALESCE(SUM(amount), 0) FROM movements WHERE period_id = $1 AND type = 'income') -
        (SELECT COALESCE(SUM(amount), 0) FROM movements WHERE period_id = $1 AND type = 'expense'),
      updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `, [periodId]);
  
  return result;
}
```

### 4. Cierre de Mes

```typescript
async function closeMonth(householdId: string, year: number, month: number, userId: string) {
  const period = await getPeriod(householdId, year, month);
  
  // Validaciones
  if (period.status === 'closed') {
    throw new Error('El período ya está cerrado');
  }
  
  if (isCurrentMonth(year, month)) {
    throw new Error('No se puede cerrar el mes actual');
  }
  
  // Actualizar totales finales
  await updatePeriodTotals(period.id);
  
  // Marcar como cerrado
  await db.monthly_periods.update(period.id, {
    status: 'closed',
    closed_at: new Date(),
    closed_by: userId
  });
  
  // Crear período siguiente con el balance de arrastre
  const nextMonth = getNextMonth(year, month);
  await ensureMonthlyPeriod(householdId, nextMonth.year, nextMonth.month);
  
  return true;
}
```

## 📱 Interfaz de Usuario

### Dashboard Principal

```
┌──────────────────────────────────────────────────────────┐
│ 🏠 Dashboard                    [Selector Mes: Oct 2025] │
├──────────────────────────────────────────────────────────┤
│                                                           │
│ ⚠️  Tienes 2 meses pendientes de cerrar                  │
│    [Ver Períodos] [Cerrar Septiembre]                    │
│                                                           │
├──────────────────────────────────────────────────────────┤
│                                                           │
│ 💰 Balance del Mes (Octubre 2025)          [🟢 Abierto] │
│                                                           │
│ ┌──────────────┬──────────────┬──────────────┐          │
│ │ Balance      │ Ingresos     │ Gastos       │          │
│ │ Inicial      │ del Mes      │ del Mes      │          │
│ │              │              │              │          │
│ │ 1,500.00€    │ +2,200.00€   │ -1,800.00€   │          │
│ └──────────────┴──────────────┴──────────────┘          │
│                                                           │
│ ┌──────────────────────────────────────────┐            │
│ │ Balance Proyectado: 1,900.00€            │            │
│ │ Ahorro del mes: +400.00€ (↑ 21%)         │            │
│ └──────────────────────────────────────────┘            │
│                                                           │
├──────────────────────────────────────────────────────────┤
│                                                           │
│ 📊 Gastos por Categoría                                  │
│                                                           │
│ [Gráfico Circular/Barras]                                │
│                                                           │
│ 🏠 Vivienda        600€  (33%)  ████████░░               │
│ 🛒 Supermercado    450€  (25%)  ██████░░░░               │
│ 🚗 Transporte      300€  (17%)  ████░░░░░░               │
│ 💡 Servicios       250€  (14%)  ███░░░░░░░               │
│ 🎮 Ocio            200€  (11%)  ██░░░░░░░░               │
│                                                           │
├──────────────────────────────────────────────────────────┤
│                                                           │
│ 📝 Movimientos Recientes                                 │
│                                                           │
│ [Lista de movimientos con filtros]                       │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

### Vista de Períodos Mensuales

```
┌──────────────────────────────────────────────────────────┐
│ 📅 Períodos Mensuales                                    │
├──────────────────────────────────────────────────────────┤
│                                                           │
│ Octubre 2025                                  [🟢 Abierto]│
│ Balance: 1,500€ → 1,900€ (proyectado)                   │
│ Ingresos: 2,200€ | Gastos: 1,800€                        │
│ [Ver Detalles]                                            │
│                                                           │
│ Septiembre 2025                    [🟡 Pendiente Cierre] │
│ Balance: 1,200€ → 1,500€                                  │
│ Ingresos: 2,000€ | Gastos: 1,700€                        │
│ [Cerrar Mes] [Ver Detalles]                              │
│                                                           │
│ Agosto 2025                                   [🔒 Cerrado]│
│ Balance: 1,000€ → 1,200€                                  │
│ Ingresos: 2,100€ | Gastos: 1,900€                        │
│ Cerrado el 5 Sep 2025 por Juan                           │
│ [Ver Detalles]                                            │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

## 🎨 Componentes a Crear

1. **`MonthStatusBadge`**: Badge con estado del mes (Abierto/Pendiente/Cerrado)
2. **`PendingPeriodsAlert`**: Alerta de períodos pendientes de cerrar
3. **`MonthlyPeriodCard`**: Card de resumen de un período
4. **`PeriodsTimeline`**: Timeline de períodos mensuales
5. **`CloseMonthDialog`**: Dialog para cerrar un mes con confirmación
6. **`CategoryChart`**: Gráfico de gastos por categoría (Recharts)
7. **`MonthlyStats`**: Estadísticas del mes (ahorro, tendencias, etc.)
8. **`BalanceFlow`**: Diagrama de flujo del balance (Sankey chart)

## 🔧 Server Actions a Crear/Modificar

### Nuevas Actions (`app/app/periods/actions.ts`)

```typescript
- ensureMonthlyPeriod(householdId, year, month)
- getPeriod(householdId, year, month)
- getPeriodsForHousehold(householdId, limit?)
- getPendingPeriods(householdId)
- closeMonth(householdId, year, month, notes?)
- reopenMonth(householdId, year, month) // Solo admins
- updatePeriodTotals(periodId)
- getMonthStats(periodId) // Estadísticas detalladas
```

### Modificar Actions Existentes

```typescript
// app/app/expenses/actions.ts
- createMovement() → Añadir lógica de período
- updateMovement() → Verificar período no cerrado
- deleteMovement() → Verificar período no cerrado
- getMovements() → Filtrar por period_id
```

## 📈 Ventajas del Sistema

1. **Integridad de Datos**: Balance siempre correcto, no se recalcula
2. **Auditoría**: Historial inmutable de períodos cerrados
3. **Rendimiento**: No recalcular balance total, solo sumar períodos
4. **Profesionalidad**: Sistema usado en apps serias (Mint, YNAB, QuickBooks)
5. **Control**: Evita modificaciones accidentales de meses pasados
6. **Claridad**: Balance de cada mes es evidente y trazable

## 🚀 Plan de Implementación

### Fase 1: Base de Datos (30 min)
- [ ] Crear tabla `monthly_periods`
- [ ] Añadir `period_id` a `movements`
- [ ] Crear funciones SQL de utilidad
- [ ] Migrar datos existentes

### Fase 2: Server Actions (45 min)
- [ ] Crear `app/app/periods/actions.ts`
- [ ] Modificar `app/app/expenses/actions.ts`
- [ ] Crear helpers en `lib/periods.ts`

### Fase 3: Componentes UI (60 min)
- [ ] `MonthStatusBadge`
- [ ] `PendingPeriodsAlert`
- [ ] `MonthlyPeriodCard`
- [ ] `CloseMonthDialog`
- [ ] `CategoryChart`
- [ ] `MonthlyStats`

### Fase 4: Páginas (45 min)
- [ ] Refactorizar Dashboard con nuevos componentes
- [ ] Crear `/app/periods` para gestión de períodos
- [ ] Actualizar `/app/household` para eliminar redundancias

### Fase 5: Testing y Ajustes (30 min)
- [ ] Probar cierre de mes
- [ ] Probar creación de movimientos
- [ ] Verificar balance de arrastre
- [ ] Ajustar UI según feedback

**Tiempo Total Estimado**: ~3.5 horas

## 📚 Referencias

- YNAB: https://www.ynab.com/
- Mint: https://mint.intuit.com/
- Splitwise: https://www.splitwise.com/
- QuickBooks: https://quickbooks.intuit.com/
- Principios de Contabilidad: Balance de Apertura/Cierre

---

**Nota**: Este sistema es escalable y permite futuras mejoras como:
- Presupuestos por categoría
- Proyecciones de gastos
- Alertas de sobregastos
- Exportación a formatos contables (CSV, PDF)
- Reconciliación bancaria (import de extractos)
