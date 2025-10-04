# ✅ Checklist de Testing - Sistema de Ajustes con Aprobación

**Fecha**: 2025-10-05  
**Versión**: MVP Completado  
**Build**: ✅ Exitoso (commit 4d95292)  
**Deploy**: ⏳ En proceso automático en Vercel

---

## 🎯 Objetivo del Testing

Verificar que el nuevo sistema de aprobación de pre-pagos funciona correctamente end-to-end:
1. ✅ Miembro puede crear solicitudes de pre-pago
2. ✅ Owner recibe y visualiza solicitudes pending
3. ✅ Owner puede aprobar → genera 2 movimientos automáticamente
4. ✅ Owner puede rechazar → solicitud eliminada
5. ✅ Movimientos se vinculan correctamente al ajuste
6. ✅ Contribución se actualiza automáticamente

---

## 📋 Pre-requisitos

### Datos Necesarios
- [ ] Hogar con al menos 2 miembros (1 owner, 1 member)
- [ ] Meta mensual configurada (ej: 2000€)
- [ ] Ingresos mensuales configurados para ambos miembros
- [ ] Al menos 2 categorías de gasto (ej: "Luz", "Supermercado")

### Accesos
- [ ] Usuario owner: puede aprobar/rechazar
- [ ] Usuario member: puede crear solicitudes
- [ ] URL de producción: https://cuentas-sik.vercel.app (o la que corresponda)

---

## 🧪 Caso de Prueba 1: Crear Pre-pago (Miembro)

### Pasos
1. **Login como miembro** (no owner)
2. Ir a `/app/contributions`
3. Buscar sección "💳 Acciones Rápidas"
4. Click en botón **"Registrar Pre-pago"**
5. Rellenar formulario:
   - **Monto**: `85.50` (ejemplo)
   - **Razón**: `Pagué la factura de luz de octubre`
   - **Categoría** (opcional): Seleccionar "Luz" o similar
   - **Descripciones** (opcional): Dejar vacío o personalizar
6. Click **"Enviar Solicitud"**

### Resultado Esperado ✅
- Toast verde: "✅ Solicitud de pre-pago enviada"
- Descripción: "Un owner debe aprobarla para que se registre en el sistema"
- Página recarga automáticamente
- **NO** aparece ningún movimiento en `/app/expenses` (aún no aprobado)

### Verificar
- [ ] Toast de éxito mostrado
- [ ] Página recargada
- [ ] NO hay movimientos nuevos en expenses
- [ ] Contribución del miembro NO ha cambiado aún

---

## 🧪 Caso de Prueba 2: Ver Solicitud Pending (Owner)

### Pasos
1. **Login como owner** del mismo hogar
2. Ir a `/app/contributions`
3. Buscar card **"⏳ Pre-pagos Pendientes de Aprobación"** (naranja)
4. Verificar que aparece el pre-pago creado

### Resultado Esperado ✅
- Card naranja con badge contador: "1"
- Listado muestra:
  - Nombre/email del miembro solicitante
  - Monto: **85,50 €**
  - Razón: "Pagué la factura de luz de octubre"
  - Categoría sugerida: badge con "Luz" (si se seleccionó)
  - Fecha/hora de creación
  - Botones: **[Aprobar]** y **[Rechazar]**

### Verificar
- [ ] Card de pendientes visible
- [ ] Contador correcto (badge con "1")
- [ ] Detalles completos de la solicitud
- [ ] Botones de aprobar/rechazar presentes

---

## 🧪 Caso de Prueba 3: Aprobar Pre-pago (Owner)

### Pasos
1. En el panel de aprobaciones, click **"Aprobar"** en la solicitud
2. Se abre modal de aprobación con:
   - Resumen del ajuste (miembro, monto, razón)
   - Preview de **2 movimientos** que se crearán:
     - 🔴 **1️⃣ Movimiento de Gasto**: 85,50€ en categoría seleccionada
     - 🟢 **2️⃣ Ingreso Virtual**: 85,50€ (representa aporte del miembro)
3. Revisar campos editables:
   - **Categoría** del gasto (cambiar si es necesario)
   - **Descripción del gasto** (editar si quieres)
   - **Descripción del ingreso** (editar si quieres)
4. Click **"Aprobar y Crear Movimientos"**

### Resultado Esperado ✅
- Toast verde: "✅ Pre-pago aprobado correctamente"
- Modal se cierra automáticamente
- Card de pendientes **desaparece** (ya no hay pending)
- Página recarga automáticamente

### Verificar
- [ ] Toast de éxito
- [ ] Card de pendientes ya no visible
- [ ] Ir a `/app/expenses` y verificar **2 movimientos nuevos**:
  - [ ] **Gasto**: 85,50€ en categoría "Luz" (tipo: expense)
  - [ ] **Ingreso**: 85,50€ sin categoría (tipo: income)
- [ ] Ir a `/app/contributions` y verificar:
  - [ ] Contribución del miembro actualizada (paid_amount aumentó)
  - [ ] Si ya pagó su parte, status puede cambiar a "paid" o "partial"

---

## 🧪 Caso de Prueba 4: Rechazar Pre-pago (Owner)

### Setup
1. Como miembro, crear OTRO pre-pago (ej: "Compra de supermercado - 120€")
2. Como owner, ir a panel de aprobaciones

### Pasos
1. Click **"Rechazar"** en la nueva solicitud
2. Se abre modal de rechazo
3. Escribir razón obligatoria:
   - Ejemplo: `Este gasto no corresponde al presupuesto del hogar`
4. Click **"Rechazar Pre-pago"**

### Resultado Esperado ✅
- Toast: "✅ Pre-pago rechazado"
- Modal se cierra
- Solicitud **desaparece** de la lista de pendientes
- **NO** se crean movimientos en expenses

### Verificar
- [ ] Toast mostrado
- [ ] Solicitud eliminada del panel
- [ ] NO hay movimientos nuevos en `/app/expenses`
- [ ] Contribución del miembro NO cambió

---

## 🧪 Caso de Prueba 5: Ingreso Extra (Miembro que ya cumplió meta)

### Pre-requisito
- Miembro debe tener status `paid` o `overpaid` (ya cumplió su contribución del mes)

### Pasos
1. Login como miembro que YA pagó su parte
2. Ir a `/app/contributions`
3. En "💳 Acciones Rápidas", click **"Registrar Ingreso Extra"**
4. Rellenar:
   - **Monto adicional**: `100.00`
   - **Razón**: `Aporte extra para vacaciones`
5. Click **"Registrar Ingreso"**

### Resultado Esperado ✅
- Toast verde: "✅ Ingreso extra registrado correctamente"
- Página recarga automáticamente
- Ir a `/app/expenses`: aparece 1 movimiento nuevo:
  - **Ingreso**: 100,00€ sin categoría (tipo: income)
- Contribución actualizada:
  - Status: "overpaid"
  - Aporte extra visible en HeroContribution

### Verificar
- [ ] Toast de éxito
- [ ] Movimiento de ingreso creado
- [ ] Status cambió a "overpaid"
- [ ] Monto extra visible en dashboard

---

## 🧪 Caso de Prueba 6: Trazabilidad de Movimientos

### Objetivo
Verificar que los movimientos están correctamente vinculados al ajuste.

### Pasos
1. Acceso directo a base de datos (Supabase SQL Editor)
2. Query para ver ajuste aprobado:

```sql
SELECT 
  ca.id,
  ca.type,
  ca.amount,
  ca.status,
  ca.approved_at,
  ca.movement_id,           -- ID del gasto
  ca.income_movement_id,    -- ID del ingreso virtual
  t1.description AS expense_desc,
  t2.description AS income_desc
FROM contribution_adjustments ca
LEFT JOIN transactions t1 ON t1.id = ca.movement_id
LEFT JOIN transactions t2 ON t2.id = ca.income_movement_id
WHERE ca.status = 'approved'
  AND ca.type = 'prepayment'
ORDER BY ca.created_at DESC
LIMIT 5;
```

### Resultado Esperado ✅
- Ajuste con `status = 'approved'`
- `movement_id` no es NULL → apunta al gasto
- `income_movement_id` no es NULL → apunta al ingreso virtual
- Ambos movimientos existen en tabla `transactions`
- Descripciones correctas

### Verificar
- [ ] Ajuste en estado `approved`
- [ ] `movement_id` tiene valor
- [ ] `income_movement_id` tiene valor
- [ ] Ambos movimientos existen y tienen descripciones correctas

---

## 🧪 Caso de Prueba 7: Edición de Categoría al Aprobar

### Pasos
1. Como miembro, crear pre-pago con categoría "Luz"
2. Como owner, abrir modal de aprobación
3. **Cambiar categoría** de "Luz" a "Supermercado"
4. **Editar descripción** del gasto: "Cambio de categoría por owner"
5. Aprobar

### Resultado Esperado ✅
- Movimiento de gasto creado con categoría "Supermercado" (no "Luz")
- Descripción editada visible en el movimiento

### Verificar
- [ ] Movimiento tiene categoría correcta (la editada)
- [ ] Descripción personalizada aplicada
- [ ] Todo lo demás funciona normal

---

## 🧪 Caso de Prueba 8: Validaciones

### 8.1 Miembro sin contribución activa
**Pasos**: Intentar crear pre-pago sin tener contribución del mes actual  
**Esperado**: Toast de error

### 8.2 Monto inválido
**Pasos**: Intentar crear pre-pago con monto = 0 o negativo  
**Esperado**: Validación impide submit

### 8.3 Razón vacía
**Pasos**: Intentar crear pre-pago sin razón  
**Esperado**: Validación impide submit (campo obligatorio)

### 8.4 Rechazo sin razón
**Pasos**: Intentar rechazar sin escribir razón  
**Esperado**: Toast de error: "Debes proporcionar una razón para el rechazo"

### Verificar
- [ ] Todas las validaciones funcionan
- [ ] Mensajes de error claros
- [ ] No se crean datos inconsistentes

---

## 🧪 Caso de Prueba 9: Permisos (RLS)

### 9.1 Miembro no puede aprobar
**Pasos**: Como miembro (no owner), intentar llamar directamente a `approvePrepayment()`  
**Esperado**: Error de permisos

### 9.2 Miembro de otro hogar no ve solicitudes
**Pasos**: Login con usuario de OTRO hogar  
**Esperado**: Panel de aprobaciones vacío (no ve solicitudes de otros hogares)

### Verificar
- [ ] RLS funciona correctamente
- [ ] Solo owners pueden aprobar/rechazar
- [ ] Aislamiento entre hogares perfecto

---

## 🧪 Caso de Prueba 10: Recalculo de Contribución

### Objetivo
Verificar que tras aprobar, la contribución se actualiza automáticamente.

### Pasos
1. Anotar valores ANTES de aprobar:
   - `expected_amount`
   - `paid_amount`
   - `status`
2. Aprobar pre-pago de 85,50€
3. Volver a `/app/contributions`
4. Verificar valores DESPUÉS:
   - `paid_amount` debe haber aumentado en 85,50€
   - `status` puede cambiar si se alcanzó la meta

### Resultado Esperado ✅
- `paid_amount` aumentó correctamente
- Si `paid_amount >= expected_amount` → status = "paid"
- HeroContribution muestra "✅ Pagado" o "✅ Aporte Extra"

### Verificar
- [ ] Montos actualizados correctamente
- [ ] Status correcto
- [ ] UI refleja el cambio inmediatamente

---

## 📊 Resumen de Verificaciones

### Funcionalidad Core
- [ ] Crear pre-pago (miembro) ✅
- [ ] Ver solicitudes pending (owner) ✅
- [ ] Aprobar pre-pago → genera 2 movimientos ✅
- [ ] Rechazar pre-pago → elimina solicitud ✅
- [ ] Ingreso extra (miembro con meta cumplida) ✅

### Trazabilidad
- [ ] Movimientos vinculados al ajuste ✅
- [ ] `movement_id` e `income_movement_id` correctos ✅
- [ ] Descripciones personalizadas funcionan ✅

### Validaciones
- [ ] Montos, razones obligatorias ✅
- [ ] Rechazo requiere justificación ✅
- [ ] Solo owners pueden aprobar ✅

### Actualización de Estado
- [ ] Contribución recalculada tras aprobación ✅
- [ ] Status actualizado correctamente ✅
- [ ] UI refleja cambios inmediatamente ✅

---

## 🐛 Bugs Conocidos / Pendientes

### Mejoras UX (no bloqueantes)
- [ ] Optimistic updates (evitar reload completo)
- [ ] Loading states más granulares
- [ ] Confirmación antes de aprobar
- [ ] Preview del impacto en contribución antes de aprobar

### Funcionalidades Futuras
- [ ] Sistema de notificaciones (email/in-app)
- [ ] Historial completo de ajustes (approved/rejected)
- [ ] Filtros y búsqueda en historial
- [ ] Exportar historial a CSV

---

## 📝 Notas de Testing

### Entorno
- **URL Producción**: https://cuentas-sik.vercel.app
- **Build**: Commit 4d95292
- **Fecha Deploy**: 2025-10-05

### Resultados
- [ ] **PASS**: Todas las pruebas exitosas ✅
- [ ] **FAIL**: Bugs encontrados → reportar en GitHub Issues
- [ ] **PARTIAL**: Funciona pero con warnings → documentar

### Issues Encontrados
_(Completar durante testing)_

1. Issue #XX: [Descripción breve]
   - **Severidad**: Critical / High / Medium / Low
   - **Pasos para reproducir**: ...
   - **Comportamiento esperado**: ...
   - **Comportamiento actual**: ...

---

**Tester**: _________  
**Fecha**: _________  
**Resultado**: ✅ PASS / ❌ FAIL / ⚠️ PARTIAL
