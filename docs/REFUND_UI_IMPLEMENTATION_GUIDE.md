# 📋 Guía de Implementación UI - Sistema de Reembolsos

> **Estado**: Guía paso-a-paso para integrar componentes de reembolsos en `app/dual-flow/credito-deuda/page.tsx`
>
> **Referencia**: Sistema backend en `app/dual-flow/credito-deuda/refund-actions.ts` y `actions.ts`

---

## 📍 Ubicación Actual del Trabajo

Tu página de crédito-deuda está en:
- **Ruta**: `/app/dual-flow/credito-deuda/page.tsx`
- **Componentes**: Ya tienes estructura para mostrar balance
- **Action**: `app/dual-flow/credito-deuda/actions.ts` (con integración de reembolsos)

---

## 🎯 Plan de Integración (3 Pasos)

### Paso 1: Crear Componentes en Directorio Nuevo

```bash
# Crear carpeta de componentes para reembolsos
mkdir -p app/dual-flow/credito-deuda/components/refunds
```

**Archivos a crear:**

1. **`app/dual-flow/credito-deuda/components/refunds/ActiveRefundButton.tsx`**
   - Botón + Modal para reembolso activo inmediato
   - Permite elegir monto, categoría, descripción
   - Integra `createActiveRefund()` action

2. **`app/dual-flow/credito-deuda/components/refunds/UnreimbursedExpensesList.tsx`**
   - Lista de gastos directos sin reembolso declarado
   - Botón "¿Incluye Reembolso?" por cada gasto
   - Modal para declarar reembolso
   - Integra `getUnreimbursedDirectExpenses()` y `declareRefund()` actions

3. **`app/dual-flow/credito-deuda/components/refunds/PendingRefundsPanel.tsx`**
   - **SOLO PARA OWNER**
   - Lista pendientes de aprobación
   - Botones Aprobar/Rechazar
   - Integra `getPendingRefundClaims()`, `approveRefundClaim()`, `rejectRefundClaim()` actions

4. **`app/dual-flow/credito-deuda/components/refunds/index.ts`**
   - Exporta todos los componentes

---

## 🔨 Estructura de Cada Componente

### 1. ActiveRefundButton.tsx

```typescript
'use client';

import { createActiveRefund } from '../../refund-actions';
import { getMemberBalanceStatus } from '../../actions';
import { useUser } from '@/contexts/UserContext';
import { useHousehold } from '@/contexts/HouseholdContext';
import { useState } from 'react';

interface ActiveRefundButtonProps {
  maxAmount: number;
  categories: Array<{ id: string; name: string; icon: string }>;
  onSuccess?: () => void;
}

export function ActiveRefundButton({
  maxAmount,
  categories,
  onSuccess,
}: ActiveRefundButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount: maxAmount.toString(),
    categoryId: categories[0]?.id || '',
    description: '',
  });

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const result = await createActiveRefund(
        Number(formData.amount),
        formData.categoryId,
        formData.description
      );

      if (result.ok) {
        // Éxito - mostrar toast, cerrar modal, actualizar
        setIsOpen(false);
        onSuccess?.();
        setFormData({
          amount: maxAmount.toString(),
          categoryId: categories[0]?.id || '',
          description: '',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Botón */}
      <button
        onClick={() => setIsOpen(true)}
        className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
      >
        💚 Reembolsar Activamente
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-96 rounded-lg bg-white p-6 dark:bg-slate-900">
            <h2 className="mb-4 text-xl font-bold">Reembolsar Activamente</h2>

            <div className="space-y-4">
              {/* Monto */}
              <div>
                <label className="block text-sm font-medium">
                  Monto (máx: {maxAmount.toFixed(2)}€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={maxAmount}
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  className="w-full rounded border px-3 py-2"
                />
              </div>

              {/* Categoría */}
              <div>
                <label className="block text-sm font-medium">Categoría</label>
                <select
                  value={formData.categoryId}
                  onChange={(e) =>
                    setFormData({ ...formData, categoryId: e.target.value })
                  }
                  className="w-full rounded border px-3 py-2"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium">Descripción</label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full rounded border px-3 py-2"
                  rows={2}
                />
              </div>

              {/* Botones */}
              <div className="flex gap-2">
                <button
                  onClick={() => setIsOpen(false)}
                  disabled={isLoading}
                  className="flex-1 rounded border px-4 py-2"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isLoading || !formData.amount}
                  className="flex-1 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {isLoading ? 'Procesando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

**Key Points:**
- ✅ `'use client'` al inicio
- ✅ Llama a `createActiveRefund()` del action
- ✅ Modal integrado (no componente por separado)
- ✅ `onSuccess` callback para recargar datos

---

### 2. UnreimbursedExpensesList.tsx

```typescript
'use client';

import { getUnreimbursedDirectExpenses, declareRefund } from '../../refund-actions';
import { useEffect, useState } from 'react';

export function UnreimbursedExpensesList() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedExpense, setSelectedExpense] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    setIsLoading(true);
    try {
      const result = await getUnreimbursedDirectExpenses();
      if (result.ok) {
        setExpenses(result.data);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <div>Cargando gastos...</div>;
  if (expenses.length === 0)
    return (
      <div className="text-center text-gray-500">
        ✅ No tienes gastos directos sin reembolso
      </div>
    );

  return (
    <>
      <div className="space-y-3">
        <h3 className="font-bold">Gastos Directos - Declarar Reembolso</h3>

        {expenses.map((exp) => (
          <div
            key={exp.id}
            className="flex items-center justify-between rounded border p-3"
          >
            <div>
              <p className="font-semibold">
                {exp.icon} {exp.category}
              </p>
              <p className="text-sm text-gray-600">{exp.description}</p>
              <p className="text-xs text-gray-500">
                {exp.amount.toFixed(2)}€ •{' '}
                {new Date(exp.occurred_at).toLocaleDateString('es-ES')}
              </p>
            </div>

            <button
              onClick={() => {
                setSelectedExpense(exp);
                setShowModal(true);
              }}
              className="rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700"
            >
              ¿Reembolso?
            </button>
          </div>
        ))}
      </div>

      {/* Modal para declarar */}
      {showModal && selectedExpense && (
        <DeclareRefundModal
          expense={selectedExpense}
          onClose={() => {
            setShowModal(false);
            setSelectedExpense(null);
          }}
          onSuccess={() => loadExpenses()}
        />
      )}
    </>
  );
}

// Sub-componente: Modal declarar reembolso
function DeclareRefundModal({ expense, onClose, onSuccess }: any) {
  const [refundAmount, setRefundAmount] = useState(expense.amount * 0.1);
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const result = await declareRefund(expense.id, refundAmount, reason);
      if (result.ok) {
        onClose();
        onSuccess?.();
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-96 rounded-lg bg-white p-6">
        <h2 className="mb-4 text-lg font-bold">Declarar Reembolso</h2>

        <div className="mb-4 rounded bg-gray-100 p-3">
          <p className="text-xs text-gray-600">Gasto seleccionado</p>
          <p className="font-bold">{expense.category}</p>
          <p className="text-lg font-semibold text-green-600">
            {expense.amount.toFixed(2)}€
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium">
              Monto del reembolso (máx: {expense.amount.toFixed(2)}€)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max={expense.amount}
              value={refundAmount}
              onChange={(e) => setRefundAmount(Number(e.target.value))}
              className="w-full rounded border px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Motivo</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded border px-3 py-2"
              rows={2}
              placeholder="Ej: Pagué más de lo acordado"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 rounded border px-4 py-2"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading || refundAmount <= 0}
              className="flex-1 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-gray-400"
            >
              {isLoading ? 'Declarando...' : 'Declarar Reembolso'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

### 3. PendingRefundsPanel.tsx

```typescript
'use client';

import {
  getPendingRefundClaims,
  approveRefundClaim,
  rejectRefundClaim,
} from '../../refund-actions';
import { useEffect, useState } from 'react';

export function PendingRefundsPanel() {
  const [claims, setClaims] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadClaims();
  }, []);

  const loadClaims = async () => {
    setIsLoading(true);
    try {
      const result = await getPendingRefundClaims();
      if (result.ok) {
        setClaims(result.data);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (claimId: string) => {
    const result = await approveRefundClaim(claimId);
    if (result.ok) {
      loadClaims();
    }
  };

  const handleReject = async (claimId: string) => {
    const result = await rejectRefundClaim(claimId);
    if (result.ok) {
      loadClaims();
    }
  };

  if (isLoading) return <div>Cargando reembolsos pendientes...</div>;
  if (claims.length === 0) return <div>✅ No hay reembolsos pendientes</div>;

  return (
    <div className="space-y-3">
      <h3 className="font-bold text-orange-600">
        Reembolsos Pendientes ({claims.length})
      </h3>

      {claims.map((claim) => (
        <div key={claim.id} className="rounded border border-orange-200 bg-orange-50 p-4">
          <p className="font-semibold">{claim.display_name}</p>
          <p className="text-xs text-gray-600">{claim.email}</p>

          <div className="mt-2 space-y-1 text-sm">
            <p>
              <strong>Gasto:</strong> {claim.category_icon} {claim.expense_category}
            </p>
            <p className="font-bold text-blue-600">
              Reembolso solicitado: {claim.refund_amount.toFixed(2)}€
            </p>
            {claim.reason && <p className="text-gray-600">Motivo: {claim.reason}</p>}
          </div>

          <div className="mt-3 flex gap-2">
            <button
              onClick={() => handleApprove(claim.id)}
              className="flex-1 rounded bg-green-600 px-3 py-1 text-white hover:bg-green-700"
            >
              ✅ Aprobar
            </button>
            <button
              onClick={() => handleReject(claim.id)}
              className="flex-1 rounded bg-red-600 px-3 py-1 text-white hover:bg-red-700"
            >
              ❌ Rechazar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

## 🔧 Integración en `page.tsx`

En tu página de `app/dual-flow/credito-deuda/page.tsx`:

```typescript
import { getMemberBalanceStatus } from './actions';
import { getCategories } from '@/lib/categories'; // O donde tengas esta función
import { ActiveRefundButton } from './components/refunds/ActiveRefundButton';
import { UnreimbursedExpensesList } from './components/refunds/UnreimbursedExpensesList';
import { PendingRefundsPanel } from './components/refunds/PendingRefundsPanel';
import { isUserHouseholdOwner } from '@/lib/auth'; // O tu función de permisos

export default async function CreditoDeudaPage() {
  const balance = await getMemberBalanceStatus();
  const categories = await getCategories(); // Obtener categorías

  // Determinar si es owner
  const isOwner = await isUserHouseholdOwner();

  // Calcular cuánto puede reembolsar activamente
  const activeRefundCapacity = Math.max(0, balance.pending);

  return (
    <div className="space-y-8">
      {/* SECCIÓN 1: Balance General */}
      <section className="rounded-lg border p-6">
        <h2 className="text-2xl font-bold">Tu Balance</h2>
        <p className="text-lg">
          Saldo Pendiente: <strong>{balance.pending.toFixed(2)}€</strong>
        </p>
      </section>

      {/* SECCIÓN 2: Reembolsar Activamente */}
      {activeRefundCapacity > 0 && (
        <section className="rounded-lg border border-green-200 bg-green-50 p-6">
          <h3 className="mb-4 font-bold">Reembolso Activo</h3>
          <p className="mb-4 text-sm text-gray-600">
            Disponible para reembolsar: <strong>{activeRefundCapacity.toFixed(2)}€</strong>
          </p>

          <ActiveRefundButton
            maxAmount={activeRefundCapacity}
            categories={categories}
            onSuccess={() => {
              // Recargar balance
              window.location.reload(); // O usar state management
            }}
          />
        </section>
      )}

      {/* SECCIÓN 3: Declarar Reembolsos */}
      <section className="rounded-lg border border-blue-200 bg-blue-50 p-6">
        <h3 className="mb-4 font-bold">Declarar Reembolsos</h3>
        <UnreimbursedExpensesList />
      </section>

      {/* SECCIÓN 4: Reembolsos Pendientes (OWNER ONLY) */}
      {isOwner && (
        <section className="rounded-lg border border-orange-200 bg-orange-50 p-6">
          <PendingRefundsPanel />
        </section>
      )}
    </div>
  );
}
```

---

## ✅ Checklist de Implementación

- [ ] Crear directorio `app/dual-flow/credito-deuda/components/refunds`
- [ ] Crear `ActiveRefundButton.tsx`
- [ ] Crear `UnreimbursedExpensesList.tsx`
- [ ] Crear `PendingRefundsPanel.tsx`
- [ ] Crear `index.ts` (exportar todos)
- [ ] Actualizar `page.tsx` para importar y usar componentes
- [ ] Probar en DEV:
  - [ ] Crear reembolso activo → verifica que balance se actualiza
  - [ ] Declarar reembolso en gasto → verifica que aparece en pending
  - [ ] Como owner: aprobar/rechazar → verifica balance
- [ ] Verificar que gráficos siguen mostrando correctamente
- [ ] Verificar que pagination sigue funcionando

---

## 🧪 Testing Manual

1. **Como Usuario:**
   - Acceder a `/app/credito-deuda`
   - Ver "Reembolsar Activamente" si tiene saldo > 0
   - Ver lista de gastos directos sin reembolso
   - Hacer clic en "¿Reembolso?"
   - Rellenar modal y declarar
   - Verificar que aparece en lista de pending (como owner)

2. **Como Owner:**
   - Ver lista de "Reembolsos Pendientes"
   - Aprobar un reembolso
   - Verificar que balance del usuario se actualiza
   - Rechazar un reembolso
   - Verificar que balance NO se actualiza

---

## 📚 Referencias

- **Backend API**: `app/dual-flow/credito-deuda/refund-actions.ts`
- **Balance Integration**: `app/dual-flow/credito-deuda/actions.ts` (getMemberBalanceStatus)
- **Database Functions**: `get_approved_refunds()`, `v_pending_refund_claims`
- **UI Examples**: `docs/REFUND_SYSTEM_UI_EXAMPLES.tsx`
- **System Docs**: `docs/REFUND_SYSTEM.md`

---

**Estado**: Guía completa lista para implementar. ¿Necesitas ayuda con alguno de los pasos?
