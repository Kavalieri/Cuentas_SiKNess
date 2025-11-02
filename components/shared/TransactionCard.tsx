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
  isOwner: boolean;
  currentUserId?: string;
  editButton?: React.ReactNode;
  deleteButton?: React.ReactNode;
  parseLocalDate: (dateString: string) => Date;
}

export function TransactionCard({
  tx,
  isOwner,
  currentUserId,
  editButton,
  deleteButton,
  parseLocalDate,
}: TransactionCardProps) {
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
      {/* Vista Colapsada - Mobile First */}
      <div className="p-3 space-y-2">
        {/* Línea 1: Título con icono + Badge + Importe */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
            {/* Título: Icono + Categoría - Subcategoría */}
            <div className="flex items-center gap-2">
              {getTitleIcon() && <span className="text-lg">{getTitleIcon()}</span>}
              <span className="font-medium truncate">{getTitleText()}</span>
            </div>
            {/* Badge flujo directo */}
            {tx.flow_type === 'direct' && (
              <span className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 px-2 py-0.5 rounded whitespace-nowrap">
                Directo
              </span>
            )}
          </div>
          <span
            className={`text-lg font-semibold whitespace-nowrap ${
              isIncome ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {isIncome ? '+' : '-'}
            {formatCurrency(tx.amount)}
          </span>
        </div>

        {/* Línea 2: Descripción (si existe) */}
        {tx.description && (
          <div className="text-sm text-muted-foreground truncate">{tx.description}</div>
        )}

        {/* Línea 3: Fecha + Hora */}
        <div className="text-sm text-muted-foreground">
          {date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })}
          {tx.performed_at && (
            <span className="ml-1">
              •{' '}
              {date.toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )}
        </div>

        {/* Vista Expandida: Información adicional */}
        {isExpanded && (
          <div
            className="pt-2 space-y-2 border-t"
            onClick={(e) => e.stopPropagation()} // Evitar cerrar al hacer clic dentro
          >
            {/* Jerarquía completa */}
            <div className="text-sm">
              <span className="text-muted-foreground">Categoría: </span>
              {renderCategoryHierarchy()}
            </div>

            {/* Descripción completa (si es larga) */}
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

            {/* Tipo de flujo */}
            <div className="text-sm">
              <span className="text-muted-foreground">Tipo: </span>
              <span className="font-medium">
                {tx.flow_type === 'direct' ? 'Flujo Directo' : 'Flujo Común'}{' '}
                {isIncome ? '(Ingreso)' : '(Gasto)'}
              </span>
            </div>

            {/* Botones de acción */}
            {canEdit && (
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
