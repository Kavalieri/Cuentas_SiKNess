'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/format';
import { Users, CheckCircle2, Clock, AlertCircle, TrendingDown } from 'lucide-react';

type Member = {
  user_id: string;
  email: string;
  income: number;
  contribution: {
    id: string;
    expected_amount: number;
    paid_amount: number;
    pre_payment_amount: number;
    status: string;
  } | null;
};

type ContributionMembersListProps = {
  members: Member[];
  totalIncome: number;
  currency?: string;
};

export function ContributionMembersList({
  members,
  totalIncome,
  currency = 'EUR',
}: ContributionMembersListProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <Badge variant="default" className="bg-green-600">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Pagado
          </Badge>
        );
      case 'overpaid':
        return (
          <Badge variant="destructive">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Sobrepagado
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary">
            <Clock className="mr-1 h-3 w-3" />
            Pendiente
          </Badge>
        );
      case 'partial':
        return (
          <Badge variant="outline" className="border-orange-500 text-orange-700">
            <AlertCircle className="mr-1 h-3 w-3" />
            Parcial
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <AlertCircle className="mr-1 h-3 w-3" />
            Sin configurar
          </Badge>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Contribuciones por Miembro
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {members.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No hay miembros configurados en el hogar
          </p>
        )}

        {members.map((member) => {
          const percentage = totalIncome > 0 ? (member.income / totalIncome) * 100 : 0;
          const contribution = member.contribution;
          const hasPrePayments = contribution && (contribution.pre_payment_amount || 0) > 0;
          const adjustedAmount = contribution
            ? contribution.expected_amount - (contribution.pre_payment_amount || 0)
            : 0;
          const remainingAmount = contribution
            ? adjustedAmount - (contribution.paid_amount || 0)
            : 0;

          return (
            <Card key={member.user_id} className="border-muted">
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="font-medium flex items-center gap-2">
                      👤 {member.email}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Ingreso mensual: {formatCurrency(member.income, currency)}
                    </p>
                  </div>
                  {contribution && getStatusBadge(contribution.status)}
                </div>

                {contribution ? (
                  <div className="space-y-1 pt-2 border-t">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Contribución base:</span>
                      <span className="font-semibold">
                        {formatCurrency(contribution.expected_amount, currency)}
                      </span>
                    </div>
                    
                    {hasPrePayments && (
                      <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                        <span className="flex items-center gap-1">
                          <TrendingDown className="h-3 w-3" />
                          Pre-pagos:
                        </span>
                        <span className="font-semibold">
                          -{formatCurrency(contribution.pre_payment_amount, currency)}
                        </span>
                      </div>
                    )}

                    {hasPrePayments && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground font-medium">Monto ajustado:</span>
                        <span className="font-bold">
                          {formatCurrency(adjustedAmount, currency)}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Porcentaje:</span>
                      <span className="font-semibold">{percentage.toFixed(1)}%</span>
                    </div>
                    
                    {contribution.paid_amount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Pagado:</span>
                        <span className="font-semibold text-green-600 dark:text-green-400">
                          {formatCurrency(contribution.paid_amount, currency)}
                        </span>
                      </div>
                    )}

                    {remainingAmount > 0 && (
                      <div className="flex justify-between text-sm pt-1 border-t">
                        <span className="text-muted-foreground font-medium">Pendiente:</span>
                        <span className="font-bold text-orange-600 dark:text-orange-400">
                          {formatCurrency(remainingAmount, currency)}
                        </span>
                      </div>
                    )}

                    {remainingAmount < 0 && (
                      <div className="flex justify-between text-sm pt-1 border-t">
                        <span className="text-muted-foreground font-medium">Excedente:</span>
                        <span className="font-bold text-orange-600 dark:text-orange-400">
                          +{formatCurrency(Math.abs(remainingAmount), currency)}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground pt-2 border-t">
                    Sin contribución calculada para este mes
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </CardContent>
    </Card>
  );
}
