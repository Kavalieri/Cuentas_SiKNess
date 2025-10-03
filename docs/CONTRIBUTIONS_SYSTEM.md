# Sistema de Contribuciones Proporcionales

## Concepto

Permite gestionar los aportes mensuales de cada miembro del hogar de forma proporcional a sus ingresos.

### Ejemplo:
- **Meta mensual del hogar**: 2000€
- **Miembro A ingresa**: 1500€/mes
- **Miembro B ingresa**: 2500€/mes
- **Total ingresos**: 4000€/mes

**Contribución proporcional**:
- Miembro A: `(1500/4000) * 2000 = 750€` (37.5%)
- Miembro B: `(2500/4000) * 2000 = 1250€` (62.5%)

## Arquitectura de Base de Datos

### 1. `member_incomes`
Almacena los ingresos mensuales de cada miembro con historial.

**Campos**:
- `household_id`: UUID del hogar
- `user_id`: UUID del usuario
- `monthly_income`: Ingreso mensual (decimal)
- `effective_from`: Fecha desde la que aplica este ingreso

**Casos de uso**:
- Cambio de trabajo
- Aumento de sueldo
- Pérdida temporal de ingresos

**Ejemplo**:
```sql
-- Juan cambió de trabajo el 1 de enero
INSERT INTO member_incomes (household_id, user_id, monthly_income, effective_from)
VALUES ('xxx', 'juan-id', 1800, '2025-01-01');
```

### 2. `household_settings`
Configuración de la meta de contribución mensual del hogar.

**Campos**:
- `household_id`: UUID del hogar (PK)
- `monthly_contribution_goal`: Meta total mensual (ej: 2000€)
- `currency`: Moneda (default: EUR)

**Ejemplo**:
```sql
-- Configurar meta de 2000€/mes
INSERT INTO household_settings (household_id, monthly_contribution_goal)
VALUES ('xxx', 2000);
```

### 3. `contributions`
Contribuciones mensuales calculadas y rastreadas por miembro.

**Campos**:
- `household_id`, `user_id`, `year`, `month`: Identificadores
- `expected_amount`: Monto esperado (calculado proporcionalmente)
- `paid_amount`: Monto efectivamente pagado (calculado desde `movements`)
- `status`: `pending`, `partial`, `paid`, `overpaid`
- `paid_at`: Fecha de pago completo

**Estados**:
- `pending`: No ha pagado nada
- `partial`: Ha pagado algo pero falta
- `paid`: Ha pagado exactamente lo esperado
- `overpaid`: Ha pagado más de lo esperado

### 4. `contribution_adjustments`
Ajustes manuales a contribuciones (excepciones).

**Campos**:
- `contribution_id`: UUID de la contribución
- `amount`: Monto del ajuste (+ o -)
- `reason`: Justificación del ajuste
- `created_by`: Usuario que creó el ajuste

**Casos de uso**:
- Vacaciones de un miembro → reducir su contribución
- Gasto extraordinario → aumentar contribución puntual
- Enfermedad → ajuste temporal

**Ejemplo**:
```sql
-- María se va de vacaciones en julio, reducir 100€
INSERT INTO contribution_adjustments (contribution_id, amount, reason, created_by)
VALUES ('contrib-id', -100, 'Vacaciones en julio', 'maria-id');
```

## Funciones SQL

### `get_member_income(household_id, user_id, date)`
Obtiene el ingreso activo de un miembro en una fecha específica.

**Lógica**: Busca el ingreso más reciente que aplique en esa fecha.

```sql
SELECT get_member_income('household-id', 'user-id', '2025-06-15');
-- Retorna: 1500.00
```

### `calculate_monthly_contributions(household_id, year, month)`
Calcula las contribuciones proporcionales para todos los miembros en un mes.

**Retorna**:
- `user_id`
- `expected_amount`: Monto calculado
- `income_percentage`: % de ingresos del total

**Ejemplo**:
```sql
SELECT * FROM calculate_monthly_contributions('household-id', 2025, 6);
-- user_id        | expected_amount | income_percentage
-- juan-id        | 750.00          | 37.50
-- maria-id       | 1250.00         | 62.50
```

### `update_contribution_status(contribution_id)`
Actualiza el estado de una contribución según `paid_amount`.

**Lógica automática**:
```
paid_amount = 0            → status = 'pending'
paid_amount < expected     → status = 'partial'
paid_amount = expected     → status = 'paid'
paid_amount > expected     → status = 'overpaid'
```

## Server Actions

### Configuración

#### `setMemberIncome(formData)`
Establece el ingreso mensual de un miembro.

**FormData**:
```typescript
{
  household_id: string;
  user_id: string;
  monthly_income: number;
  effective_from: Date;
}
```

#### `setContributionGoal(formData)`
Configura la meta de contribución mensual del hogar.

**FormData**:
```typescript
{
  household_id: string;
  monthly_contribution_goal: number;
  currency?: string; // default: EUR
}
```

### Cálculo y Tracking

#### `calculateAndCreateContributions(householdId, year, month)`
Genera las contribuciones proporcionales para un mes.

**Proceso**:
1. Llama a `calculate_monthly_contributions()` (SQL function)
2. Crea registros en tabla `contributions` (upsert)
3. Inicializa `paid_amount = 0`, `status = pending`

**Errores comunes**:
- "Household settings not configured" → falta configurar meta
- "No incomes configured" → faltan ingresos de miembros

#### `getMonthlyContributions(householdId, year, month)`
Obtiene todas las contribuciones de un mes con datos de usuarios.

#### `updateContributionPaidAmount(contributionId, paidAmount)`
Actualiza el monto pagado de una contribución y recalcula su estado.

**Uso**: Se llama automáticamente cuando se crea un movimiento.

### Ajustes

#### `addContributionAdjustment(formData)`
Agrega un ajuste manual a una contribución.

**FormData**:
```typescript
{
  contribution_id: string;
  amount: number; // positivo o negativo
  reason: string; // mínimo 3 caracteres
}
```

**Efecto**: Modifica el `expected_amount` de la contribución.

## Flujo de Trabajo

### Setup Inicial (Primera Vez)

1. **Configurar meta del hogar** → `setContributionGoal()`
2. **Configurar ingresos de cada miembro** → `setMemberIncome()` (x2)
3. **Calcular contribuciones del mes actual** → `calculateAndCreateContributions()`

### Uso Mensual

1. **Dashboard muestra** → `getContributionsSummary()`
   - Total esperado
   - Total pagado
   - Pendiente
   - % completado

2. **Ver detalle por miembro** → `getMonthlyContributions()`

3. **Al crear un movimiento de gasto**:
   - Se suma al `paid_amount` del autor
   - Se llama `updateContributionPaidAmount()`
   - Estado se actualiza automáticamente

4. **Ajustes manuales** (si es necesario):
   - Agregar ajuste → `addContributionAdjustment()`
   - Ver historial → `getContributionAdjustments()`

### Cambio de Ingresos

Cuando un miembro cambia de trabajo o recibe aumento:

```typescript
// Registrar nuevo ingreso desde fecha X
await setMemberIncome({
  household_id: 'xxx',
  user_id: 'juan-id',
  monthly_income: 2000, // antes era 1500
  effective_from: new Date('2025-07-01'),
});

// Recalcular contribuciones para julio
await calculateAndCreateContributions('household-id', 2025, 7);
```

## UI Propuesta

### Página: `/app/contributions`

#### Tab 1: Dashboard
- Card con resumen del mes actual:
  - Total esperado
  - Total pagado
  - Progreso visual (barra)
  - % completado
- Lista de contribuciones por miembro:
  - Nombre
  - Esperado vs Pagado
  - Estado (badge)
  - Botón "Ajustar"

#### Tab 2: Configuración
- Form: Meta mensual del hogar
- Lista de miembros con inputs de ingreso:
  - Nombre
  - Ingreso actual
  - Botón "Actualizar desde..."
  - Historial de cambios (colapsable)

#### Tab 3: Historial
- Selector de mes/año
- Tabla con contribuciones del mes seleccionado
- Columnas: Miembro, Esperado, Pagado, Diferencia, Estado

## Integración con Movimientos

Cuando se crea un `movement` de tipo `expense`:

1. Obtener `user_id` del autor
2. Obtener `household_id` del autor
3. Buscar contribución del mes actual:
   ```sql
   SELECT id, paid_amount FROM contributions
   WHERE household_id = 'xxx'
     AND user_id = 'yyy'
     AND year = 2025
     AND month = 6;
   ```
4. Sumar monto del gasto a `paid_amount`
5. Llamar `update_contribution_status(contribution_id)`

### Server Action: `createMovement()` (actualizado)

```typescript
// Después de insertar el movimiento
if (parsed.data.type === 'expense') {
  // Actualizar contribución
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  
  const { data: contribution } = await supabase
    .from('contributions')
    .select('id, paid_amount')
    .eq('household_id', parsed.data.household_id)
    .eq('user_id', user.id)
    .eq('year', year)
    .eq('month', month)
    .single();
  
  if (contribution) {
    const newPaidAmount = contribution.paid_amount + parsed.data.amount;
    await updateContributionPaidAmount(contribution.id, newPaidAmount);
  }
}
```

## RLS Policies

Todas las tablas tienen RLS habilitado con políticas que verifican:
- Usuario pertenece al `household_id` del recurso

**Patrón**:
```sql
household_id IN (
  SELECT household_id FROM household_members WHERE user_id = auth.uid()
)
```

## Próximos Pasos

1. ✅ Crear schema SQL (`db/contributions-schema.sql`)
2. ✅ Crear Server Actions (`app/app/contributions/actions.ts`)
3. ⏳ Aplicar schema en Supabase SQL Editor
4. ⏳ Actualizar tipos TypeScript con `supabase gen types`
5. ⏳ Crear página de configuración (`app/app/contributions/page.tsx`)
6. ⏳ Crear componentes de formulario
7. ⏳ Integrar con `createMovement()` para auto-tracking
8. ⏳ Agregar sección de contribuciones al dashboard principal
9. ⏳ Tests unitarios para cálculos proporcionales

## Consideraciones

- **Historial de ingresos**: Permite rastrear cambios a lo largo del tiempo
- **Ajustes manuales**: Flexibilidad para casos especiales
- **Auto-tracking**: Los gastos se contabilizan automáticamente
- **Estados claros**: Fácil ver quién va al día y quién no
- **Proporcionalidad justa**: Basado en ingresos reales de cada miembro
