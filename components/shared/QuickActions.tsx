'use client';

import { Button } from '@/components/ui/button';
import { BarChart3, PiggyBank, Plus, Receipt } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function QuickActions() {
  const router = useRouter();

  const actions = [
    {
      icon: Plus,
      label: 'Nuevo Gasto',
      description: 'Registrar un gasto',
      onClick: () => router.push('/mobile/transactions/new?type=expense'),
    },
    {
      icon: Receipt,
      label: 'Nuevo Ingreso',
      description: 'Registrar un ingreso',
      onClick: () => router.push('/mobile/transactions/new?type=income'),
    },
    {
      icon: PiggyBank,
      label: 'Aportación',
      description: 'Registrar aportación',
      onClick: () => router.push('/mobile/contributions/new'),
    },
    {
      icon: BarChart3,
      label: 'Reportes',
      description: 'Ver estadísticas',
      onClick: () => router.push('/mobile/reports'),
    },
  ];

  return (
    <div className="bg-card rounded-lg p-6 shadow-sm border">
      <h2 className="text-lg font-semibold mb-4">Acciones Rápidas</h2>

      <div className="grid grid-cols-2 gap-3">
        {actions.map((action, index) => (
          <Button
            key={index}
            variant="outline"
            className="h-auto p-4 flex flex-col items-center gap-2"
            onClick={action.onClick}
          >
            <action.icon className="h-6 w-6" />
            <div className="text-center">
              <div className="font-medium text-sm">{action.label}</div>
              <div className="text-xs text-muted-foreground">{action.description}</div>
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
}
