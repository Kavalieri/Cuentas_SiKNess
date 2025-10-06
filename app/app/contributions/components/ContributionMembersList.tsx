'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/format';
import { Users, CheckCircle2, Clock, AlertCircle, TrendingDown } from 'lucide-react';

type Member = {
  profile_id: string;
  email: string;
  income: number | null; // NULL si no está configurado
  contribution: {
    id: string;
    expected_amount: number | null; // NULL si income no configurado
    paid_amount: number;
    adjustments_total: number | null;
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
  const getStatusBadge = (contribution: Member['contribution']) => {
    // Si expected_amount es NULL, el miembro NO ha configurado sus ingresos
    if (!contribution || contribution.expected_amount === null) {
      return (
        <Badge variant="outline" className="border-orange-500 text-orange-700">
          <AlertCircle className="mr-1 h-3 w-3" />
          Sin configurar
        </Badge>
      );
    }

    const status = contribution.status;
    
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
          <Badge variant="default" className="bg-green-600 hover:bg-green-700">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Aporte Extra
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
            Sin estado
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
          const contribution = member.contribution;
          
          // Si el miembro NO ha configurado sus ingresos
          const isNotConfigured = member.income === null || 
                                  !contribution || 
                                  contribution.expected_amount === null;
          
          const percentage = !isNotConfigured && totalIncome > 0 
            ? ((member.income || 0) / totalIncome) * 100 
            : 0;
          
          const hasAdjustments = contribution && (contribution.adjustments_total || 0) !== 0;
          
          // expected_amount YA incluye adjustments_total
          const remainingAmount = contribution && contribution.expected_amount !== null
            ? contribution.expected_amount - (contribution.paid_amount || 0)
            : 0;

          return (
            <Card key={member.profile_id} className="border-muted">
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="font-medium flex items-center gap-2">
                      👤 {member.email}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Ingreso mensual: {isNotConfigured ? 'Sin configurar' : formatCurrency(member.income || 0, currency)}
                    </p>
                  </div>
                  {getStatusBadge(contribution)}
                </div>

                {isNotConfigured ? (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Este miembro debe configurar sus ingresos en la pestaña <strong>&ldquo;Configuración&rdquo;</strong> antes de calcular su contribución.
                    </p>
                  </div>
                ) : contribution ? (
                  <div className="space-y-1 pt-2 border-t">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Contribución base:</span>
                      <span className="font-semibold">
                        {formatCurrency((contribution.expected_amount || 0) - (contribution.adjustments_total || 0), currency)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Porcentaje:</span>
                      <span className="font-semibold">{percentage.toFixed(1)}%</span>
                    </div>
                    
                    {hasAdjustments && (
                      <div className={`flex justify-between text-sm ${
                        (contribution.adjustments_total || 0) < 0 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        <span className="flex items-center gap-1">
                          <TrendingDown className="h-3 w-3" />
                          Ajustes:
                        </span>
                        <span className="font-semibold">
                          {(contribution.adjustments_total || 0) < 0 ? '' : '+'}
                          {formatCurrency(contribution.adjustments_total || 0, currency)}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between text-base font-bold pt-2 border-t">
                      <span>Total esperado:</span>
                      <span>
                        {formatCurrency(contribution.expected_amount || 0, currency)}
                      </span>
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
                      <div className="flex justify-between text-base font-bold pt-2 border-t text-orange-600 dark:text-orange-400">
                        <span>Pendiente:</span>
                        <span>
                          {formatCurrency(remainingAmount, currency)}
                        </span>
                      </div>
                    )}

                    {remainingAmount < 0 && (
                      <div className="flex justify-between text-base font-bold pt-2 border-t text-green-600 dark:text-green-400">
                        <span>Aporte extra:</span>
                        <span>
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
