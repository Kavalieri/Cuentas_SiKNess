'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  PlusCircle, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Receipt,
  Tag,
  Calendar,
  User,
  Trash2
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { 
  addContributionAdjustment,
  getContributionAdjustments,
  deleteContributionAdjustment
} from '@/app/app/contributions/actions';
import { formatCurrency, formatDate } from '@/lib/format';
import type { Database } from '@/types/database';

type Category = Pick<Database['public']['Tables']['categories']['Row'], 'id' | 'name' | 'icon' | 'type'>;

type AdjustmentType = 'manual' | 'prepayment' | 'bonus' | 'penalty';

type Adjustment = {
  id: string;
  contribution_id: string;
  amount: number;
  type: AdjustmentType;
  reason: string;
  category_id: string | null;
  movement_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  category?: { id: string; name: string; icon: string } | null;
  movement?: { id: string; description: string; amount: number; occurred_at: string } | null;
  creator?: { id: string; email: string } | null;
};

interface ContributionAdjustmentsSectionProps {
  contributionId: string | null;
  householdId: string;
  categories: Category[];
  currentMonth: number;
  currentYear: number;
  currency?: string;
}

const ADJUSTMENT_TYPE_LABELS: Record<AdjustmentType, string> = {
  manual: 'Ajuste Manual',
  prepayment: 'Pre-pago',
  bonus: 'Bonificación',
  penalty: 'Penalización',
};

const ADJUSTMENT_TYPE_ICONS: Record<AdjustmentType, React.ElementType> = {
  manual: DollarSign,
  prepayment: Receipt,
  bonus: TrendingDown,
  penalty: TrendingUp,
};

export function ContributionAdjustmentsSection({
  contributionId,
  categories,
  currency = 'EUR',
}: ContributionAdjustmentsSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>('manual');

  // Cargar ajustes cuando el componente se monta o el contributionId cambia
  const loadAdjustments = async () => {
    if (!contributionId) return;
    const data = await getContributionAdjustments(contributionId);
    setAdjustments(data as Adjustment[]);
  };

  useEffect(() => {
    if (contributionId) {
      loadAdjustments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contributionId]);

  const handleAddAdjustment = async (formData: FormData) => {
    setIsLoading(true);
    const result = await addContributionAdjustment(formData);

    if (result.ok) {
      toast.success('Ajuste agregado correctamente');
      setIsOpen(false);
      loadAdjustments();
    } else {
      toast.error(result.message);
    }
    setIsLoading(false);
  };

  const handleDeleteAdjustment = async (adjustmentId: string) => {
    if (!confirm('¿Eliminar este ajuste?')) return;

    const result = await deleteContributionAdjustment(adjustmentId);
    if (result.ok) {
      toast.success('Ajuste eliminado');
      loadAdjustments();
    } else {
      toast.error(result.message);
    }
  };

  // Si no hay contribución activa, no mostrar nada
  if (!contributionId) {
    return null;
  }

  const totalAdjustments = adjustments.reduce((sum, adj) => sum + adj.amount, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Ajustes de Contribución
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <PlusCircle className="h-4 w-4 mr-2" />
                Agregar Ajuste
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agregar Ajuste</DialogTitle>
                <DialogDescription>
                  Los ajustes modifican el monto esperado de contribución. 
                  Usa valores negativos para descuentos y positivos para cargos adicionales.
                </DialogDescription>
              </DialogHeader>

              <form action={handleAddAdjustment} className="space-y-4">
                <input type="hidden" name="contribution_id" value={contributionId} />

                {/* Tipo de Ajuste */}
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo de Ajuste</Label>
                  <Select
                    name="type"
                    value={adjustmentType}
                    onValueChange={(value) => setAdjustmentType(value as AdjustmentType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ADJUSTMENT_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Monto */}
                <div className="space-y-2">
                  <Label htmlFor="amount">
                    Monto
                    <span className="text-xs text-muted-foreground ml-2">
                      (negativo = descuento, positivo = cargo)
                    </span>
                  </Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    step="0.01"
                    placeholder="-50.00"
                    required
                  />
                </div>

                {/* Categoría (opcional) */}
                {adjustmentType === 'prepayment' && (
                  <div className="space-y-2">
                    <Label htmlFor="category_id">Categoría (opcional)</Label>
                    <Select name="category_id">
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Sin categoría</SelectItem>
                        {categories
                          .filter((cat) => cat.type === 'expense')
                          .map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.icon} {cat.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Razón */}
                <div className="space-y-2">
                  <Label htmlFor="reason">Razón del Ajuste</Label>
                  <Input
                    id="reason"
                    name="reason"
                    type="text"
                    placeholder="Ej: Pago anticipado de luz"
                    required
                    minLength={3}
                  />
                </div>

                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? 'Agregando...' : 'Agregar Ajuste'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Resumen de ajustes */}
        {adjustments.length > 0 && (
          <div className="flex items-center justify-between p-3 bg-muted rounded-md">
            <span className="text-sm text-muted-foreground">Total de ajustes:</span>
            <span
              className={`font-semibold ${
                totalAdjustments < 0
                  ? 'text-green-600 dark:text-green-400'
                  : totalAdjustments > 0
                  ? 'text-orange-600 dark:text-orange-400'
                  : ''
              }`}
            >
              {totalAdjustments < 0 ? '' : '+'}
              {formatCurrency(totalAdjustments, currency)}
            </span>
          </div>
        )}

        {/* Lista de ajustes */}
        {adjustments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No hay ajustes para este mes</p>
          </div>
        ) : (
          <div className="space-y-2">
            {adjustments.map((adjustment) => {
              const Icon = ADJUSTMENT_TYPE_ICONS[adjustment.type];
              const isNegative = adjustment.amount < 0;

              return (
                <div
                  key={adjustment.id}
                  className="flex items-start justify-between p-3 border rounded-md hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <Badge variant={isNegative ? 'default' : 'secondary'}>
                        {ADJUSTMENT_TYPE_LABELS[adjustment.type]}
                      </Badge>
                      <span
                        className={`font-semibold ${
                          isNegative
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-orange-600 dark:text-orange-400'
                        }`}
                      >
                        {isNegative ? '' : '+'}
                        {formatCurrency(adjustment.amount, currency)}
                      </span>
                    </div>

                    <p className="text-sm text-foreground">{adjustment.reason}</p>

                    {adjustment.category && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Tag className="h-3 w-3" />
                        {adjustment.category.icon} {adjustment.category.name}
                      </div>
                    )}

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {adjustment.creator && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {adjustment.creator.email}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(new Date(adjustment.created_at))}
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteAdjustment(adjustment.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
