'use client';

import { Button } from '@/components/ui/button';
import { BreadcrumbNav } from '@/components/shared/navigation/BreadcrumbNav';
import { Plus, FileText } from 'lucide-react';

interface AdjustmentsHeaderProps {
  isOwner: boolean;
  onAddClick: () => void;
  totalCount: number;
}

export function AdjustmentsHeader({
  isOwner,
  onAddClick,
  totalCount,
}: AdjustmentsHeaderProps) {
  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <BreadcrumbNav
        items={[
          { label: 'Contribuciones', href: '/app/contributions' },
          { label: 'Ajustes', href: '/app/contributions/adjustments' },
        ]}
      />

      {/* Header con título y acciones */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Ajustes de Contribuciones
          </h1>
          <p className="text-sm text-muted-foreground">
            {isOwner
              ? `${totalCount} ajustes en el hogar`
              : `${totalCount} ajustes personales`}
          </p>
        </div>

        <Button onClick={onAddClick} className="sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Ajuste
        </Button>
      </div>
    </div>
  );
}
