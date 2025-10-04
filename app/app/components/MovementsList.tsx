'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { deleteMovement } from '@/app/app/expenses/actions';
import { useRouter } from 'next/navigation';

interface Movement {
  id: string;
  amount: number;
  currency: string;
  type: 'expense' | 'income';
  description: string | null;
  occurred_at: string;
  categories: {
    name: string;
    icon: string | null;
  } | null;
}

interface MovementsListProps {
  movements: Movement[];
  showActions?: boolean;
}

export function MovementsList({ movements, showActions = true }: MovementsListProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este movimiento?')) return;

    setDeletingId(id);
    const result = await deleteMovement(id);

    if (!result.ok) {
      toast.error(result.message);
    } else {
      toast.success('Movimiento eliminado');
      router.refresh();
    }
    setDeletingId(null);
  };

  if (movements.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <p className="text-lg font-medium mb-2">
              No hay movimientos registrados
            </p>
            <p className="text-sm">
              Haz click en &quot;+ Nuevo Movimiento&quot; para empezar
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {movements.map((movement) => (
        <Card key={movement.id}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="text-2xl flex-shrink-0">
                  {movement.categories?.icon || (movement.type === 'expense' ? '💸' : '💰')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {movement.categories?.name || 'Sin categoría'}
                  </p>
                  {movement.description && (
                    <p className="text-sm text-muted-foreground truncate">{movement.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {new Date(movement.occurred_at).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p
                    className={`text-xl font-bold ${
                      movement.type === 'expense' ? 'text-red-600' : 'text-green-600'
                    }`}
                  >
                    {movement.type === 'expense' ? '-' : '+'}
                    {formatCurrency(movement.amount, movement.currency)}
                  </p>
                  <Badge variant={movement.type === 'expense' ? 'destructive' : 'default'} className="mt-1">
                    {movement.type === 'expense' ? 'Gasto' : 'Ingreso'}
                  </Badge>
                </div>
                {showActions && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={deletingId === movement.id}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(movement.id)}
                      disabled={deletingId === movement.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
