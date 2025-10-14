'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';
import { Home, Settings } from 'lucide-react';
import { useState } from 'react';
import MonthlyGoalConfigModal from './MonthlyGoalConfigModal';

interface HouseholdSummaryCardProps {
  monthlyGoal: number;
  spent: number;
  onGoalUpdated: (newGoal: number) => void;
}

export default function HouseholdSummaryCard({
  monthlyGoal,
  spent,
  onGoalUpdated,
}: HouseholdSummaryCardProps) {
  const [showConfigModal, setShowConfigModal] = useState(false);

  return (
    <>
      <Card className="animate-in fade-in-0 duration-700 slide-in-from-bottom-8 delay-1000">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Home className="h-4 w-4" />
              Resumen del Hogar
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowConfigModal(true)}
              className="h-8 w-8 p-0"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-green-600">{formatCurrency(monthlyGoal)}</div>
              <p className="text-xs text-muted-foreground">Objetivo mensual</p>
              {monthlyGoal === 0 && <p className="text-xs text-orange-600 mt-1">Sin configurar</p>}
            </div>
            <div>
              <div className="text-lg font-bold text-blue-600">{formatCurrency(spent)}</div>
              <p className="text-xs text-muted-foreground">Gastado hasta ahora</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <MonthlyGoalConfigModal
        open={showConfigModal}
        onOpenChange={setShowConfigModal}
        currentGoal={monthlyGoal || null}
        onGoalUpdated={onGoalUpdated}
      />
    </>
  );
}
