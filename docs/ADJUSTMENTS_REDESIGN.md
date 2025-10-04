# Sistema de Ajustes - Rediseño Completo

**Fecha**: 2025-10-04 (inicio) → 2025-10-05 (completado MVP)  
**Estado**: ✅ **Completado y Desplegado** (listo para testing en producción)

## 🎯 Objetivo

Rediseñar el sistema de ajustes para que sea:
- **Lógico**: No es un sistema de premio/castigo, es gestión de aportes reales
- **Robusto**: Validación y aprobación obligatoria de pre-pagos
- **Trazable**: Cada ajuste tiene referencia clara a sus movimientos
- **UX amigable**: Dashboard centralizado con flujo claro

## 🧩 Conceptos Clave

### **No es Gamificación**
El sistema NO debe tener conceptos de "bonus" o "penalty". El balance es el que es en función de:
- Lo que el owner configure (objetivo mensual)
- El tipo de cálculo seleccionado (proporcional/igual/custom)
- Los aportes reales de cada miembro

### **Dos Tipos de Ajustes**

#### 1. **Pre-pago** (`prepayment`)
**Qué es**: Un gasto común pagado "de su bolsillo" sin pasar por la cuenta conjunta.

**Flujo**:
1. Miembro crea solicitud de pre-pago (estado: `pending`)
2. Owner revisa la solicitud y puede:
   - ✅ **Aprobar**: Genera 2 movimientos automáticamente
   - ❌ **Rechazar**: Elimina la solicitud
   - ✏️ **Editar**: Modificar categoría/descripción antes de aprobar
3. Solo los ajustes `approved` cuentan en el balance

**Movimientos generados**:
```typescript
// Ejemplo: "Pagué la luz: 85€" + categoría "Servicios"
1. Expense: 85€ en categoría "Servicios" (gasto común)
2. Income virtual: 85€ sin categoría (aporte del miembro)
```

**Validación requerida**: Owner debe aprobar antes de generar movimientos.

#### 2. **Ingreso Extra** (`extra_income`)
**Qué es**: Cuando un miembro ingresa más de lo que le corresponde ese mes.

**Flujo**:
- Se genera **automáticamente** al detectar ingreso > `expected_amount`
- O se puede crear **manualmente** si el miembro quiere aportar más
- Genera 1 movimiento de ingreso en el dashboard

**Movimientos generados**:
```typescript
// Ejemplo: Miembro debe 500€, aporta 600€
1. Income: 100€ (ingreso extra)
```

**Validación requerida**: Ninguna (aprobación automática).

## 📊 Modelo de Datos

### Tabla `contribution_adjustments` (actualizada)

```sql
CREATE TABLE contribution_adjustments (
  -- Identificación
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id),
  contribution_id UUID NOT NULL REFERENCES contributions(id),
  member_id UUID NOT NULL REFERENCES household_members(profile_id),
  
  -- Tipo y detalles
  type TEXT NOT NULL CHECK (type IN ('prepayment', 'extra_income')),
  amount DECIMAL(12, 2) NOT NULL,
  reason TEXT,
  
  -- Estado y aprobación ⭐ NUEVO
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES auth.users(id),
  rejected_at TIMESTAMPTZ,
  
  -- Trazabilidad de movimientos ⭐ MEJORADO
  category_id UUID REFERENCES categories(id), -- Categoría original
  expense_category_id UUID REFERENCES categories(id), -- Editable por owner
  movement_id UUID REFERENCES transactions(id), -- Movimiento de gasto
  income_movement_id UUID REFERENCES transactions(id), -- Movimiento de ingreso ⭐ NUEVO
  
  -- Descripciones editables ⭐ NUEVO
  expense_description TEXT,
  income_description TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Políticas RLS (actualizadas)

```sql
-- INSERT: Cualquier miembro puede crear ajustes pending
CREATE POLICY "Members can create pending adjustments"
  ON contribution_adjustments FOR INSERT
  WITH CHECK (
    household_id IN (SELECT household_id FROM household_members WHERE profile_id = auth.uid())
    AND status = 'pending'
  );

-- UPDATE: Solo owners pueden aprobar/rechazar
CREATE POLICY "Owners can approve/reject adjustments"
  ON contribution_adjustments FOR UPDATE
  USING (
    household_id IN (
      SELECT household_id FROM household_members 
      WHERE profile_id = auth.uid() AND role = 'owner'
    )
  );

-- DELETE: Solo owners pueden eliminar ajustes pending
CREATE POLICY "Owners can delete pending adjustments"
  ON contribution_adjustments FOR DELETE
  USING (
    household_id IN (
      SELECT household_id FROM household_members 
      WHERE profile_id = auth.uid() AND role = 'owner'
    )
    AND status = 'pending'
  );
```

## 🔄 Flujos de Trabajo

### Flujo 1: Crear Pre-pago (Miembro)

```typescript
// 1. Miembro rellena formulario
const formData = {
  type: 'prepayment',
  amount: -85, // Negativo = reducción de contribución esperada
  reason: 'Pagué la luz del piso',
  category_id: 'uuid-servicios', // Categoría sugerida
  expense_description: 'Recibo luz octubre 2025',
  income_description: 'Aporte de Juan - Luz octubre',
};

// 2. Server Action crea ajuste pending
await createPrepaymentRequest(formData);
// → Estado: pending
// → NO genera movimientos aún
// → Notifica a owners

// 3. Owner recibe notificación
// → Ve lista de pre-pagos pendientes
// → Puede editar categoría/descripciones
// → Decide aprobar o rechazar
```

### Flujo 2: Aprobar Pre-pago (Owner)

```typescript
// 1. Owner revisa ajuste pending
const adjustment = await getAdjustmentDetails(adjustmentId);

// 2. Puede editar campos antes de aprobar
await updatePendingAdjustment(adjustmentId, {
  expense_category_id: 'uuid-otra-categoria',
  expense_description: 'Luz piso - Octubre',
  income_description: 'Aporte Juan por luz',
});

// 3. Aprueba el ajuste
await approvePrepayment(adjustmentId);

// → Actualiza status a 'approved'
// → Crea 2 movimientos automáticamente:
//   1. Expense: 85€ en categoría seleccionada
//   2. Income virtual: 85€ sin categoría
// → Vincula movement_id e income_movement_id
// → Recalcula contribución del miembro
// → Notifica al miembro de la aprobación
```

### Flujo 3: Rechazar Pre-pago (Owner)

```typescript
// Owner rechaza el ajuste con justificación
await rejectPrepayment(adjustmentId, {
  rejection_reason: 'Este gasto no corresponde al hogar común',
});

// → Actualiza status a 'rejected'
// → NO genera movimientos
// → Notifica al miembro del rechazo con razón
```

### Flujo 4: Ingreso Extra (Miembro)

```typescript
// Opción A: Automático al superar meta
// (Detectado por el sistema al calcular contribuciones)

// Opción B: Manual
const formData = {
  type: 'extra_income',
  amount: -100, // Negativo = reducción de contribución
  reason: 'Aporte extra para vacaciones',
};

await recordExtraIncome(formData);

// → Estado: approved (automático)
// → Crea 1 movimiento de ingreso
// → Recalcula contribución
```

## 🎨 Reorganización de UI

### 1. **Configuración de Contribuciones** (Owner only)

**Ubicación**: `/app/contributions/settings`

**Contenido**:
- Objetivo mensual del hogar
- Tipo de cálculo (proporcional/igual/custom)
- Ingresos de cada miembro
- Futuras configuraciones

**Estado actual**: ✅ Ya existe, solo necesita mejoras visuales

---

### 2. **Dashboard de Contribución** (Por miembro)

**Ubicación**: `/app/contributions` (vista principal)

**Layout**:
```
┌─────────────────────────────────────────────────────┐
│ 📊 Contribución de Juan - Octubre 2025             │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Esperado:  500,00 €                                 │
│ Pagado:    350,00 € (70%)                           │
│ Pendiente: 150,00 €                                 │
│                                                     │
│ [━━━━━━━━━━━━━━━▒▒▒▒▒▒] 70%                        │
│                                                     │
│ [➕ Ingresar Extra]  [💳 Registrar Pre-pago]       │
│                                                     │
├─────────────────────────────────────────────────────┤
│ 📜 Historial de Ajustes                            │
│                                                     │
│ 🟡 Pre-pago: Luz octubre (-85€) [Pendiente]        │
│    Creado: 2025-10-02 14:30                         │
│                                                     │
│ ✅ Ingreso extra (-100€) [Aprobado]                 │
│    Aportación voluntaria                            │
│    Aprobado: 2025-10-01 10:00                       │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Componentes clave**:
- `<ContributionProgress />` - Barra de progreso con stats
- `<QuickActions />` - Botones de ingreso extra y pre-pago
- `<AdjustmentsHistory />` - Lista con badges de estado

---

### 3. **Panel de Aprobaciones** (Owner only)

**Ubicación**: `/app/contributions/approvals` (o tab en contributions)

**Layout**:
```
┌─────────────────────────────────────────────────────┐
│ ⏳ Pre-pagos Pendientes de Aprobación               │
├─────────────────────────────────────────────────────┤
│                                                     │
│ 📄 Pre-pago de Juan - Luz octubre                   │
│    Monto: -85,00 €                                  │
│    Categoría sugerida: Servicios                    │
│    Razón: Pagué la luz del piso                     │
│    Creado: 2025-10-02 14:30                         │
│                                                     │
│    [✏️ Editar] [✅ Aprobar] [❌ Rechazar]           │
│                                                     │
├─────────────────────────────────────────────────────┤
│ 📄 Pre-pago de María - Supermercado                 │
│    Monto: -120,00 €                                 │
│    Categoría sugerida: Alimentación                 │
│    Razón: Compra semanal                            │
│    Creado: 2025-10-03 09:15                         │
│                                                     │
│    [✏️ Editar] [✅ Aprobar] [❌ Rechazar]           │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Componentes clave**:
- `<PendingApprovalsList />` - Lista de ajustes pending
- `<ApprovalDialog />` - Formulario de revisión con edición
- `<RejectionDialog />` - Formulario de rechazo con razón

---

### 4. **Modal de Edición** (Owner, antes de aprobar)

**Contenido**:
```
┌─────────────────────────────────────────────────────┐
│ ✏️ Revisar Pre-pago                                 │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Miembro: Juan                                       │
│ Monto: -85,00 €                                     │
│ Razón: Pagué la luz del piso                        │
│                                                     │
│ ─────────────────────────────────────────────────   │
│                                                     │
│ Movimientos que se crearán:                         │
│                                                     │
│ 1️⃣ Gasto                                            │
│    Categoría: [Servicios ▼]                         │
│    Descripción: [Recibo luz octubre 2025]           │
│    Monto: 85,00 €                                   │
│                                                     │
│ 2️⃣ Ingreso Virtual                                  │
│    Descripción: [Aporte de Juan - Luz octubre]      │
│    Monto: 85,00 €                                   │
│                                                     │
│ ─────────────────────────────────────────────────   │
│                                                     │
│ [Cancelar] [Guardar y Aprobar]                      │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Funcionalidad**:
- Preview de los 2 movimientos que se crearán
- Edición de categoría del gasto
- Edición de ambas descripciones
- Validación antes de aprobar

---

## 🔧 Server Actions

### `createPrepaymentRequest()`
```typescript
'use server';
export async function createPrepaymentRequest(
  formData: FormData
): Promise<Result<{ id: string }>> {
  // 1. Validar datos con Zod
  // 2. Verificar que el usuario sea miembro del household
  // 3. Crear ajuste con status='pending'
  // 4. NO crear movimientos
  // 5. Notificar a owners
  // 6. Retornar ID del ajuste creado
}
```

### `approvePrepayment()`
```typescript
'use server';
export async function approvePrepayment(
  adjustmentId: string,
  edits?: {
    expense_category_id?: string;
    expense_description?: string;
    income_description?: string;
  }
): Promise<Result> {
  // 1. Verificar que el usuario sea owner
  // 2. Obtener ajuste y validar que esté pending
  // 3. Aplicar ediciones si las hay
  // 4. Crear 2 movimientos (expense + income virtual)
  // 5. Actualizar ajuste:
  //    - status='approved'
  //    - approved_by=auth.uid()
  //    - approved_at=NOW()
  //    - movement_id=expense_id
  //    - income_movement_id=income_id
  // 6. Recalcular contribución del mes
  // 7. Notificar al miembro
  // 8. revalidatePath('/app/contributions')
}
```

### `rejectPrepayment()`
```typescript
'use server';
export async function rejectPrepayment(
  adjustmentId: string,
  rejectionReason: string
): Promise<Result> {
  // 1. Verificar que el usuario sea owner
  // 2. Obtener ajuste y validar que esté pending
  // 3. Actualizar ajuste:
  //    - status='rejected'
  //    - rejected_by=auth.uid()
  //    - rejected_at=NOW()
  //    - reason=reason + '\nRechazado: ' + rejectionReason
  // 4. Notificar al miembro
  // 5. revalidatePath('/app/contributions')
}
```

### `recordExtraIncome()`
```typescript
'use server';
export async function recordExtraIncome(
  formData: FormData
): Promise<Result> {
  // 1. Validar datos con Zod
  // 2. Verificar que el usuario sea miembro del household
  // 3. Crear ajuste con status='approved' (automático)
  // 4. Crear 1 movimiento de ingreso
  // 5. Vincular movement_id
  // 6. Recalcular contribución
  // 7. revalidatePath('/app/contributions')
}
```

### `updatePendingAdjustment()`
```typescript
'use server';
export async function updatePendingAdjustment(
  adjustmentId: string,
  edits: {
    expense_category_id?: string;
    expense_description?: string;
    income_description?: string;
  }
): Promise<Result> {
  // 1. Verificar que el usuario sea owner
  // 2. Obtener ajuste y validar que esté pending
  // 3. Actualizar campos editables
  // 4. revalidatePath('/app/contributions')
}
```

---

## 🚀 Plan de Implementación

### **Fase 1: Base de Datos** ✅ COMPLETADO
- [x] Migración SQL con campos de aprobación
- [x] Índices para búsquedas eficientes
- [x] Políticas RLS actualizadas
- [x] Trigger de validación de aprobación
- [x] Constraint de integridad de movimientos
- [x] Función helper `is_contribution_owner()`

### **Fase 2: Server Actions** ✅ COMPLETADO
- [x] `createPrepaymentRequest()` - Crear solicitud pending
- [x] `approvePrepayment()` - Aprobar y generar movimientos duales
- [x] `rejectPrepayment()` - Rechazar solicitud con razón
- [x] `recordExtraIncome()` - Registrar ingreso extra con aprobación automática
- [x] `updatePendingAdjustment()` - Editar ajuste antes de aprobar
- [x] `getPendingAdjustments()` - Helper para obtener lista de pending (owner)
- [x] Schemas Zod actualizados

### **Fase 3: Componentes UI** ✅ COMPLETADO
- [x] `<PendingApprovalsPanel />` - Panel de aprobaciones con lista de pending (owner only)
  - Lista completa de ajustes pendientes con detalles
  - Modal de aprobación con edición de categoría y descripciones
  - Preview de los 2 movimientos que se crearán
  - Modal de rechazo con razón obligatoria
  - Recarga automática tras aprobar/rechazar
- [x] `<QuickActions />` - Formularios para miembros
  - Botón "Registrar Pre-pago" con formulario completo
  - Botón "Registrar Ingreso Extra" (solo si `hasMetGoal`)
  - Validaciones y info boxes explicando cada flujo
  - Recarga automática tras crear solicitud
- [x] `<ContributionsContent />` - Actualizado a Client Component
  - Integración de PendingApprovalsPanel (condicional para owners)
  - Integración de QuickActions (reemplazo de ContributionAdjustmentsSection)
  - Props limpiadas (eliminados currentMonth/currentYear)
- [x] Eliminación de componente obsoleto `ContributionAdjustmentsSection.tsx`

### **Fase 4: Build y Despliegue** ✅ COMPLETADO
- [x] Corrección de 18+ errores de ESLint/TypeScript
- [x] Todos los imports convertidos a absolutos (@/...)
- [x] Eliminación de código no usado (unused imports/vars)
- [x] Tipos explícitos (sin `any` sin tipar)
- [x] JSX entities escapadas correctamente
- [x] Build exitoso sin errores ✅
- [x] Push a GitHub (commit 4d95292)
- [x] Despliegue automático en Vercel desbloqueado

### **Fase 5: Testing y Mejoras** ⏳ PENDIENTE
- [ ] Testing del flujo completo de pre-pagos en producción
- [ ] Verificar trazabilidad de movimientos duales
- [ ] Testing de ingresos extra
- [ ] Recalculo automático de contribuciones tras aprobación
- [ ] Sistema de notificaciones (owners → miembros)
- [ ] Mejoras UX:
  - [ ] Loading states optimistas
  - [ ] Confirmación antes de aprobar
  - [ ] Preview más detallado del impacto en contribución
- [ ] Documentar en README

---

## 📚 Referencias

- **Migración SQL**: `supabase/migrations/20251004_restructure_adjustments_approval_system.sql`
- **Documentación Original**: `docs/CONTRIBUTIONS_SYSTEM.md`
- **Arquitectura Global**: `.github/copilot-instructions.md`

---

**Última actualización**: 2025-10-05

**Estado actual**: Fases 1-4 completadas ✅ | Build exitoso | Listo para testing en producción

**Próximos pasos**: 
1. ✅ ~~Crear componentes UI~~ → COMPLETADO
2. ✅ ~~Panel de aprobaciones para owners~~ → COMPLETADO  
3. ✅ ~~Build exitoso~~ → COMPLETADO (commit 4d95292)
4. ⏳ **Testing del flujo completo en producción**
5. ⏳ Sistema de notificaciones
6. ⏳ Optimizaciones UX (loading states, confirmaciones)

**Archivos principales**:
- **Server Actions**: `app/app/contributions/adjustment-actions.ts` (565 líneas)
- **Panel Aprobaciones**: `app/app/contributions/components/PendingApprovalsPanel.tsx` (478 líneas)
- **Formularios Miembros**: `app/app/contributions/components/QuickActions.tsx` (415 líneas)
- **Migración SQL**: `supabase/migrations/20251004_restructure_adjustments_approval_system.sql`

**Commits relacionados**:
- `fbf9eb0`: feat: sistema de aprobación completo (Fase 1+2)
- `7979373`: feat: panel de aprobaciones para owners (Fase 3 - Paso 1)
- `7e1f13e`: feat: formularios de pre-pago e ingreso extra (Fase 3 - Paso 2)
- `4d95292`: fix: corregir errores de build para despliegue en Vercel (Fase 4)
