'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Calculator } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { setContributionGoal, setMemberIncome } from '@/app/app/contributions/actions';
import { formatCurrency } from '@/lib/format';
import { 
  CALCULATION_TYPES, 
  CALCULATION_TYPE_LABELS, 
  CALCULATION_TYPE_DESCRIPTIONS,
  type CalculationType 
} from '@/lib/contributionTypes';

type ConfigurationSectionProps = {
  householdId: string;
  userId: string;
  currentGoal: number;
  currentIncome: number;
  currentCalculationType: CalculationType;
  isOwner: boolean;
  currency?: string;
};

export function ConfigurationSection({
  householdId,
  userId,
  currentGoal,
  currentIncome,
  currentCalculationType,
  isOwner,
  currency = 'EUR',
}: ConfigurationSectionProps) {
  const [isLoadingGoal, setIsLoadingGoal] = useState(false);
  const [isLoadingIncome, setIsLoadingIncome] = useState(false);
  const [calculationType, setCalculationType] = useState<CalculationType>(currentCalculationType);

  const handleUpdateGoal = async (formData: FormData) => {
    setIsLoadingGoal(true);
    const result = await setContributionGoal(formData);

    if (result.ok) {
      toast.success('Meta mensual actualizada');
    } else {
      toast.error(result.message);
    }
    setIsLoadingGoal(false);
  };

  const handleUpdateIncome = async (formData: FormData) => {
    setIsLoadingIncome(true);
    const result = await setMemberIncome(formData);

    if (result.ok) {
      toast.success('Ingreso mensual actualizado');
    } else {
      toast.error(result.message);
    }
    setIsLoadingIncome(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Configuración
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Meta mensual del hogar - Solo Owner */}
        {isOwner && (
          <form action={handleUpdateGoal} className="space-y-4">
            <input type="hidden" name="household_id" value={householdId} />
            <input type="hidden" name="currency" value={currency} />
            <input type="hidden" name="calculation_type" value={calculationType} />

            {/* Tipo de Cálculo */}
            <div className="space-y-2">
              <Label htmlFor="calculation_type" className="flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Método de Cálculo
              </Label>
              <Select
                value={calculationType}
                onValueChange={(value) => setCalculationType(value as CalculationType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(CALCULATION_TYPES).map((type) => (
                    <SelectItem 
                      key={type} 
                      value={type}
                      disabled={type === CALCULATION_TYPES.CUSTOM}
                    >
                      {CALCULATION_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {CALCULATION_TYPE_DESCRIPTIONS[calculationType]}
              </p>
            </div>

            {/* Meta Mensual */}
            <div className="space-y-2">
              <Label htmlFor="monthly_contribution_goal">
                Meta Mensual del Hogar
              </Label>
              <div className="flex gap-2">
                <Input
                  id="monthly_contribution_goal"
                  name="monthly_contribution_goal"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={currentGoal}
                  placeholder="2000.00"
                  required
                />
                <Button type="submit" disabled={isLoadingGoal}>
                  {isLoadingGoal ? 'Guardando...' : 'Actualizar'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Actual: {formatCurrency(currentGoal, currency)}
              </p>
            </div>
          </form>
        )}

        {!isOwner && (
          <div className="space-y-4">
            {/* Tipo de Cálculo (Solo lectura) */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Método de Cálculo
              </Label>
              <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                <span className="text-sm text-muted-foreground">Método actual:</span>
                <span className="font-semibold">{CALCULATION_TYPE_LABELS[currentCalculationType]}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {CALCULATION_TYPE_DESCRIPTIONS[currentCalculationType]}
              </p>
            </div>

            {/* Meta Mensual (Solo lectura) */}
            <div className="space-y-2">
              <Label>Meta Mensual del Hogar</Label>
              <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                <span className="text-sm text-muted-foreground">Meta actual:</span>
                <span className="font-semibold">{formatCurrency(currentGoal, currency)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Solo el propietario del hogar puede modificar estos valores
              </p>
            </div>
          </div>
        )}

        {/* Ingreso mensual personal - Todos los usuarios */}
        <form action={handleUpdateIncome} className="space-y-3">
          <input type="hidden" name="household_id" value={householdId} />
          <input type="hidden" name="user_id" value={userId} />
          <input
            type="hidden"
            name="effective_from"
            value={new Date().toISOString().split('T')[0]}
          />

          <div className="space-y-2">
            <Label htmlFor="monthly_income">Tu Ingreso Mensual Personal</Label>
            <div className="flex gap-2">
              <Input
                id="monthly_income"
                name="monthly_income"
                type="number"
                step="0.01"
                min="0"
                defaultValue={currentIncome}
                placeholder="2500.00"
                required
              />
              <Button type="submit" disabled={isLoadingIncome}>
                {isLoadingIncome ? 'Guardando...' : 'Actualizar'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Actual: {formatCurrency(currentIncome, currency)}
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
