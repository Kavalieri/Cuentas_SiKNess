'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { createPrePayment, deletePrePayment } from '@/app/app/contributions/actions';
import { Trash2, Plus } from 'lucide-react';

type Member = {
  user_id: string;
  email: string;
  role: string;
};

type Category = {
  id: string;
  name: string;
  icon: string | null;
  type: string;
};

type PrePayment = {
  id: string;
  user_id: string;
  amount: number;
  category_id: string | null;
  description: string;
  created_at: string | null;
  user?: { email: string };
  category?: { name: string; icon: string | null };
};

type PrePaymentsSectionProps = {
  householdId: string;
  members: Member[];
  categories: Category[];
  prePayments: PrePayment[];
  currentMonth: number;
  currentYear: number;
  isOwner: boolean;
};

export function PrePaymentsSection({
  householdId,
  members,
  categories,
  prePayments,
  currentMonth,
  currentYear,
  isOwner,
}: PrePaymentsSectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Si no es owner, no mostrar esta sección
  if (!isOwner) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedMember || !selectedCategory || !amount || !description) {
      toast.error('Todos los campos son obligatorios');
      return;
    }

    setIsSubmitting(true);

    const formData = new FormData();
    formData.append('household_id', householdId);
    formData.append('user_id', selectedMember);
    formData.append('category_id', selectedCategory);
    formData.append('amount', amount);
    formData.append('description', description);
    formData.append('month', currentMonth.toString());
    formData.append('year', currentYear.toString());

    const result = await createPrePayment(formData);

    setIsSubmitting(false);

    if (result.ok) {
      toast.success('Pre-pago registrado correctamente');
      // Reset form
      setSelectedMember('');
      setSelectedCategory('');
      setAmount('');
      setDescription('');
      setIsAdding(false);
    } else {
      toast.error(result.message);
    }
  };

  const handleDelete = async (prePaymentId: string) => {
    if (!confirm('¿Seguro que quieres eliminar este pre-pago?')) return;

    const result = await deletePrePayment(prePaymentId);

    if (result.ok) {
      toast.success('Pre-pago eliminado');
    } else {
      toast.error(result.message);
    }
  };

  const totalPrePayments = prePayments.reduce((sum, pp) => sum + pp.amount, 0);
  const expenseCategories = categories.filter((c) => c.type === 'expense');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Pre-pagos del Mes</CardTitle>
            <CardDescription>
              Registra gastos que los miembros ya han pagado. Se descontarán de su contribución mensual.
            </CardDescription>
          </div>
          {!isAdding && (
            <Button onClick={() => setIsAdding(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Añadir Pre-pago
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Formulario de añadir pre-pago */}
        {isAdding && (
          <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg bg-muted/30">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="member">Miembro</Label>
                <Select value={selectedMember} onValueChange={setSelectedMember}>
                  <SelectTrigger id="member">
                    <SelectValue placeholder="Selecciona un miembro" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((member) => (
                      <SelectItem key={member.user_id} value={member.user_id}>
                        {member.email} {member.role === 'owner' && '(Owner)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Categoría</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.icon} {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Cantidad (€)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Input
                  id="description"
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ej: Compra supermercado"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAdding(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : 'Guardar Pre-pago'}
              </Button>
            </div>
          </form>
        )}

        {/* Lista de pre-pagos */}
        {prePayments.length > 0 ? (
          <>
            <div className="space-y-2">
              {prePayments.map((prePayment) => (
                <div
                  key={prePayment.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">
                        {prePayment.user?.email || 'Usuario desconocido'}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {prePayment.category?.icon} {prePayment.category?.name || 'Sin categoría'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{prePayment.description}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-lg">
                      {new Intl.NumberFormat('es-ES', {
                        style: 'currency',
                        currency: 'EUR',
                      }).format(prePayment.amount)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(prePayment.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Total Pre-pagos:</span>
                <span className="font-bold text-lg">
                  {new Intl.NumberFormat('es-ES', {
                    style: 'currency',
                    currency: 'EUR',
                  }).format(totalPrePayments)}
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>No hay pre-pagos registrados para este mes.</p>
            <p className="text-sm mt-1">
              Los pre-pagos se descontarán automáticamente de las contribuciones de cada miembro.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
