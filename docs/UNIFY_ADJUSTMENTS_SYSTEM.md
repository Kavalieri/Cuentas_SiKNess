# Unificación de Sistema de Ajustes

**Fecha**: 2025-10-04  
**Objetivo**: Unificar `pre_payments` y `contribution_adjustments` en un sistema único más simple y flexible

## 📊 Estado Actual (2 Sistemas Separados)

### Sistema 1: `pre_payments`
```sql
CREATE TABLE pre_payments (
  id UUID PRIMARY KEY,
  household_id UUID REFERENCES households(id),
  profile_id UUID REFERENCES profiles(id),
  month INT,
  year INT,
  amount NUMERIC(10,2),           -- Siempre POSITIVO
  category_id UUID,
  description TEXT,
  movement_id UUID,               -- Referencia a transactions
  created_by UUID,
  created_at TIMESTAMPTZ
);
```
**Uso**: Gastos adelantados por un miembro → RESTA de la contribución  
**Trigger**: Actualiza `contributions.pre_payment_amount`

### Sistema 2: `contribution_adjustments`
```sql
CREATE TABLE contribution_adjustments (
  id UUID PRIMARY KEY,
  contribution_id UUID REFERENCES contributions(id),
  amount NUMERIC(10,2),           -- Puede ser + o -
  reason TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ
);
```
**Uso**: Ajustes manuales → SUMA o RESTA a la contribución  
**Problema**: NO se aplica automáticamente al cálculo

## 🎯 Sistema Unificado Propuesto

### Nueva Tabla: `contribution_adjustments` (ampliada)
```sql
ALTER TABLE contribution_adjustments (
  id UUID PRIMARY KEY,
  contribution_id UUID REFERENCES contributions(id),
  amount NUMERIC(10,2),           -- + suma, - resta
  type VARCHAR(50),               -- 'prepayment', 'manual', 'bonus', 'penalty'
  reason TEXT,
  category_id UUID,               -- Opcional (para pre-pagos)
  movement_id UUID,               -- Opcional (vinculado a transacción)
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### Tipos de Ajustes
- `prepayment`: Gasto adelantado (amount negativo, vinculado a transaction)
- `manual`: Ajuste manual del owner (+ o -)
- `bonus`: Bonificación o descuento (amount negativo)
- `penalty`: Penalización o cargo extra (amount positivo)

## 📐 Cálculo Unificado

### Fórmula Nueva
```
Contribución Base = (Ingreso Miembro / Total Ingresos) × Meta Mensual

Ajustes Totales = Σ(contribution_adjustments.amount)
                  ↓
              (incluye pre-pagos como amount negativo)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Esperado = Contribución Base + Ajustes Totales
```

### Eliminaciones
- ❌ `contributions.pre_payment_amount` (columna obsoleta)
- ❌ Función `calculate_pre_payment_amount()`
- ❌ Función `update_contribution_pre_payment_amount()`
- ❌ Trigger `trigger_update_pre_payment_amount`
- ❌ Tabla `pre_payments`

## 🔄 Plan de Migración

### Paso 1: Ampliar `contribution_adjustments`
```sql
ALTER TABLE contribution_adjustments 
  ADD COLUMN type VARCHAR(50) DEFAULT 'manual',
  ADD COLUMN category_id UUID REFERENCES categories(id),
  ADD COLUMN movement_id UUID REFERENCES transactions(id),
  ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();

-- Cambiar created_by de auth.users a profiles
ALTER TABLE contribution_adjustments
  DROP CONSTRAINT IF EXISTS contribution_adjustments_created_by_fkey,
  ADD CONSTRAINT contribution_adjustments_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES profiles(id);
```

### Paso 2: Migrar datos de `pre_payments`
```sql
INSERT INTO contribution_adjustments (
  contribution_id,
  amount,
  type,
  reason,
  category_id,
  movement_id,
  created_by,
  created_at
)
SELECT 
  c.id,
  -pp.amount,                    -- NEGATIVO para restar
  'prepayment',
  COALESCE(pp.description, 'Pre-pago migrado'),
  pp.category_id,
  pp.movement_id,
  p.id,                          -- Mapear auth.users → profiles
  pp.created_at
FROM pre_payments pp
JOIN contributions c 
  ON c.household_id = pp.household_id 
  AND c.profile_id = pp.profile_id
  AND c.year = pp.year
  AND c.month = pp.month
LEFT JOIN profiles p 
  ON p.auth_user_id = pp.created_by;
```

### Paso 3: Actualizar `contributions` para calcular ajustes
```sql
-- Crear columna temporal para nuevos ajustes
ALTER TABLE contributions 
  ADD COLUMN adjustments_total NUMERIC(10,2) DEFAULT 0;

-- Calcular total de ajustes
UPDATE contributions c
SET adjustments_total = COALESCE(
  (SELECT SUM(amount) FROM contribution_adjustments WHERE contribution_id = c.id),
  0
);

-- Actualizar expected_amount
UPDATE contributions
SET expected_amount = expected_amount + adjustments_total - COALESCE(pre_payment_amount, 0);

-- Eliminar columna obsoleta
ALTER TABLE contributions DROP COLUMN pre_payment_amount;
```

### Paso 4: Crear trigger unificado
```sql
CREATE OR REPLACE FUNCTION update_contribution_adjustments_total()
RETURNS TRIGGER AS $$
DECLARE
  v_contribution_id UUID;
  v_new_total NUMERIC;
BEGIN
  v_contribution_id := COALESCE(NEW.contribution_id, OLD.contribution_id);
  
  -- Calcular suma de todos los ajustes
  SELECT COALESCE(SUM(amount), 0)
  INTO v_new_total
  FROM contribution_adjustments
  WHERE contribution_id = v_contribution_id;
  
  -- Actualizar contributions.adjustments_total
  UPDATE contributions
  SET adjustments_total = v_new_total,
      updated_at = NOW()
  WHERE id = v_contribution_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_adjustments_total
  AFTER INSERT OR UPDATE OR DELETE ON contribution_adjustments
  FOR EACH ROW
  EXECUTE FUNCTION update_contribution_adjustments_total();
```

### Paso 5: Eliminar sistema antiguo
```sql
DROP TRIGGER IF EXISTS trigger_update_pre_payment_amount ON pre_payments;
DROP FUNCTION IF EXISTS update_contribution_pre_payment_amount();
DROP FUNCTION IF EXISTS calculate_pre_payment_amount();
DROP TABLE IF EXISTS pre_payments;
```

## 🎨 Cambios en UI

### Componentes a Modificar
- ❌ `PrePaymentsSection.tsx` → ELIMINAR
- ✅ `ContributionAdjustmentsSection.tsx` → NUEVO (unificado)
- ✅ `ContributionCard.tsx` → Mostrar todos los ajustes

### Nueva Sección de Ajustes (Solo Owner)
```tsx
<ContributionAdjustmentsSection>
  <AdjustmentTypeSelector>
    - Pre-pago (gasto adelantado)
    - Ajuste manual
    - Bonificación
    - Penalización
  </AdjustmentTypeSelector>
  
  <AdjustmentForm>
    - Miembro
    - Tipo
    - Monto (+ o -)
    - Razón/Descripción
    - Categoría (opcional)
  </AdjustmentForm>
  
  <AdjustmentsList>
    {adjustments.map(adj => (
      <AdjustmentCard>
        {adj.type === 'prepayment' && <LinkToTransaction />}
        <Amount className={adj.amount > 0 ? 'text-red' : 'text-green'} />
        <Reason />
        <CreatedBy />
      </AdjustmentCard>
    ))}
  </AdjustmentsList>
</ContributionAdjustmentsSection>
```

### Vista de Contribución Individual
```
┌─────────────────────────────────────────────┐
│ Contribución de Juan - Octubre 2025         │
├─────────────────────────────────────────────┤
│ Base proporcional:           750.00 €       │
│                                             │
│ Ajustes aplicados:                          │
│  🔴 + Cargo médicos         +50.00 €        │
│  🟢 - Pre-pago: Luz        -100.00 €   🔗   │
│  🟢 - Descuento mes         -25.00 €        │
│ ─────────────────────────────────────────   │
│ TOTAL AJUSTES:               -75.00 €       │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ CONTRIBUCIÓN ESPERADA:       675.00 €       │
│ Pagado:                      500.00 €       │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ PENDIENTE:                   175.00 €       │
└─────────────────────────────────────────────┘
```

## 🔧 Cambios en Actions

### Eliminar
- ❌ `createPrePayment()`
- ❌ `getPrePayments()`
- ❌ `deletePrePayment()`

### Actualizar
```typescript
// Unificar en una sola acción
export async function addContributionAdjustment(formData: FormData): Promise<Result> {
  const schema = z.object({
    contribution_id: z.string().uuid(),
    amount: z.coerce.number(),  // Puede ser + o -
    type: z.enum(['prepayment', 'manual', 'bonus', 'penalty']),
    reason: z.string().min(3),
    category_id: z.string().uuid().optional(),
    movement_id: z.string().uuid().optional(),
  });
  
  // ... validación y insert
  
  // El trigger actualizará automáticamente contributions.adjustments_total
}
```

## ✅ Ventajas del Sistema Unificado

1. **Simplicidad Conceptual**
   - Un solo lugar para todos los ajustes
   - Fórmula más directa: Base + Ajustes = Total

2. **Flexibilidad**
   - Agregar nuevos tipos de ajustes fácilmente
   - Monto positivo o negativo según necesidad

3. **Código Más Limpio**
   - Menos tablas, menos funciones, menos triggers
   - Una sola acción para agregar ajustes

4. **UI Más Intuitiva**
   - Todo en una misma sección
   - Historial unificado de ajustes

5. **Auditoría Mejorada**
   - Todos los cambios en un solo lugar
   - Tipo explícito para cada ajuste

## 📋 Checklist de Implementación

- [ ] Crear migración `20251004040000_unify_adjustments_system.sql`
- [ ] Ampliar tabla `contribution_adjustments`
- [ ] Migrar datos de `pre_payments`
- [ ] Actualizar columnas de `contributions`
- [ ] Crear trigger unificado
- [ ] Eliminar sistema antiguo
- [ ] Actualizar actions.ts
- [ ] Crear `ContributionAdjustmentsSection.tsx`
- [ ] Eliminar `PrePaymentsSection.tsx`
- [ ] Actualizar `ContributionCard.tsx`
- [ ] Actualizar `page.tsx` de contributions
- [ ] Testing manual completo
- [ ] Documentar nuevos flujos
- [ ] Commit y push

## 🚀 Orden de Implementación

1. **Base de datos** (migración completa)
2. **Backend** (actions.ts)
3. **Frontend** (componentes)
4. **Testing**
5. **Documentación**
