import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';
import { FileCheck, TrendingDown, TrendingUp } from 'lucide-react';

interface LoanBreakdownProps {
  loanExpenses: number;
  loanRepayments: number;
  netDebt: number;
}

export function LoanBreakdown({ loanExpenses, loanRepayments, netDebt }: LoanBreakdownProps) {
  const hasLoanActivity = loanExpenses > 0 || loanRepayments > 0;

  if (!hasLoanActivity) {
    return null;
  }

  return (
    <Card className="border-blue-500/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileCheck className="h-4 w-4" />
          Préstamos del Hogar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground mb-1">Préstamos Recibidos</p>
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              <p className="font-semibold text-red-600">{formatCurrency(loanExpenses)}</p>
            </div>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">Devoluciones Hechas</p>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <p className="font-semibold text-green-600">{formatCurrency(loanRepayments)}</p>
            </div>
          </div>
        </div>
        <div className="pt-3 border-t">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Deuda Neta:</p>
            <div className="flex items-center gap-2">
              <p
                className={`text-lg font-bold ${
                  netDebt > 0.01 ? 'text-red-600' : 'text-green-600'
                }`}
              >
                {formatCurrency(Math.abs(netDebt))}
              </p>
              <Badge variant={netDebt > 0.01 ? 'destructive' : 'secondary'}>
                {netDebt > 0.01 ? 'Deuda' : 'Liquidado'}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
