'use client';

import { Badge } from '@/components/ui/badge';
import { BreadcrumbNav } from '@/components/shared/navigation/BreadcrumbNav';
import { Coins } from 'lucide-react';
import { formatCurrency } from '@/lib/format';

interface CreditsHeaderProps {
  totalActive: number;
  currency: string;
}

export function CreditsHeader({ totalActive, currency }: CreditsHeaderProps) {
  const hasActiveCredits = totalActive > 0;

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <BreadcrumbNav
        items={[
          { label: 'Contribuciones', href: '/app/contributions' },
          { label: 'Créditos', href: '/app/contributions/credits' },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Coins className="h-6 w-6" />
            Mis Créditos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Créditos disponibles por sobrepagas en contribuciones
          </p>
        </div>

        {hasActiveCredits && (
          <Badge variant="default" className="text-lg px-4 py-2 w-fit">
            {formatCurrency(totalActive, currency)}
          </Badge>
        )}
      </div>

      {/* Info card */}
      <div className="bg-muted/50 p-4 rounded-lg border">
        <p className="text-sm font-medium mb-2">💡 ¿Cómo funcionan los créditos?</p>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside ml-2">
          <li>Se generan automáticamente cuando pagas más de lo esperado</li>
          <li>Puedes aplicarlos manualmente a contribuciones futuras</li>
          <li>También puedes activar la auto-aplicación automática</li>
          <li>O transferirlos al fondo de ahorros del hogar</li>
        </ul>
      </div>
    </div>
  );
}
