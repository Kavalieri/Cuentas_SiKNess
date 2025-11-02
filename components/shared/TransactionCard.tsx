'use client';

import { formatCurrency } from '@/lib/format';
import { Pencil } from 'lucide-react';
import { useState } from 'react';

interface TransactionCardProps {
  tx: {
    id: string;
    type: string;
    flow_type: string;
    amount: number;
    description?: string;
    occurred_at: string;
    performed_at?: string | null;
    transaction_number?: number; // ✨ Issue #27: Número de transacción
    transaction_pair_id?: string; // ✨ Issue #27: Para identificar pares directos
    is_compensatory_income?: boolean; // ✨ Issue #26: Flag para ingresos compensatorios

    // ✅ Jerarquía completa de 3 niveles
    parent_category_name?: string; // 🟢 Grupo (nivel 1)
    category_name?: string; // 🟡 Categoría (nivel 2)
    category_icon?: string;
    subcategory_name?: string; // 🔵 Subcategoría (nivel 3)
    subcategory_icon?: string;

    profile_id?: string;
    profile_email?: string;
    profile_display_name?: string;
    real_payer_email?: string;
    real_payer_display_name?: string;
    paid_by?: string | null; // ID del miembro que pagó (común) o NULL si cuenta común
    paid_by_email?: string;
    paid_by_display_name?: string;
    paid_by_is_joint_account?: boolean; // Flag desde API: true si paid_by es Cuenta Común

    // ✨ NUEVO: Sistema dual-field (Issue #20)
    performed_by_profile_id?: string | null; // UUID del ejecutor físico
    performed_by_display_name?: string | null; // Nombre del ejecutor desde API
  };
  allTransactions?: TransactionCardProps['tx'][]; // ✨ Issue #27: Para encontrar pares directos
  isOwner: boolean;
  currentUserId?: string;
  editButton?: React.ReactNode;
  deleteButton?: React.ReactNode;
  parseLocalDate: (dateString: string) => Date;
}

export function TransactionCard({
  tx,
  allTransactions,
  isOwner,
  currentUserId,
  editButton,
  deleteButton,
  parseLocalDate,
}: TransactionCardProps) {
  // ✨ Issue #27: Formatear número de transacción (pares directos: #X-Y)
  const formatTransactionNumber = (): string => {
    if (!tx.transaction_number) return '';

    // Si es flujo directo y tiene par, mostrar ambos números
    if (tx.flow_type === 'direct' && tx.transaction_pair_id && allTransactions) {
      const pairTx = allTransactions.find(
        (t) => t.transaction_pair_id === tx.transaction_pair_id && t.id !== tx.id,
      );

      if (pairTx?.transaction_number) {
        // Ordenar: gasto primero, ingreso segundo (convención del sistema)
        const isExpense = tx.type === 'expense_direct';
        const num1 = isExpense ? tx.transaction_number : pairTx.transaction_number;
        const num2 = isExpense ? pairTx.transaction_number : tx.transaction_number;
        return `${num1}-${num2}`;
      }
    }

    // Flujo común: solo el número
    return tx.transaction_number.toString();
  };

  const [isExpanded, setIsExpanded] = useState(false);

  const isIncome = tx.type === 'income' || tx.type === 'income_direct';
  const canEdit = isOwner || tx.profile_id === currentUserId;

  // Parsear fecha
  const src = tx.performed_at || tx.occurred_at;
  const date = parseLocalDate(src as string);

  // Determinar qué miembro mostrar como "registrado por"
  const registeredBy = tx.profile_display_name || tx.profile_email || 'Desconocido';

  // Determinar quién realizó el pago (Sistema Dual-Field Issue #20)
  let paidBy: string;
  if (tx.flow_type === 'direct') {
    // Flujos directos: usar real_payer
    paidBy = tx.real_payer_display_name || tx.real_payer_email || 'Desconocido';
  } else {
    // Flujos comunes: verificar si es Cuenta Común o miembro específico
    if (tx.paid_by_is_joint_account) {
      // ✨ NUEVO: Sistema dual-field - mostrar ejecutor físico
      if (tx.performed_by_display_name) {
        paidBy = `Cuenta Común (realizado por ${tx.performed_by_display_name})`;
      } else {
        paidBy = 'Cuenta Común';
      }
    } else if (tx.paid_by_display_name) {
      paidBy = tx.paid_by_display_name;
    } else if (tx.paid_by_email) {
      paidBy = tx.paid_by_email;
    } else {
      paidBy = 'Desconocido';
    }
  }

  // Renderizar jerarquía de categoría (solo para vista expandida)
  const renderCategoryHierarchy = () => {
    const parts = [];

    // Grupo (nivel 1)
    if (tx.parent_category_name) {
      parts.push(
        <span key="group" className="text-muted-foreground">
          {tx.parent_category_name}
        </span>,
      );
    }

    // Categoría (nivel 2)
    if (tx.category_name) {
      if (parts.length > 0) {
        parts.push(
          <span key="arrow1" className="text-muted-foreground">
            {' '}
            →{' '}
          </span>,
        );
      }
      parts.push(
        <span key="category" className="flex items-center gap-1">
          {tx.category_icon && <span className="text-sm">{tx.category_icon}</span>}
          <span className="font-medium">{tx.category_name}</span>
        </span>,
      );
    }

    // Subcategoría (nivel 3)
    if (tx.subcategory_name) {
      parts.push(
        <span key="arrow2" className="text-muted-foreground">
          {' '}
          →{' '}
        </span>,
      );
      parts.push(
        <span key="subcategory" className="flex items-center gap-1">
          {tx.subcategory_icon && tx.subcategory_icon !== tx.category_icon && (
            <span className="text-sm">{tx.subcategory_icon}</span>
          )}
          <span className="font-medium">{tx.subcategory_name}</span>
        </span>,
      );
    }

    if (parts.length === 0) {
      return <span className="text-muted-foreground text-xs">Sin categoría</span>;
    }

    return <div className="flex items-center gap-0 text-sm flex-wrap">{parts}</div>;
  };

  // Obtener icono y texto para título colapsado
  const getTitleIcon = () => {
    // Priorizar icono de subcategoría si existe, si no categoría
    return tx.subcategory_icon || tx.category_icon || null;
  };

  const getTitleText = () => {
    if (tx.subcategory_name) {
      return `${tx.category_name} - ${tx.subcategory_name}`;
    }
    return tx.category_name || 'Sin categoría';
  };

  return (
    <div
      className="border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
      onClick={() => setIsExpanded(!isExpanded)}
    >
      {/* Vista Colapsada - Mobile First - Estructura fija 4 líneas (Issue #27) */}
      <div className="p-3 space-y-2">
        {/* LÍNEA 1: Badges (siempre presente, reserva espacio con min-h) */}
        <div className="flex items-center gap-2 flex-wrap min-h-[20px]">
          {/* Badge número de transacción */}
          {tx.transaction_number && (
            <span
              className={`inline-flex items-center px-1.5 py-0.5 text-xs font-mono rounded whitespace-nowrap ${
                tx.flow_type === 'direct'
                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              #{formatTransactionNumber()}
            </span>
          )}
          {/* Badge ingreso compensatorio - Issue #26 */}
          {tx.is_compensatory_income && (
            <span className="inline-flex items-center px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded whitespace-nowrap">
              Automático
            </span>
          )}
        </div>

        {/* LÍNEA 2: Categoría (título) - SIN MONTO */}
        <div className="flex items-center gap-2">
          {getTitleIcon() && <span className="text-lg flex-shrink-0">{getTitleIcon()}</span>}
          <span className="font-medium text-sm truncate">{getTitleText()}</span>
        </div>

        {/* LÍNEA 3: Descripción (subtítulo) */}
        {tx.description && (
          <div className="text-sm text-muted-foreground truncate">{tx.description}</div>
        )}

        {/* LÍNEA 4: Monto (izquierda) + Fecha (derecha) - POSICIONES FIJAS */}
        <div className="flex items-center justify-between">
          <span
            className={`text-lg font-semibold ${
              isIncome ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {isIncome ? '+' : '-'}
            {formatCurrency(tx.amount)}
          </span>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {date.toLocaleDateString('es-ES', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })}
          </span>
        </div>

        {/* Vista Expandida: Información adicional simplificada */}
        {isExpanded && (
          <div
            className="pt-2 space-y-2 border-t"
            onClick={(e) => e.stopPropagation()} // Evitar cerrar al hacer clic dentro
          >
            {/* Solo Grupo (no repetir jerarquía completa) */}
            <div className="text-sm">
              <span className="text-muted-foreground">Grupo: </span>
              <span className="font-medium">{tx.parent_category_name || 'Sin grupo'}</span>
            </div>

            {/* Hora (movida desde vista colapsada) */}
            {tx.performed_at && (
              <div className="text-sm">
                <span className="text-muted-foreground">Hora: </span>
                <span className="font-medium">
                  {date.toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )}

            {/* Descripción completa (si es larga, >50 caracteres) */}
            {tx.description && tx.description.length > 50 && (
              <div className="text-sm">
                <span className="text-muted-foreground">Descripción completa: </span>
                <span>{tx.description}</span>
              </div>
            )}

            {/* Gastado/Ingresado por (según tipo) */}
            <div className="text-sm">
              <span className="text-muted-foreground">
                {isIncome ? 'Ingresado por: ' : 'Gastado por: '}
              </span>
              <span className="font-medium">{paidBy}</span>
            </div>

            {/* Registrado por */}
            <div className="text-sm">
              <span className="text-muted-foreground">Registrado por: </span>
              <span className="font-medium">{registeredBy}</span>
            </div>

            {/* Botones de acción (solo si no es compensatory income - Issue #26) */}
            {canEdit && !tx.is_compensatory_income && (
              <div className="flex gap-2 pt-2">
                {editButton ? (
                  editButton
                ) : (
                  <button
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    onClick={(e) => {
                      e.stopPropagation();
                      // TODO: Acción de editar
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                )}
                {isOwner && deleteButton}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
