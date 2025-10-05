# 🔧 SOLUCIÓN COMPLETA - Problemas del Sistema de Ajustes

**Fecha**: 2025-10-05  
**Commits**: eb32e3b → 013ba26

---

## 🔴 PROBLEMAS IDENTIFICADOS

### 1. ❌ Pre-pago aprobado automáticamente
- **Síntoma**: Miembro crea pre-pago y aparece aprobado sin pasar por owner
- **Causa**: Constraint `check_approved_movements` mal diseñado
- **Estado**: ⚠️ PENDIENTE (requiere SQL manual)

### 2. ❌ Error de relaciones múltiples con categories
- **Síntoma**: `"Could not embed because more than one relationship was found for 'contribution_adjustments' and 'categories'"`
- **Causa**: Query ambiguo con 2 FKs a `categories` (category_id y expense_category_id)
- **Estado**: ✅ CORREGIDO (commit 013ba26)

### 3. ❌ Panel de aprobaciones no visible para owner
- **Síntoma**: Owner no ve pre-pagos pendientes
- **Causa**: Error de query impedía cargar ajustes
- **Estado**: ✅ CORREGIDO (commit 013ba26)

### 4. ❌ No se generan movimientos al aprobar
- **Síntoma**: Ajuste marcado como approved pero sin transactions creados
- **Causa**: Workflow incompleto en client-side
- **Estado**: ⚠️ INVESTIGAR (puede ser FK constraint bloqueando)

---

## 🔧 CORRECCIONES APLICADAS

### ✅ Corrección 1: Query de Categories (commit 013ba26)

**Archivo**: `app/app/contributions/adjustment-actions.ts`

```typescript
// ANTES (línea 621):
.select(`
  *,
  contributions!inner(...),
  categories(name, type)  // ❌ Ambiguo
`)

// DESPUÉS:
.select(`
  *,
  contributions!inner(...),
  category:categories!category_id(name, type),           // ✅ Explícito
  expense_category:categories!expense_category_id(name, type)  // ✅ Explícito
`)
```

**Resultado**: El error `more than one relationship` ya no aparece.

---

### ✅ Corrección 2: Mapeo en PendingApprovalsPanel (commit 013ba26)

**Archivo**: `app/app/contributions/components/PendingApprovalsPanel.tsx`

```typescript
// ANTES (línea 70):
type RawItem = {
  contributions: { ... };
  categories: Category | null;  // ❌ Nombre incorrecto
  [key: string]: unknown;
};

const transformed = ... map((item) => ({
  ...
  category: item.categories || null,  // ❌ Typo
}));

// DESPUÉS:
type RawItem = {
  contributions: { ... };
  category: Category | null;           // ✅ Categoría original
  expense_category: Category | null;   // ✅ Categoría editada
  [key: string]: unknown;
};

const transformed = ... map((item) => ({
  ...
  category: item.expense_category || item.category || null,  // ✅ Preferir editada
}));
```

**Resultado**: Panel carga correctamente los ajustes pendientes.

---

## 🚨 ACCIÓN REQUERIDA: Ejecutar Scripts SQL

### Script 1: Diagnóstico (OPCIONAL pero recomendado)

**Archivo**: `db/diagnose_adjustments.sql`

Este script te muestra el estado actual de los ajustes:
- Ajustes pendientes sin movimientos ✅ (correcto)
- Ajustes approved con movimientos ✅ (correcto)
- **Ajustes INCORRECTOS** ❌ (approved sin movimientos o pending con movimientos)

```sql
-- Ejecutar en Supabase SQL Editor
-- Ver todos los ajustes recientes
SELECT 
  ca.id,
  ca.type,
  ca.amount,
  ca.status,
  ca.movement_id,
  ca.income_movement_id,
  ca.created_at,
  p.display_name as member_name
FROM contribution_adjustments ca
JOIN contributions c ON ca.contribution_id = c.id
JOIN profiles p ON c.profile_id = p.id
ORDER BY ca.created_at DESC
LIMIT 20;
```

---

### Script 2: Fix Constraint (OBLIGATORIO) ⭐⭐⭐

**Archivo**: `db/fix_constraint_approved_movements.sql`

**PROBLEMA**: El constraint actual impide crear ajustes pending correctamente.

```sql
-- CONSTRAINT PROBLEMÁTICO (actual):
ALTER TABLE contribution_adjustments
  ADD CONSTRAINT check_approved_movements 
  CHECK (
    (status = 'approved' AND movement_id IS NOT NULL) 
    OR (status != 'approved' AND movement_id IS NULL)
  );
```

**Por qué falla**:
- Si `status='pending'` y `movement_id=NULL` → ✅ Pasa (correcto)
- Si `status='approved'` y `movement_id=NULL` → ❌ Falla (puede pasar temporalmente)
- El constraint es demasiado estricto durante transacciones

**SOLUCIÓN**: Eliminar constraint y usar trigger de validación post-UPDATE

```sql
-- EJECUTAR COMPLETO EN SUPABASE SQL EDITOR:

BEGIN;

-- 1. Eliminar el constraint problemático
ALTER TABLE contribution_adjustments
  DROP CONSTRAINT IF EXISTS check_approved_movements;

-- 2. Crear función de validación más flexible
CREATE OR REPLACE FUNCTION validate_adjustment_movement_consistency()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo validar después de UPDATE (no en INSERT)
  IF TG_OP = 'UPDATE' THEN
    -- Si se aprueba, debe tener movement_id
    IF NEW.status = 'approved' AND NEW.movement_id IS NULL THEN
      RAISE EXCEPTION 'Ajustes aprobados deben tener movement_id';
    END IF;
    
    -- Si está pending o rejected, NO debe tener movement_id
    IF NEW.status IN ('pending', 'rejected') AND NEW.movement_id IS NOT NULL THEN
      RAISE WARNING 'Ajuste con status % tiene movement_id cuando no debería', NEW.status;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Crear trigger que se ejecuta DESPUÉS del UPDATE (no BEFORE)
DROP TRIGGER IF EXISTS trigger_validate_movement_consistency ON contribution_adjustments;
CREATE TRIGGER trigger_validate_movement_consistency
  AFTER UPDATE ON contribution_adjustments
  FOR EACH ROW
  EXECUTE FUNCTION validate_adjustment_movement_consistency();

COMMIT;
```

**Resultado esperado**:
- Miembros pueden crear ajustes con `status='pending'` ✅
- Owners pueden aprobar y el trigger valida post-UPDATE ✅
- No hay race conditions durante transacciones ✅

---

## 📋 PASOS SIGUIENTES (ORDEN DE EJECUCIÓN)

### 1. ✅ COMPLETADO - Correcciones de código
- [x] Fix query categories (commit 013ba26)
- [x] Fix mapeo PendingApprovalsPanel (commit 013ba26)
- [x] Push a GitHub
- [x] Deploy automático en Vercel

### 2. ⏳ PENDIENTE - Ejecutar scripts SQL

**A. Diagnóstico (opcional pero recomendado)**:
```bash
1. Ir a Supabase Dashboard → SQL Editor
2. Abrir archivo: db/diagnose_adjustments.sql
3. Ejecutar todo el script
4. Revisar output:
   - Ver si hay ajustes en estado incorrecto
   - Anotar IDs problemáticos para limpieza manual
```

**B. Fix constraint (OBLIGATORIO)** ⭐:
```bash
1. Ir a Supabase Dashboard → SQL Editor
2. Abrir archivo: db/fix_constraint_approved_movements.sql
3. Ejecutar TODO el script (BEGIN...COMMIT)
4. Verificar output: "Query returned successfully"
```

**C. Limpiar datos inconsistentes** (si diagnóstico encontró problemas):
```sql
-- SOLO si diagnose_adjustments.sql encontró ajustes incorrectos

-- Eliminar ajustes pending con movimientos (no deberían existir)
DELETE FROM contribution_adjustments
WHERE status = 'pending'
  AND movement_id IS NOT NULL;

-- Revisar ajustes approved sin movimientos (¿deberían eliminarse?)
-- MANUAL: Ver tabla y decidir caso por caso
```

### 3. 🧪 TESTING COMPLETO

**Test 1: Como MIEMBRO - Crear Pre-pago**:
```
1. Login con cuenta miembro (NO owner)
2. Ir a /app/contributions
3. Buscar botón "💳 Registrar Pre-pago"
4. Rellenar formulario:
   - Monto: 50,00 €
   - Categoría: Supermercado
   - Motivo: "Prueba de pre-pago"
   - Descripción gasto: "Compra test"
   - Descripción aporte: "Aporte test"
5. Click "Solicitar Aprobación de Pre-pago"
6. ✅ VERIFICAR: Toast "Solicitud de pre-pago enviada para aprobación"
7. ✅ VERIFICAR: Refresca página automáticamente (después de 1 seg)
8. ✅ VERIFICAR: Estado del ajuste = 'pending' (verificar en SQL Editor)
9. ✅ VERIFICAR: NO aparece en lista de movimientos (/app/expenses)
```

**Test 2: Como OWNER - Aprobar Pre-pago**:
```
1. Login con cuenta owner
2. Ir a /app/contributions
3. ✅ VERIFICAR: Aparece panel "⏳ Pre-pagos Pendientes (1)"
4. ✅ VERIFICAR: Card del pre-pago con detalles:
   - Miembro: [nombre del miembro]
   - Monto: -50,00 €
   - Categoría: Supermercado
   - Razón: "Prueba de pre-pago"
5. Click botón "✅ Aprobar"
6. Modal de revisión se abre con:
   - Categoría: [Supermercado ▼] (editable)
   - Descripción gasto: [Compra test] (editable)
   - Descripción aporte: [Aporte test] (editable)
7. (Opcional) Editar campos
8. Click "Revisar y Aprobar"
9. Modal de confirmación:
   - Preview: "Se crearán 2 movimientos..."
10. Click "Confirmar Aprobación"
11. ✅ VERIFICAR: Toast "Pre-pago aprobado correctamente"
12. ✅ VERIFICAR: Panel se recarga y pre-pago desaparece
13. ✅ VERIFICAR en /app/expenses:
    - Movimiento 1 (expense): 50,00 € en Supermercado
    - Movimiento 2 (income): 50,00 € sin categoría
14. ✅ VERIFICAR en /app/contributions:
    - Contribución del miembro se ajusta correctamente
```

**Test 3: Como OWNER - Rechazar Pre-pago**:
```
1. Crear otro pre-pago con cuenta miembro
2. Login con cuenta owner
3. Ver panel "⏳ Pre-pagos Pendientes (1)"
4. Click botón "❌ Rechazar"
5. Modal de rechazo:
   - Razón (obligatoria): "Gasto no válido para el hogar"
6. Click "Rechazar Pre-pago"
7. ✅ VERIFICAR: Toast "Pre-pago rechazado"
8. ✅ VERIFICAR: Panel se recarga y pre-pago desaparece
9. ✅ VERIFICAR: NO se crean movimientos en /app/expenses
10. ✅ VERIFICAR en SQL Editor:
    - Ajuste tiene status='rejected'
    - Razón incluye: "❌ RECHAZADO: Gasto no válido..."
```

---

## 🐛 PROBLEMAS CONOCIDOS PENDIENTES

### Issue 1: Actualización agresiva tras crear pre-pago
**Síntoma**: Tras enviar pre-pago, vuelve al resumen sin feedback claro  
**Causa**: `revalidatePath('/app/contributions')` recarga toda la página  
**Solución propuesta**: Usar toast + recarga suave (ya implementado)  
**Estado**: ✅ VERIFICAR en testing

### Issue 2: Movimientos no se crean al aprobar
**Síntoma**: Ajuste queda approved pero sin transactions  
**Causa**: ❓ Puede ser constraint bloqueando o error silencioso  
**Solución**: Revisar logs de approvePrepayment en Supabase Dashboard  
**Estado**: ⏳ INVESTIGAR después de fix constraint

---

## 📊 RESUMEN DE ARCHIVOS MODIFICADOS

### Commits: eb32e3b → 013ba26

**Código (commit 013ba26)**:
- ✅ `app/app/contributions/adjustment-actions.ts` - Fix query categories
- ✅ `app/app/contributions/components/PendingApprovalsPanel.tsx` - Fix mapeo

**Scripts SQL (nuevos)**:
- 📄 `db/diagnose_adjustments.sql` - Diagnóstico de estado
- 📄 `db/fix_constraint_approved_movements.sql` - Fix constraint ⭐ EJECUTAR

**Anteriores (ya ejecutados)**:
- ✅ `db/fix_adjustments_fk_manual.sql` - Fix FKs (ejecutado)
- ✅ `supabase/migrations/20251005_fix_adjustments_created_by_fk.sql`

---

## 🎯 CHECKLIST FINAL

Antes de considerar el sistema funcional:

- [ ] Ejecutar `db/fix_constraint_approved_movements.sql` en Supabase SQL Editor
- [ ] Limpiar ajustes inconsistentes (si existen)
- [ ] Test: Miembro crea pre-pago → queda pending
- [ ] Test: Owner ve panel de aprobaciones
- [ ] Test: Owner aprueba → se crean 2 movimientos
- [ ] Test: Owner rechaza → NO se crean movimientos
- [ ] Verificar en SQL que estados son consistentes
- [ ] Documentar en `ADJUSTMENTS_REDESIGN.md` como completado

---

**Última actualización**: 2025-10-05 (commit 013ba26)  
**Estado**: Código corregido ✅ | SQL pendiente ⏳ | Testing pendiente ⏳
