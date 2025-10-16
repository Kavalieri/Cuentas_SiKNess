import { Badge } from '@/components/ui/badge';
import { query } from '@/lib/db';
import type { MonthlyPeriod } from '@/lib/periods';

interface PeriodStatusProps {
  householdId: string;
}

async function getCurrentPeriod(householdId: string): Promise<MonthlyPeriod | null> {
  const result = await query<MonthlyPeriod>(
    'SELECT * FROM monthly_periods WHERE household_id = $1 ORDER BY year DESC, month DESC LIMIT 1',
    [householdId],
  );

  return result.rows[0] || null;
}

function getPeriodStatusBadge(status: string) {
  const statusConfig = {
    active: { label: 'Activo', variant: 'default' as const },
    preparing: { label: 'Preparando', variant: 'secondary' as const },
    validation: { label: 'Validación', variant: 'outline' as const },
    closing: { label: 'Cerrando', variant: 'destructive' as const },
    closed: { label: 'Cerrado', variant: 'secondary' as const },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export async function PeriodStatus({ householdId }: PeriodStatusProps) {
  const period = await getCurrentPeriod(householdId);

  if (!period) {
    return (
      <div className="bg-card rounded-lg p-4 shadow-sm border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">Período Actual</h3>
            <p className="text-sm text-muted-foreground">No hay período activo</p>
          </div>
          <Badge variant="outline">Sin período</Badge>
        </div>
      </div>
    );
  }

  const monthNames = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];

  return (
    <div className="bg-card rounded-lg p-4 shadow-sm border">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Período Actual</h3>
          <p className="text-sm text-muted-foreground">
            {monthNames[period.month - 1]} {period.year}
          </p>
        </div>
        {getPeriodStatusBadge(period.status)}
      </div>
    </div>
  );
}
