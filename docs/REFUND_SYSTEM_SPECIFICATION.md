# Sistema de Reembolsos - Especificación Completa

## Problema Original

La UI mostraba 0.75€ a favor pero el botón "Solicitar reembolso" indicaba "No tienes saldo a favor".

### Root Cause

- `requestCreditRefund()` consultaba `member_balances` directamente
- `getMemberBalanceStatus()` (usado por la UI) consultaba `get_member_balance_status()` de la BD
- Estas dos fuentes podían estar desincronizadas
- Resultado: Validaciones inconsistentes

### Solución

`requestCreditRefund()` ahora usa la misma función de BD que la UI para validación, garantizando consistencia.

---

## Dos Tipos de Reembolsos

Se han implementado dos modos de reembolso diferentes según la situación:

### TIPO 1: `balance` - Reembolso de Saldo Acumulado

**Cuándo se usa:**
- Miembro tiene crédito acumulado en `member_balances` (ejemplo: 0.75€ a favor)
- Solicita recuperar el saldo pendiente
- Owner debe validar

**Flujo:**
1. Miembro ingresa cantidad a reembolsar
2. Miembro envía solicitud
3. **Owner valida** la solicitud
4. Si aprueba:
   - Se crea una transacción de "gasto" (tipo=expense, flow_type=common)
   - Se reduce el `member_balances` por el monto reembolsado
   - La solicitud pasa a estado "approved"
5. El miembro recibe el dinero (fuera del sistema)

**BD: `refund_type = 'balance'`**

```sql
INSERT INTO credit_refund_requests 
  (household_id, profile_id, amount, notes, requested_by, status, refund_type)
VALUES ($1, $2, €0.75, 'Recuperar saldo', profile_id, 'pending', 'balance');
```

**Validación:**
- Crédito disponible >= monto solicitado
- Owner debe aprobar/rechazar

---

### TIPO 2: `transaction` - Reembolso de Transacción Existente

**Cuándo se usa:**
- Miembro pagó de su bolsillo (gasto directo registrado como `expense_direct`)
- El gasto ya existe en `transactions`
- Quiere que se valide el reembolso vinculándolo a esa transacción
- Sin cálculos adicionales

**Ejemplo:**
- Caballeropomes pagó €50 de su bolsillo por comida compartida
- Registró la transacción: `transactions.type = 'expense_direct', amount = 50`
- Ahora solicita reembolso de ese gasto
- Owner valida que sí pagó €50 de su bolsillo
- Se reduce su balance en €50 (ya se había sumado como gasto directo)

**Flujo:**
1. Miembro tiene transacción de gasto directo registrada
2. Miembro solicita reembolso vinculado a esa transacción
3. **Owner valida** el reembolso
4. Si aprueba:
   - NO se crea nueva transacción
   - Se reduce `member_balances` por el monto
   - La solicitud vincula `refund_transaction_id` a la transacción existente
   - La solicitud pasa a estado "approved"
5. El dinero se resta del saldo (sin movimiento adicional)

**BD: `refund_type = 'transaction'`**

```sql
INSERT INTO credit_refund_requests 
  (household_id, profile_id, amount, notes, requested_by, status, refund_type, refund_transaction_id)
VALUES ($1, $2, €50, 'Reembolso gasto del 20/10', profile_id, 'pending', 'transaction', transaction_id);
```

**Validación:**
- Transacción debe existir en `transactions`
- Transacción debe ser tipo `expense` o `expense_direct`
- Crédito disponible >= monto solicitado
- Owner debe aprobar/rechazar

---

## Código: Diferencias en `approveCreditRefund()`

### TIPO 1: Balance

```typescript
if (request.refund_type === 'balance') {
  // Crear transacción de reembolso
  const txRes = await client.query(
    `INSERT INTO transactions (..., type='expense', ...)`
  );
  txId = txRes.rows[0].id;
  
  // Reducir balance del miembro
  await client.query(
    `SELECT update_member_balance($1, $2, $3, ...)`
  );
}
```

### TIPO 2: Transaction

```typescript
else if (request.refund_type === 'transaction') {
  // Validar que transacción existe
  const txRes = await client.query(
    `SELECT id FROM transactions WHERE id=$1 AND type IN ('expense', 'expense_direct')`
  );
  txId = request.refund_transaction_id;
  
  // Solo reducir balance (sin crear transacción)
  await client.query(
    `SELECT update_member_balance($1, $2, -amount, ...)`
  );
}
```

---

## Tabla de BD: `credit_refund_requests`

```sql
CREATE TABLE credit_refund_requests (
  id UUID PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES households(id),
  profile_id UUID NOT NULL REFERENCES profiles(id),
  amount NUMERIC(10,2) NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_by UUID NOT NULL REFERENCES profiles(id),
  
  -- Validación del owner
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  
  -- Vinculación a transacciones
  refund_transaction_id UUID REFERENCES transactions(id),
  
  -- NUEVO: Tipo de reembolso
  refund_type TEXT DEFAULT 'balance' 
    CHECK (refund_type IN ('balance', 'transaction')),
  
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## Validación del Owner

**Ambos tipos requieren validación del owner:**

- El owner ve las solicitudes pendientes en `/sickness/credito-deuda`
- El owner decide:
  - ✅ **Aprobar** (`approveCreditRefund(requestId)`): Ejecuta los pasos según el tipo
  - ❌ **Rechazar** (`rejectCreditRefund(requestId)`): La solicitud pasa a "rejected"

**Diferencia:**
- **TIPO 1**: Owner puede verificar que el miembro efectivamente tiene crédito pendiente
- **TIPO 2**: Owner verifica que el gasto existe y está justificado

---

## Flujos de UI

### Para Miembros

**Solicitar Reembolso (TIPO 1 - Balance):**
1. Van a `/sickness/credito-deuda`
2. Ven "Tu situación" → "Saldo a tu favor: +0.75€"
3. Sección "Solicitar reembolso"
4. Indican cantidad y motivo
5. Envían solicitud
6. Estado cambia a "Pendiente aprobación del owner"

**Notificar Reembolso (TIPO 2 - Transaction):**
- Esta funcionalidad podría estar en `/sickness/balance/` o similar
- Al crear/ver transacción de gasto directo, opción "Solicitar reembolso"
- Se vincularía automáticamente a esa transacción

### Para Owner

**Gestionar Reembolsos:**
1. Van a `/sickness/credito-deuda`
2. Ven tabla "Reembolsos Pendientes"
3. Por cada solicitud:
   - Ven: Quién solicita, monto, fecha, tipo (balance/transaction), transacción vinculada (si aplica)
   - Botón "Aprobar" o "Rechazar"
4. Al aprobar: se procesan según tipo (ver arriba)

---

## Mejoras Futuras

1. **UI para TIPO 2**: Crear interfaz en página de transacciones para vincular reembolsos
2. **Historial**: Mostrar histórico de reembolsos aprobados/rechazados
3. **Notificaciones**: Notificar al miembro cuando reembolso es aprobado/rechazado
4. **Pagos**: Integrar con forma de pago para que owner registre transferencia
5. **Auditoría**: Registrar quién validó cada reembolso y cuándo
