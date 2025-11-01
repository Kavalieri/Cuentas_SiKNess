'use client';

import { formatCurrency } from '@/lib/format';
import { ChevronDown, ChevronUp } from 'lucide-react';
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
    category_name?: string;
    category_icon?: string;
    subcategory_name?: string;
    subcategory_icon?: string;
    parent_category_name?: string;
    profile_id?: string;
    profile_email?: string;
    profile_display_name?: string;
    real_payer_email?: string;
    real_payer_display_name?: string;
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

  // Determinar qué miembro mostrar
  const memberName =
    tx.flow_type === 'direct'
      ? tx.real_payer_display_name || tx.real_payer_email
      : tx.profile_display_name || tx.profile_email;

  // Renderizar jerarquía de categoría
  const renderCategory = () => {
    if (tx.subcategory_name && tx.parent_category_name) {
      return (
        <span className="flex items-center gap-1">
          {tx.category_icon && <span className="text-sm">{tx.category_icon}</span>}
          <span>{tx.parent_category_name}</span>
          <span className="text-muted-foreground">→</span>
          <span>{tx.subcategory_name}</span>
          {tx.subcategory_icon && tx.subcategory_icon !== tx.category_icon && (
            <span className="text-sm">{tx.subcategory_icon}</span>
          )}
        </span>
      );
    }

    // Fallback: categoría legacy
    if (tx.category_name) {
      return (
        <span className="flex items-center gap-1">
          {tx.category_icon && <span className="text-sm">{tx.category_icon}</span>}
          <span>{tx.category_name}</span>
        </span>
      );
    }

    return <span className="text-muted-foreground">Sin categoría</span>;
  };

  return (
    <div className="border rounded-lg hover:bg-accent/50 transition-colors">
      {/* Vista Colapsada - Mobile First */}
      <div className="p-3 space-y-2">
        {/* Línea 1: Descripción + Importe (siempre visible) */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium truncate">{tx.description || 'Sin descripción'}</span>
              {tx.flow_type === 'direct' && (
                <span className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 px-2 py-0.5 rounded whitespace-nowrap">
                  Directo
                </span>
              )}
            </div>
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

        {/* Línea 2: Fecha + Hora (siempre visible) */}
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

        {/* Línea 3: Categoría (siempre visible en mobile, oculta en desktop si colapsado) */}
        <div className={`text-sm ${isExpanded ? '' : 'md:hidden'}`}>{renderCategory()}</div>

        {/* Vista Expandida: Información adicional */}
        {isExpanded && (
          <div className="pt-2 space-y-2 border-t">
            {/* Categoría en desktop expandido */}
            <div className="hidden md:block">
              <span className="text-sm text-muted-foreground">Categoría: </span>
              {renderCategory()}
            </div>

            {/* Miembro */}
            {memberName && (
              <div className="text-sm">
                <span className="text-muted-foreground">
                  {tx.flow_type === 'direct' ? 'Pagador: ' : 'Registrado por: '}
                </span>
                <span className="font-medium">{memberName}</span>
              </div>
            )}

            {/* Descripción completa si es muy larga */}
            {tx.description && tx.description.length > 50 && (
              <div className="text-sm">
                <span className="text-muted-foreground">Descripción completa: </span>
                <span>{tx.description}</span>
              </div>
            )}

            {/* Tipo de flujo */}
            <div className="text-sm">
              <span className="text-muted-foreground">Tipo: </span>
              <span className="font-medium">
                {tx.flow_type === 'direct' ? 'Flujo Directo' : 'Flujo Común'}{' '}
                {isIncome ? '(Ingreso)' : '(Gasto)'}
              </span>
            </div>
          </div>
        )}

        {/* Línea Final: Botón Expandir + Acciones */}
        <div className="flex items-center justify-between pt-2 gap-2 flex-wrap sm:flex-nowrap">
          {/* Botón expandir/colapsar */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Ver menos
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Ver más
              </>
            )}
          </button>

          {/* Botones de acción (Editar/Eliminar) */}
          {canEdit && (
            <div className="flex gap-1">
              {editButton}
              {isOwner && deleteButton}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
