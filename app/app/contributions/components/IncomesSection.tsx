'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { setMemberIncome } from '@/app/app/contributions/actions';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/format';
import { startOfMonth } from 'date-fns';

interface Member {
  user_id: string;
  email: string;
  role: string;
  currentIncome: number;
}

interface IncomesSectionProps {
  householdId: string;
  members: Member[];
}

export function IncomesSection({ householdId, members }: IncomesSectionProps) {
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [incomes, setIncomes] = useState<Record<string, number>>(
    members.reduce((acc, m) => ({ ...acc, [m.user_id]: m.currentIncome }), {})
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async (userId: string) => {
    setIsLoading(true);

    const formData = new FormData();
    formData.append('household_id', householdId);
    formData.append('user_id', userId);
    formData.append('monthly_income', incomes[userId]?.toString() || '0');
    formData.append('effective_from', startOfMonth(new Date()).toISOString());

    const result = await setMemberIncome(formData);

    setIsLoading(false);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    toast.success('Ingreso actualizado correctamente');
    setEditingMember(null);
  };

  const totalIncome = Object.values(incomes).reduce((sum, income) => sum + income, 0);

  return (
    <div className="space-y-4">
      {members.map((member) => {
        const isEditing = editingMember === member.user_id;
        const income = incomes[member.user_id] ?? 0;
        const percentage = totalIncome > 0 ? (income / totalIncome) * 100 : 0;

        return (
          <Card key={member.user_id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{member.email}</span>
                  {member.role === 'owner' && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Owner</span>
                  )}
                </div>

                {isEditing ? (
                  <div className="mt-2 flex items-end gap-2">
                    <div className="flex-1">
                      <Label htmlFor={`income-${member.user_id}`}>Ingreso mensual (EUR)</Label>
                      <Input
                        id={`income-${member.user_id}`}
                        type="number"
                        step="0.01"
                        min="0"
                        value={income}
                        onChange={(e) =>
                          setIncomes((prev) => ({
                            ...prev,
                            [member.user_id]: parseFloat(e.target.value) || 0,
                          }))
                        }
                        disabled={isLoading}
                      />
                    </div>
                    <Button onClick={() => handleSave(member.user_id)} disabled={isLoading} size="sm">
                      Guardar
                    </Button>
                    <Button
                      onClick={() => {
                        setEditingMember(null);
                        setIncomes((prev) => ({ ...prev, [member.user_id]: member.currentIncome }));
                      }}
                      variant="outline"
                      size="sm"
                      disabled={isLoading}
                    >
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <div className="mt-1 text-sm text-muted-foreground">
                    Ingreso: <strong>{formatCurrency(income)}</strong>
                    {totalIncome > 0 && (
                      <span className="ml-2">({percentage.toFixed(1)}% del total)</span>
                    )}
                  </div>
                )}
              </div>

              {!isEditing && (
                <Button onClick={() => setEditingMember(member.user_id)} variant="outline" size="sm">
                  Editar
                </Button>
              )}
            </div>
          </Card>
        );
      })}

      {totalIncome > 0 && (
        <div className="pt-4 border-t">
          <p className="text-sm font-semibold">
            Ingresos totales del hogar: <span className="text-lg">{formatCurrency(totalIncome)}</span>/mes
          </p>
        </div>
      )}
    </div>
  );
}
