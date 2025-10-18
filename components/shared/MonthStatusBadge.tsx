'use client';

import { Badge } from '@/components/ui/badge';
import { getPeriodStatusInfo } from '@/lib/periods';

interface MonthStatusBadgeProps {
  // status legacy (sin uso); dejamos el prop opcional para compatibilidad de llamadas antiguas
  status?: string | null;
  phase?: string | null;
  className?: string;
}

export function MonthStatusBadge({ phase, className }: MonthStatusBadgeProps) {
  const statusInfo = getPeriodStatusInfo(phase);

  return (
    <Badge variant={statusInfo.variant} className={className}>
      <span className="mr-1">{statusInfo.icon}</span>
      {statusInfo.label}
    </Badge>
  );
}
