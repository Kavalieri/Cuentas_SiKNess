# 🔍 Script de Diagnóstico - Bug Dashboard Producción

## 🎯 Objetivo
Identificar por qué el dashboard en producción muestra `81,45€` en lugar de `431,45€` (falta el ajuste de Vivienda de 350€).

---

## 📋 Ejecutar en Supabase SQL Editor (Producción)

### 1. Verificar Movimientos de Octubre 2025

```sql
-- Query 1: Ver TODOS los movimientos de octubre
SELECT 
  t.id,
  t.type,
  t.amount,
  t.description,
  t.occurred_at,
  t.category_id,
  t.adjustment_id,
  t.household_id,
  c.name as category_name,
  ca.reason as adjustment_reason,
  ca.status as adjustment_status
FROM transactions t
LEFT JOIN categories c ON t.category_id = c.id
LEFT JOIN contribution_adjustments ca ON t.adjustment_id = ca.id
WHERE t.occurred_at >= '2025-10-01'
  AND t.occurred_at <= '2025-10-31'
ORDER BY t.occurred_at DESC, t.created_at DESC;
```

**Resultado Esperado**:
- Deberías ver movimientos con `adjustment_reason = 'Vivienda'` o similar
- Total de gastos (type='expense') debería sumar ~431,45€

---

### 2. Calcular Totales Manualmente

```sql
-- Query 2: Calcular totales como lo hace getMonthSummary()
SELECT 
  t.household_id,
  SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END) as total_expenses,
  SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) as total_income,
  COUNT(*) as total_movimientos,
  COUNT(CASE WHEN t.adjustment_id IS NOT NULL THEN 1 END) as movimientos_con_ajuste
FROM transactions t
WHERE t.occurred_at >= '2025-10-01'
  AND t.occurred_at <= '2025-10-31'
GROUP BY t.household_id;
```

**Verificar**:
- `total_expenses` debería ser ~431,45
- Si es ~81,45, entonces falta el ajuste de Vivienda (350€)
- `movimientos_con_ajuste` debería ser > 0 si hay ajustes

---

### 3. Verificar Ajustes Aprobados

```sql
-- Query 3: Ver ajustes de octubre
SELECT 
  ca.id,
  ca.contribution_id,
  ca.reason,
  ca.amount,
  ca.status,
  ca.movement_id,
  ca.income_movement_id,
  ca.created_at,
  ca.approved_at,
  c.month,
  c.year
FROM contribution_adjustments ca
JOIN contributions c ON ca.contribution_id = c.id
WHERE c.year = 2025 AND c.month = 10
ORDER BY ca.created_at DESC;
```

**Verificar**:
- Ajuste de Vivienda (350€) debería tener `status = 'approved'`
- `movement_id` y `income_movement_id` NO deben ser NULL
- Si son NULL → los movimientos NO se crearon

---

### 4. Verificar que los Movimientos Existen

```sql
-- Query 4: Verificar movimientos vinculados a ajustes
SELECT 
  ca.id as adjustment_id,
  ca.reason,
  ca.amount as adjustment_amount,
  ca.movement_id,
  ca.income_movement_id,
  te.id as expense_transaction_id,
  te.amount as expense_amount,
  te.description as expense_description,
  ti.id as income_transaction_id,
  ti.amount as income_amount,
  ti.description as income_description
FROM contribution_adjustments ca
LEFT JOIN transactions te ON ca.movement_id = te.id
LEFT JOIN transactions ti ON ca.income_movement_id = ti.id
WHERE ca.status = 'approved'
  AND EXISTS (
    SELECT 1 FROM contributions c 
    WHERE c.id = ca.contribution_id 
      AND c.year = 2025 
      AND c.month = 10
  );
```

**Resultado Esperado**:
- Si `expense_transaction_id` es NULL → movimiento de gasto NO existe
- Si `income_transaction_id` es NULL → movimiento de ingreso NO existe
- **Problema identificado**: Los movimientos no se crearon en producción

---

### 5. Verificar Household ID

```sql
-- Query 5: Ver qué household ID se está usando
SELECT 
  h.id as household_id,
  h.name as household_name,
  hm.profile_id,
  p.email,
  hm.role
FROM households h
JOIN household_members hm ON h.id = hm.household_id
JOIN profiles p ON hm.profile_id = p.id
WHERE p.email = 'caballeropomes@gmail.com';  -- ← Cambiar por tu email
```

**Verificar**:
- El `household_id` debería coincidir con el que ves en los movimientos
- Si NO coincide → problema de contexto de household

---

## 🔧 Posibles Causas y Soluciones

### **Causa 1: Movimientos NO se Crearon en Producción**

**Síntoma**: 
- Query 4 muestra `expense_transaction_id = NULL` o `income_transaction_id = NULL`
- Los ajustes aprobados no tienen movimientos vinculados

**Solución**:
```sql
-- FIX: Recrear movimientos para ajustes aprobados sin movimientos
-- ⚠️ EJECUTAR CON CUIDADO - Verificar antes

DO $$
DECLARE
  adj record;
  expense_id uuid;
  income_id uuid;
  movement_date date;
BEGIN
  FOR adj IN 
    SELECT ca.*, c.year, c.month, c.household_id
    FROM contribution_adjustments ca
    JOIN contributions c ON ca.contribution_id = c.id
    WHERE ca.status = 'approved'
      AND (ca.movement_id IS NULL OR ca.income_movement_id IS NULL)
      AND c.year = 2025 
      AND c.month = 10
  LOOP
    -- Calcular fecha del movimiento
    movement_date := make_date(adj.year, adj.month, 1);
    
    -- Crear movimiento de GASTO
    INSERT INTO transactions (
      household_id, type, amount, currency, 
      category_id, description, occurred_at
    ) VALUES (
      adj.household_id, 
      'expense', 
      ABS(adj.amount), 
      'EUR',
      adj.expense_category_id,
      adj.expense_description,
      movement_date
    ) RETURNING id INTO expense_id;
    
    -- Crear movimiento de INGRESO
    INSERT INTO transactions (
      household_id, type, amount, currency,
      category_id, description, occurred_at
    ) VALUES (
      adj.household_id,
      'income',
      ABS(adj.amount),
      'EUR',
      NULL,  -- o usar income_category_id si existe
      adj.income_description,
      movement_date
    ) RETURNING id INTO income_id;
    
    -- Actualizar ajuste
    UPDATE contribution_adjustments
    SET movement_id = expense_id,
        income_movement_id = income_id
    WHERE id = adj.id;
    
    RAISE NOTICE 'Recreated movements for adjustment %: expense=%, income=%', 
      adj.id, expense_id, income_id;
  END LOOP;
END $$;
```

---

### **Causa 2: Query de Dashboard Filtra Incorrectamente**

**Síntoma**:
- Query 1 y 2 muestran todos los movimientos incluyendo ajustes
- Pero dashboard aún muestra 81,45€

**Solución**: Revisar código en `app/app/expenses/actions.ts` línea 184-188

**Posible problema**:
```typescript
// Si hay algún filtro adicional escondido:
.is('adjustment_id', null)  // ← Esto excluiría ajustes
```

**Verificar en código actual** si existe algún filtro así.

---

### **Causa 3: Problema de Cache en Vercel**

**Síntoma**:
- Queries en Supabase muestran datos correctos
- Dashboard local muestra 431,45€
- Dashboard producción muestra 81,45€

**Solución**:
1. Invalidar cache de Vercel
2. Hacer redeploy forzado

```bash
# En terminal local
vercel env pull .env.vercel.production
vercel --prod --force
```

O desde Vercel Dashboard:
- Ir a Deployments
- Click en el deployment actual
- Click "Redeploy"

---

## 📊 Resultados de Diagnóstico

### Completa esta tabla después de ejecutar las queries:

| Query | Resultado | ¿Es el esperado? | Notas |
|-------|-----------|------------------|-------|
| Query 1 | Total movimientos: ___ | ⬜ Sí ⬜ No | |
| Query 2 | total_expenses: ___.__ € | ⬜ Sí ⬜ No | Esperado: ~431,45€ |
| Query 2 | movimientos_con_ajuste: ___ | ⬜ Sí ⬜ No | Esperado: > 0 |
| Query 3 | Ajustes aprobados: ___ | ⬜ Sí ⬜ No | |
| Query 4 | Movimientos vinculados: ___ | ⬜ Sí ⬜ No | ¿Hay NULLs? |
| Query 5 | household_id correcto | ⬜ Sí ⬜ No | |

---

## 🎯 Próximos Pasos Según Resultados

### Si Query 4 muestra NULLs:
→ **Ejecutar script de FIX** (Causa 1)
→ Verificar que movimientos se crearon
→ Revalidar dashboard

### Si Query 2 muestra 431,45€:
→ **Problema es de cache o código**
→ Revisar `getMonthSummary()` en actions.ts
→ Hacer redeploy forzado

### Si nada funciona:
→ **Comparar entornos**
→ Verificar variables de entorno en Vercel
→ Verificar que `NEXT_PUBLIC_SUPABASE_URL` apunta a producción

---

## 📝 Envíame los Resultados

Por favor copia y pega los resultados de las queries 1-5 para que pueda diagnosticar el problema exacto y proporcionar la solución correcta.
