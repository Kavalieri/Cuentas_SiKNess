# 🔄 Sistema de Reembolsos - Guía de Implementación

**Estado**: ✅ Backend implementado y desplegado
**Commit**: `a96e4dc`
**Archivos**: `refund-actions.ts`, `actions.ts` (modificado)

---

## 📋 Descripción General

El sistema de reembolsos permite a los miembros **reclamar crédito de su balance pendiente** de dos formas:

### **MODO 1: Reembolso Activo** (Inmediato)
El usuario crea un gasto directo de reembolso que se deduce **automáticamente** del balance.

```
Usuario: "Quiero reembolsar 0.50€"
       ↓
Sistema: Crea expense_direct (0.50€) + income_direct (0.50€)
       ↓
Balance: Se actualiza INMEDIATAMENTE (-0.50€)
```

**Características:**
- ✅ No requiere aprobación
- ✅ Se aplica instantáneamente al balance
- ✅ Ambas transacciones vinculadas por `transaction_pair_id`
- ✅ Auditable en historial de transacciones

---

### **MODO 2: Reembolso Declarado** (Requiere Aprobación)
El usuario marca un gasto directo existente como "incluyendo reembolso" y el owner lo aprueba.

```
Usuario: "Ese gasto de 80.75€ en vivienda incluye 0.50€ de reembolso"
       ↓
Sistema: Crea refund_claim (estado='pending')
       ↓
Owner: Revisa y aprueba
       ↓
Balance: Se actualiza (-0.50€)
```

**Características:**
- ⏳ Requiere aprobación del owner
- ⏳ No se aplica al balance hasta aprobación
- ✅ Auditable con motivo y timestamps
- ✅ Permite rechazar si no es válido

---

## 🔧 Server Actions Implementadas

### 1. **`createActiveRefund(amount, categoryId, description?)`**

```typescript
import { createActiveRefund } from '@/app/sickness/credito-deuda/refund-actions';

// Usuario crea reembolso de 0.50€
const result = await createActiveRefund(
  0.50,
  'c3ead387-edf3-4c10-8929-9d1a4be921ed', // ID de categoría (ej: "Varios")
  'Reembolso vivienda octubre'
);

if (result.ok) {
  console.log('✅ Reembolso creado:', {
    expenseId: result.data.expenseId,
    incomeId: result.data.incomeId,
    pairId: result.data.pairId
  });
  // Balance se actualiza automáticamente
} else {
  console.error('❌ Error:', result.message);
}
```

**Validaciones:**
- ✅ amount > 0
- ✅ categoryId existe y pertenece al hogar
- ✅ Usuario autenticado
- ✅ Usuario pertenece al hogar

**Retorno:**
- ✅ `{ expenseId, incomeId, pairId }`

---

### 2. **`declareRefund(expenseTransactionId, refundAmount, reason?)`**

```typescript
import { declareRefund } from '@/app/sickness/credito-deuda/refund-actions';

// Usuario declara reembolso en gasto existente
const result = await declareRefund(
  '1bebfdbf-f6ce-453f-a609-9af2d3528cbf', // ID del gasto direct expense
  0.50,
  'Pagué más de lo acordado en vivienda'
);

if (result.ok) {
  console.log('✅ Reembolso declarado (pendiente aprobación):', {
    claimId: result.data.claimId
  });
} else {
  console.error('❌ Error:', result.message);
}
```

**Validaciones:**
- ✅ Gasto existe y pertenece al usuario
- ✅ Gasto es tipo expense_direct (flow_type='direct')
- ✅ refundAmount > 0
- ✅ refundAmount <= monto del gasto
- ✅ Usuario no ha declarado reembolso en este gasto antes

**Retorno:**
- ✅ `{ claimId }`
- ❌ Falla si gasto no es expense_direct
- ❌ Falla si reembolso excede gasto

---

### 3. **`getPendingRefundClaims()` (OWNER ONLY)**

```typescript
import { getPendingRefundClaims } from '@/app/sickness/credito-deuda/refund-actions';

// Owner ve reembolsos pendientes
const result = await getPendingRefundClaims();

if (result.ok) {
  result.data.forEach(claim => {
    console.log(`
      ${claim.display_name} (${claim.email}):
      - Gasto: ${claim.expense_category} - ${claim.expense_description}
      - Monto del gasto: ${claim.expense_amount.toFixed(2)}€
      - Reembolso solicitado: ${claim.refund_amount.toFixed(2)}€
      - Motivo: ${claim.reason || 'No especificado'}
      - Declarado: ${new Date(claim.claimed_at).toLocaleDateString()}
    `);
  });
}
```

**Retorno:**
```typescript
[{
  id: string;                    // ID de la reclamación
  profile_id: string;            // ID del usuario
  email: string;                 // Email del usuario
  display_name: string | null;   // Nombre del usuario
  refund_amount: number;         // Monto del reembolso
  expense_amount: number;        // Monto total del gasto
  expense_category: string;      // Categoría del gasto
  category_icon: string | null;  // Emoji de la categoría
  expense_description: string;   // Descripción del gasto
  expense_date: string;          // Fecha del gasto
  reason: string | null;         // Motivo del reembolso
  claimed_at: string;            // Fecha de declaración
}]
```

---

### 4. **`approveRefundClaim(claimId)` (OWNER ONLY)**

```typescript
import { approveRefundClaim } from '@/app/sickness/credito-deuda/refund-actions';

// Owner aprueba reembolso
const result = await approveRefundClaim('550e8400-e29b-41d4-a716-446655440000');

if (result.ok) {
  console.log('✅ Reembolso aprobado');
  // Balance del usuario se actualiza (-refund_amount)
} else {
  console.error('❌ Error:', result.message);
}
```

**Cambios en BD:**
- `refund_claims.status`: 'pending' → 'approved'
- `refund_claims.approved_by_profile_id`: owner_id
- `refund_claims.approved_at`: NOW()
- **Balance**: Se deducirá automáticamente por `get_approved_refunds()`

---

### 5. **`rejectRefundClaim(claimId)` (OWNER ONLY)**

```typescript
import { rejectRefundClaim } from '@/app/sickness/credito-deuda/refund-actions';

// Owner rechaza reembolso
const result = await rejectRefundClaim('550e8400-e29b-41d4-a716-446655440000');

if (result.ok) {
  console.log('✅ Reembolso rechazado');
  // Balance NO se modifica
} else {
  console.error('❌ Error:', result.message);
}
```

---

### 6. **`getUnreimbursedDirectExpenses()`**

```typescript
import { getUnreimbursedDirectExpenses } from '@/app/sickness/credito-deuda/refund-actions';

// Usuario ve gastos directos sin reembolso declarado
const result = await getUnreimbursedDirectExpenses();

if (result.ok) {
  result.data.forEach(expense => {
    console.log(`
      ${expense.category} - ${expense.description}
      - Monto: ${expense.amount.toFixed(2)}€
      - Fecha: ${new Date(expense.occurred_at).toLocaleDateString()}
    `);
  });
}
```

**Retorno:**
```typescript
[{
  id: string;          // ID de transacción
  category: string | null;  // Nombre categoría
  icon: string | null;      // Emoji
  description: string;      // Descripción
  amount: number;           // Monto del gasto
  occurred_at: string;      // Fecha
}]
```

---

## 💡 Flujo de Trabajo del Usuario

### **Caso 1: Usuario con crédito pendiente (Reembolso Activo)**

```
1. Usuario ve: "Balance pendiente: 0.75€ a tu favor"
2. Usuario hace clic: "Reembolsar Activamente"
3. Modal aparece:
   - Campo: "Monto" (pre-llenado: 0.75€ disponible)
   - Campo: "Categoría" (dropdown)
   - Campo: "Descripción" (opcional)
4. Usuario confirma
5. Sistema: createActiveRefund(0.75, categoryId, description)
6. Resultado:
   ✅ expense_direct(0.75€) + income_direct(0.75€) creadas
   ✅ Balance se actualiza a 0€
   ✅ User ve: "Reembolso realizado: 0.75€"
7. Transacciones visibles en historial
```

### **Caso 2: Usuario con gasto que incluye reembolso (Reembolso Declarado)**

```
1. Usuario ve tabla de gastos directos:
   - Vivienda (80.75€) - "Incluye 0.50€ de reembolso? ➜"
   - Internet (27€)    - "Incluye 0.20€ de reembolso? ➜"
2. Usuario hace clic en "➜" en vivienda
3. Modal aparece:
   - Gasto: "Vivienda - 80.75€"
   - Campo: "Monto del reembolso" (max 80.75€)
   - Campo: "Motivo" (opcional)
4. Usuario ingresa: 0.50€, "Pagué más de lo acordado"
5. Usuario confirma
6. Sistema: declareRefund(expenseId, 0.50, reason)
7. Resultado:
   ✅ refund_claim creada (status='pending')
   📧 Owner recibe notificación: "caballeropomes solicita reembolso 0.50€ en Vivienda"
8. Owner ve en "Reembolsos Pendientes":
   - "caballeropomes: 0.50€ de reembolso en Vivienda (80.75€)"
   - "Motivo: Pagué más de lo acordado"
   - Botones: [Aprobar] [Rechazar]
9. Owner hace clic: [Aprobar]
10. Sistema: approveRefundClaim(claimId)
11. Resultado:
    ✅ refund_claim.status = 'approved'
    ✅ Balance de caballeropomes: -0.50€
```

---

## 🗄️ Cambios en Base de Datos

### **Tabla `refund_claims` (Creada por migración)**

```sql
CREATE TABLE refund_claims (
  id UUID PRIMARY KEY,
  household_id UUID NOT NULL,
  expense_transaction_id UUID NOT NULL,
  refund_transaction_id UUID,  -- Para reembolsos activos
  profile_id UUID NOT NULL,     -- Usuario que solicita
  refund_amount DECIMAL(10,2),
  status TEXT DEFAULT 'pending', -- pending|approved|rejected
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_profile_id UUID,
  approved_at TIMESTAMPTZ,
  approved_by_profile_id UUID,
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Foreign Keys
  FOREIGN KEY (household_id) REFERENCES households(id),
  FOREIGN KEY (expense_transaction_id) REFERENCES transactions(id),
  FOREIGN KEY (profile_id) REFERENCES profiles(id),
  FOREIGN KEY (created_by_profile_id) REFERENCES profiles(id),
  FOREIGN KEY (approved_by_profile_id) REFERENCES profiles(id)
);

-- Indexes para performance
CREATE INDEX idx_refund_claims_household_status
  ON refund_claims(household_id, status);
CREATE INDEX idx_refund_claims_profile
  ON refund_claims(profile_id);
```

### **Columna agregada a `transactions`**

```sql
ALTER TABLE transactions ADD COLUMN
  refund_claim_id UUID REFERENCES refund_claims(id);
```

### **Vista para reembolsos pendientes**

```sql
CREATE VIEW v_pending_refund_claims AS
SELECT rc.*
FROM refund_claims rc
WHERE rc.status = 'pending'
ORDER BY rc.created_at ASC;
```

### **Función para calcular reembolsos aprobados**

```sql
CREATE FUNCTION get_approved_refunds(
  p_household_id UUID,
  p_profile_id UUID
) RETURNS NUMERIC AS $$
  SELECT COALESCE(SUM(refund_amount), 0)
  FROM refund_claims
  WHERE household_id = p_household_id
    AND profile_id = p_profile_id
    AND status = 'approved';
$$ LANGUAGE SQL;
```

---

## 📊 Integración con Balance

### **Fórmula de cálculo actualizada**

```
Balance Pendiente = (Ingresos Comunes + Gastos Directos - Expected) - Reembolsos Aprobados

Ejemplo para caballeropomes (periodo oct 2025):
- Expected: 600€
- Ingresos Comunes: 550€
- Gastos Directos: 55€
- Reembolsos Aprobados: 0.50€

Balance = (550€ + 55€ - 600€) - 0.50€ = -0.50€ - 0.50€ = -1€ (debe 1€)
```

### **Automáticamente integrado en:**

- `getMemberBalanceStatus()` - La función ya deduce automáticamente
- `/sickness/balance` - Se actualiza automáticamente al aprobar reembolsos
- `/sickness/credito-deuda` - Muestra reembolsos pendientes (owner)

---

## 🎯 Próximos Pasos para UI

Para que los usuarios puedan usar este sistema, se necesita crear componentes UI en:

### **1. `/app/sickness/credito-deuda/page.tsx`**

**Sección: "Reembolsar Activamente" (para todos)**
```tsx
<section>
  <h2>Tienes {balance.credit.toFixed(2)}€ a favor</h2>
  <button onClick={() => setShowActiveRefundModal(true)}>
    Reembolsar Activamente
  </button>
</section>

// Modal con:
// - Input: Monto (0-{balance.credit})
// - Select: Categoría
// - Textarea: Descripción (opcional)
// - Botones: [Confirmar] [Cancelar]
```

**Sección: "Declarar Reembolsos" (para todos)**
```tsx
<section>
  <h3>Gastos Directos Pendientes</h3>
  {unreimbursedExpenses.map(expense => (
    <div key={expense.id}>
      <span>{expense.category} - {expense.amount.toFixed(2)}€</span>
      <button onClick={() => setShowDeclareRefundModal(expense.id)}>
        ¿Incluye Reembolso?
      </button>
    </div>
  ))}
</section>

// Modal con:
// - Mostrar: Detalle del gasto
// - Input: Monto del reembolso (0-{expense.amount})
// - Textarea: Motivo (opcional)
// - Botones: [Declarar] [Cancelar]
```

### **2. `/app/sickness/credito-deuda/page.tsx` (OWNER VIEW)**

**Sección: "Reembolsos Pendientes de Aprobación" (solo owner)**
```tsx
{isOwner && (
  <section>
    <h3>Reembolsos Pendientes ({pendingCount})</h3>
    {pendingClaims.map(claim => (
      <div key={claim.id}>
        <strong>{claim.display_name}</strong>
        <p>{claim.expense_category} - {claim.expense_description}</p>
        <p>Solicita: {claim.refund_amount.toFixed(2)}€ de {claim.expense_amount.toFixed(2)}€</p>
        {claim.reason && <p>Motivo: {claim.reason}</p>}
        <button onClick={() => approve(claim.id)}>✅ Aprobar</button>
        <button onClick={() => reject(claim.id)}>❌ Rechazar</button>
      </div>
    ))}
  </section>
)}
```

---

## ✅ Validaciones de Seguridad

- ✅ Usuario autenticado requerido
- ✅ Usuario pertenece al hogar
- ✅ Owner-only para getPendingRefundClaims, approveRefundClaim, rejectRefundClaim
- ✅ Usuario solo puede declarar reembolsos en sus propios gastos
- ✅ Validación de Zod en todas las acciones
- ✅ Revalidación de paths tras mutaciones

---

## 🧪 Testing Manual

```bash
# 1. Crear reembolso activo de 0.50€
curl -X POST http://localhost:3001/api/dual-flow/refunds/create \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 0.50,
    "categoryId": "cbb14998-3893-4525-a3d5-ed02ecddc801",
    "description": "Reembolso prueba"
  }'

# 2. Ver gasto directo sin reembolso
curl http://localhost:3001/api/dual-flow/refunds/unreimbursed

# 3. Declarar reembolso en gasto existente
curl -X POST http://localhost:3001/api/dual-flow/refunds/declare \
  -H "Content-Type: application/json" \
  -d '{
    "expenseTransactionId": "1bebfdbf-f6ce-453f-a609-9af2d3528cbf",
    "refundAmount": 0.30,
    "reason": "Pagué más"
  }'

# 4. Ver balance actualizado
curl http://localhost:3001/api/app/balance
```

---

**✅ Sistema completamente implementado y desplegado en DEV**

Próximo paso: Crear los componentes UI para que los usuarios puedan interactuar con el sistema.
