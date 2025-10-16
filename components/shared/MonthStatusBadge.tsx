'use client';

import { Badge } from '@/components/ui/badge';
import { getPeriodStatusInfo } from '@/lib/periods';

interface MonthStatusBadgeProps {
  status?: string | null;
  phase?: string | null;
  className?: string;
}

export function MonthStatusBadge({ status, phase, className }: MonthStatusBadgeProps) {
  const statusInfo = getPeriodStatusInfo({ status, phase });

  return (
    <Badge variant={statusInfo.variant} className={className}>
      <span className="mr-1">{statusInfo.icon}</span>
      {statusInfo.label}
    </Badge>
  );
}
