# Plan de Pruebas - Sistema Dual-Field

**Fecha**: 2 Noviembre 2025  
**Issues**: #19, #20, #18  
**Commits**: 7c9d6a2 (Phase 1), a193a7a (Phase 2), fdba4c3 (Phase 3), 51ea18b (Phase 4), 32c2c2a (Phase 5)

---

## 🎯 Objetivo

Validar que el sistema dual-field (`paid_by` + `performed_by_profile_id`) funciona correctamente en todos los flujos de transacciones.

---

## 🧪 Pruebas Funcionales

### TEST 1: Crear Gasto Común con Ejecutor Diferente

**Objetivo**: Validar que el selector "¿Quién realizó?" funciona y persiste correctamente.

**Precondiciones**:
- Hogar con 2 miembros: "Kava" y "Pareja"
- Usuario logueado: Kava (owner)
- Periodo activo en fase "active"

**Pasos**:
1. Abrir formulario "Nuevo movimiento"
2. Seleccionar tipo: "Gasto común"
3. Seleccionar categoría: Alimentación → Supermercado → Compra Semanal
4. Seleccionar ejecutor: "Pareja" (diferente del usuario actual)
5. Ingresar cantidad: 50.00€
6. Ingresar descripción: "Mercadona"
7. Click "Crear"

**Resultado Esperado**:
- ✅ Toast: "Movimiento creado correctamente"
- ✅ Transacción visible en lista
- ✅ Display: "Cuenta Común (realizado por Pareja)"
- ✅ En base de datos:
  ```sql
  paid_by = joint_account_uuid
  performed_by_profile_id = pareja_uuid
  type = 'expense'
  flow_type = 'common'
  ```

**Validación Backend**:
```sql
SELECT 
  t.id,
  t.type,
  t.flow_type,
  t.paid_by,
  t.performed_by_profile_id,
  ja.display_name as joint_account_name,
  p.display_name as performer_name
FROM transactions t
LEFT JOIN joint_accounts ja ON t.paid_by = ja.id
LEFT JOIN profiles p ON t.performed_by_profile_id = p.id
WHERE t.id = '<transaction_id>';

-- Resultado esperado:
-- type: expense
-- flow_type: common
-- joint_account_name: Cuenta Común
-- performer_name: Pareja
```

---

### TEST 2: Crear Ingreso Común (Usuario Actual = Ejecutor)

**Objetivo**: Validar que ingresos comunes usan el usuario actual como ejecutor por defecto.

**Precondiciones**:
- Usuario logueado: Kava
- Periodo activo en fase "active"

**Pasos**:
1. Abrir formulario "Nuevo movimiento"
2. Seleccionar tipo: "Ingreso común"
3. Seleccionar categoría: Ingresos → Salario → Nómina
4. Verificar selector "¿Quién realizó?": debe mostrar "Kava" (pre-seleccionado)
5. Ingresar cantidad: 1500.00€
6. Ingresar descripción: "Nómina Noviembre"
7. Click "Crear"

**Resultado Esperado**:
- ✅ Display: "Kava" (sin "Cuenta Común" porque ingreso va directo desde miembro)
- ✅ En base de datos:
  ```sql
  paid_by = kava_uuid (quien aporta)
  performed_by_profile_id = kava_uuid (quien lo hizo)
  type = 'income'
  flow_type = 'common'
  ```

---

### TEST 3: Crear Gasto Directo (NUEVO CRITERIO)

**Objetivo**: Validar que gastos directos usan `paid_by = joint_account_uuid` (Issue #18).

**Precondiciones**:
- Usuario logueado: Kava
- Periodo en fase "validation" o "active"

**Pasos**:
1. Abrir formulario "Nuevo movimiento"
2. Seleccionar tipo: "Gasto directo"
3. Seleccionar categoría: Transporte → Gasolina → Repostaje
4. Seleccionar "Pagado por": Kava
5. Ingresar cantidad: 60.00€
6. Ingresar descripción: "Gasolina Repsol"
7. Click "Crear"

**Resultado Esperado**:
- ✅ Display: "Kava" (real_payer)
- ✅ Badge: "Directo"
- ✅ En base de datos:
  ```sql
  paid_by = joint_account_uuid  -- ✅ NUEVO CRITERIO
  performed_by_profile_id = kava_uuid
  real_payer_id = kava_uuid (legacy)
  type = 'expense_direct'
  flow_type = 'direct'
  ```
- ✅ Par compensatorio creado automáticamente:
  ```sql
  type = 'income_direct'
  paid_by = kava_uuid
  performed_by_profile_id = NULL (sistema)
  ```

**Validación NUEVO CRITERIO**:
```sql
-- Verificar que TODOS los gastos directos usan joint_account
SELECT COUNT(*) as total,
       COUNT(CASE WHEN ja.id IS NOT NULL THEN 1 END) as con_joint_account
FROM transactions t
LEFT JOIN joint_accounts ja ON t.paid_by = ja.id
WHERE t.type = 'expense_direct' AND t.flow_type = 'direct';

-- Resultado esperado: total = con_joint_account
```

---

### TEST 4: Validación - Ejecutor Requerido

**Objetivo**: Validar que el formulario no permite crear transacciones comunes sin ejecutor.

**Pasos**:
1. Abrir formulario "Nuevo movimiento"
2. Seleccionar tipo: "Gasto común"
3. Seleccionar categoría: Ocio → Cine → Entradas
4. **NO seleccionar** "¿Quién realizó?"
5. Ingresar cantidad: 20.00€
6. Click "Crear"

**Resultado Esperado**:
- ❌ Error: "Selecciona quién realizó la transacción"
- ❌ Transacción NO creada
- ✅ Formulario permanece abierto

---

### TEST 5: Persistencia LocalStorage (UX)

**Objetivo**: Validar que el formulario recuerda el último ejecutor seleccionado.

**Pasos**:
1. Crear transacción con ejecutor "Pareja" (TEST 1)
2. Verificar toast "Movimiento creado correctamente"
3. **NO cerrar el modal** (formulario permanece abierto)
4. Verificar que selector "¿Quién realizó?" mantiene "Pareja" seleccionado
5. Cambiar solo cantidad: 35.00€
6. Click "Crear" nuevamente
7. Cerrar modal
8. Reabrir modal "Nuevo movimiento"

**Resultado Esperado**:
- ✅ Segunda transacción creada con ejecutor "Pareja" (sin cambiar selector)
- ✅ Al reabrir modal, selector pre-selecciona "Pareja" (recordado desde localStorage)
- ✅ Usuario puede crear múltiples transacciones sin re-seleccionar ejecutor

**Validación UX**:
```javascript
// En DevTools Console:
localStorage.getItem('newMovementForm_<household_id>');

// Debe contener:
{
  "type": "expense",
  "selectedParentId": "...",
  "selectedCategoryId": "...",
  "selectedSubcategoryId": "...",
  "performedBy": "pareja_uuid"  // ✅ Persistido
}
```

---

### TEST 6: Editar Transacción - Preservar Ejecutor

**Objetivo**: Validar que ediciones preservan `performed_by_profile_id`.

**Precondiciones**:
- Transacción existente (gasto directo) con performed_by = "Kava"

**Pasos**:
1. Localizar transacción en lista
2. Click en tarjeta para expandir
3. Click botón "Editar"
4. Cambiar cantidad: 70.00€ (antes 60.00€)
5. Cambiar descripción: "Gasolina Repsol - Centro"
6. Guardar

**Resultado Esperado**:
- ✅ Display sigue mostrando "Kava" como pagador
- ✅ En base de datos:
  ```sql
  performed_by_profile_id = kava_uuid  -- ✅ PRESERVADO
  amount = 70.00  -- ✅ ACTUALIZADO
  description = 'Gasolina Repsol - Centro'  -- ✅ ACTUALIZADO
  ```

**Validación Backend**:
```sql
-- Verificar historial de auditoría
SELECT 
  id,
  performed_by_profile_id,
  amount,
  description,
  updated_at,
  updated_by_profile_id
FROM transactions
WHERE id = '<transaction_id>'
ORDER BY updated_at DESC;

-- performed_by_profile_id NO debe cambiar tras edición
```

---

### TEST 7: Display de Transacciones Migradas (Datos Históricos)

**Objetivo**: Validar que las 449 transacciones migradas (Phase 1) muestran ejecutor correctamente.

**Precondiciones**:
- Migraciones de Phase 1 aplicadas (198 DEV + 251 PROD)

**Pasos**:
1. Navegar a lista de transacciones (periodo actual o global)
2. Expandir varias tarjetas de transacciones antiguas (pre-migración)
3. Verificar display "Gastado por"

**Resultado Esperado**:

**Gastos comunes (25 PROD)**:
- ✅ Display: "Cuenta Común (realizado por Kava)" o "Cuenta Común (realizado por Pareja)"
- ✅ Dependiendo de `profile_id` original migrado a `performed_by_profile_id`

**Gastos directos (111 PROD)**:
- ✅ Display: "Kava" o "Pareja" (sin cambios aparentes, pero backend correcto)
- ✅ `paid_by = joint_account_uuid` (NUEVO CRITERIO aplicado)

**Ingresos compensatorios (111 PROD)**:
- ✅ Display: "Kava" o "Pareja" (beneficiario)
- ✅ NO muestra ejecutor (performed_by = NULL, sistema automático)

**Validación SQL**:
```sql
-- Verificar cobertura de migración
SELECT 
  COUNT(*) as total_transacciones,
  COUNT(performed_by_profile_id) as con_ejecutor,
  COUNT(*) - COUNT(performed_by_profile_id) as sin_ejecutor
FROM transactions;

-- Resultado esperado PROD:
-- total_transacciones: 251
-- con_ejecutor: 240 (240 con ejecutor manual)
-- sin_ejecutor: 11 (ingresos compensatorios automáticos)
```

---

## 🔍 Pruebas de Regresión

### TEST 8: Compatibilidad con Transacciones Legacy (Sin Ejecutor)

**Objetivo**: Validar que transacciones antiguas sin `performed_by_profile_id` no rompen la UI.

**Pasos**:
1. Insertar transacción manualmente en DEV sin ejecutor:
```sql
INSERT INTO transactions (
  household_id, profile_id, type, flow_type, amount, 
  occurred_at, paid_by, performed_by_profile_id
) VALUES (
  '<household_id>', '<kava_id>', 'expense', 'common', 25.00,
  '2025-10-15', '<joint_account_id>', NULL  -- ❌ Sin ejecutor
);
```
2. Recargar lista de transacciones
3. Verificar display

**Resultado Esperado**:
- ✅ Display: "Cuenta Común" (sin ejecutor, fallback correcto)
- ✅ NO hay error en UI
- ✅ Tarjeta se renderiza correctamente

---

### TEST 9: Owner vs Member - Permisos de Selección

**Objetivo**: Validar que members solo pueden seleccionarse a sí mismos como ejecutores.

**Caso A: Usuario Owner (Kava)**:
1. Login como Kava (owner)
2. Abrir formulario "Nuevo movimiento"
3. Verificar selector "¿Quién realizó?": debe mostrar TODOS los miembros

**Resultado Esperado**:
- ✅ Opciones: "Kava", "Pareja"
- ✅ Puede seleccionar cualquiera

**Caso B: Usuario Member (Pareja)**:
1. Login como Pareja (member)
2. Abrir formulario "Nuevo movimiento"
3. Verificar selector "¿Quién realizó?": debe mostrar SOLO el usuario actual

**Resultado Esperado**:
- ✅ Opciones: "Pareja" (única opción)
- ✅ Pre-seleccionado por defecto
- ❌ NO puede seleccionar "Kava"

---

## 🎭 Pruebas de UI/UX

### TEST 10: Responsividad del Selector

**Objetivo**: Validar que el selector "¿Quién realizó?" se ve correctamente en móvil.

**Pasos**:
1. Abrir DevTools (F12)
2. Activar modo responsive (Ctrl+Shift+M)
3. Seleccionar dispositivo: iPhone 12 Pro (390x844)
4. Abrir formulario "Nuevo movimiento"
5. Verificar selector "¿Quién realizó?"

**Resultado Esperado**:
- ✅ Label visible y legible
- ✅ Dropdown se abre correctamente
- ✅ Opciones no se cortan
- ✅ Helper text "Indica quién pasó la tarjeta..." visible

---

### TEST 11: Feedback Visual tras Crear Transacción

**Objetivo**: Validar que el banner "✅ Movimiento guardado. ¿Nuevo movimiento?" aparece.

**Pasos**:
1. Crear transacción común (TEST 1)
2. Verificar toast "Movimiento creado correctamente"
3. Verificar banner verde en formulario

**Resultado Esperado**:
- ✅ Banner verde visible con mensaje "✅ Movimiento guardado. ¿Nuevo movimiento?"
- ✅ Banner desaparece tras 3 segundos
- ✅ Formulario permanece abierto para siguiente transacción

---

## 📊 Pruebas de Rendimiento

### TEST 12: Query Performance - JOIN performed_by

**Objetivo**: Validar que el JOIN adicional no degrada el rendimiento del endpoint.

**Pasos**:
1. Abrir DevTools → Network
2. Navegar a lista de transacciones (periodo con 50+ transacciones)
3. Medir tiempo de respuesta del endpoint `/api/sickness/transactions/global`

**Resultado Esperado**:
- ✅ Tiempo de respuesta: < 300ms (sin degradación significativa)
- ✅ Query con EXPLAIN ANALYZE:
```sql
EXPLAIN ANALYZE
SELECT t.id, t.type, t.amount, ..., 
       COALESCE(p_performer.display_name, p_performer.email) as performed_by_display_name
FROM transactions t
LEFT JOIN profiles p_performer ON t.performed_by_profile_id = p_performer.id
WHERE t.household_id = '<household_id>'
ORDER BY t.occurred_at DESC
LIMIT 100;

-- Resultado esperado:
-- Planning Time: < 5ms
-- Execution Time: < 50ms
```

---

## ✅ Criterios de Aceptación

**Para considerar Phase 6 (Testing) COMPLETA**, todos los tests deben cumplir:

1. ✅ **TEST 1-3**: Creación de transacciones con dual-field funcional
2. ✅ **TEST 4**: Validaciones funcionan correctamente
3. ✅ **TEST 5**: Persistencia localStorage operativa
4. ✅ **TEST 6**: Ediciones preservan executed_by
5. ✅ **TEST 7**: 449 transacciones migradas muestran ejecutor
6. ✅ **TEST 8**: Compatibilidad con legacy (sin ejecutor)
7. ✅ **TEST 9**: Permisos owner/member correctos
8. ✅ **TEST 10-11**: UI/UX funcional en móvil y desktop
9. ✅ **TEST 12**: Rendimiento sin degradación

---

## 🚀 Próximos Pasos

Una vez completados todos los tests:

1. **Documentación Final**:
   - Crear `docs/TRANSACTION_TRACEABILITY.md` con especificación completa
   - Actualizar `.github/copilot-instructions.md` con reglas dual-field

2. **Cerrar GitHub Issues**:
   - Issue #19: Cuenta Común - COMPLETO
   - Issue #20: Trazabilidad - COMPLETO
   - Issue #18: Gastos Directos - COMPLETO

3. **Deployment a PROD**:
   - Verificar todos los tests en DEV
   - Build producción: `npm run build`
   - Aplicar migraciones pendientes (si hay)
   - Restart PM2: `pm2 reload cuentassik-prod`

---

**Estado Final Esperado**:
```
✅ Phase 1: Database (PROD aplicado)
✅ Phase 2: Backend (PROD aplicado)
✅ Phase 3: API Routes (PROD aplicado)
✅ Phase 4: Frontend Forms (PROD aplicado)
✅ Phase 5: Frontend Display (PROD aplicado)
✅ Phase 6: Testing (este documento)
```

**Issues a Cerrar**:
- #19 ✅ Sistema Cuenta Común completamente funcional
- #20 ✅ Trazabilidad dual-field operativa
- #18 ✅ Nuevo criterio gastos directos aplicado

---

**Fin del Plan de Pruebas**
