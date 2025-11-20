import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { CheckCircle, TrendingDown, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { LoanBreakdown } from './LoanBreakdown';

interface MemberBalanceCardProps {
  member: {
    profile_id: string;
    display_name: string;
    avatar_url: string | null;
    role: 'owner' | 'member';
    current_balance: number;
    last_updated_at: string;
  };
}

export async function MemberBalanceCard({ member }: MemberBalanceCardProps) {
  const EPSILON = 0.01;
  const absBalance = Math.abs(member.current_balance);
  const isSettled = Math.abs(member.current_balance) < EPSILON;
  const isCredit = member.current_balance >= EPSILON;
  const isDebt = member.current_balance <= -EPSILON;

  // TODO: Implementar desglose de préstamos por miembro
  // Por ahora solo mostramos el balance sin desglose de préstamos
  const loanData = null;

  return (
    <Card
      className={cn(
        'transition-all hover:shadow-lg',
        isCredit && 'border-green-500/50',
        isDebt && 'border-red-500/50',
        isSettled && 'border-green-500/30',
      )}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={member.avatar_url || undefined} />
              <AvatarFallback>{member.display_name.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-lg">{member.display_name}</p>
              {member.role === 'owner' && (
                <Badge variant="secondary" className="mt-1">
                  Administrador
                </Badge>
              )}
            </div>
          </div>
          {isCredit && <TrendingUp className="h-6 w-6 text-green-600" />}
          {isDebt && <TrendingDown className="h-6 w-6 text-red-600" />}
          {isSettled && <CheckCircle className="h-6 w-6 text-green-600" />}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Balance Principal */}
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Balance Global:</p>
          <div className="flex items-baseline gap-2">
            <p
              className={cn(
                'text-3xl font-bold',
                isSettled && 'text-green-600',
                isDebt && 'text-red-600',
                isCredit && 'text-green-600',
              )}
            >
              {isSettled ? '€0.00' : `€${absBalance.toFixed(2)}`}
            </p>
            <Badge
              variant={isCredit ? 'default' : isDebt ? 'destructive' : 'secondary'}
              className={cn(isSettled && 'bg-green-600')}
            >
              {isCredit && 'Crédito a favor'}
              {isDebt && 'Deuda pendiente'}
              {isSettled && 'Al día'}
            </Badge>
          </div>
        </div>

        {/* TODO: Implementar desglose de préstamos por miembro */}
        {/* {loanData && loanData.net_debt !== 0 && (
          <LoanBreakdown
            loanExpenses={loanData.loan_expenses}
            loanRepayments={loanData.loan_repayments}
            netDebt={loanData.net_debt}
          />
        )} */}

        {/* Última actualización */}
        <div className="pt-3 border-t">
          <p className="text-xs text-muted-foreground">
            Última actualización:{' '}
            {new Date(member.last_updated_at).toLocaleDateString('es-ES', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>

        {/* Botón Ver Detalle */}
        <Link href={`/sickness/credito-deuda/miembro/${member.profile_id}`}>
          <Button variant="outline" className="w-full mt-4">
            Ver Historial Detallado
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
