'use client';

import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/data-display/EmptyState';
import { CreditItem } from './CreditItem';
import { StatCard } from '@/components/shared/data-display/StatCard';
import { CheckCircle2, Clock } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import type { MemberCredit, CreditsSummary } from '@/lib/actions/credits';

interface CreditsListProps {
  credits: MemberCredit[];
  summary: CreditsSummary | null;
  currency: string;
  onManageCredit: (credit: MemberCredit) => void;
}

export function CreditsList({
  credits,
  summary,
  currency,
  onManageCredit,
}: CreditsListProps) {
  const hasActiveCredits = credits.length > 0;

  return (
    <div className="space-y-6">
      {/* Resumen */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-2">
          <StatCard
            title="Activos"
            value={formatCurrency(summary.active.total_amount, currency)}
            icon={<CheckCircle2 className="h-4 w-4" />}
            variant="success"
            subtitle={`${summary.active.count} ${summary.active.count === 1 ? 'crédito' : 'créditos'}`}
          />
          <StatCard
            title="Aplicados"
            value={formatCurrency(summary.applied.total_amount, currency)}
            icon={<Clock className="h-4 w-4" />}
            variant="default"
            subtitle={`${summary.applied.count} ${summary.applied.count === 1 ? 'aplicado' : 'aplicados'}`}
          />
        </div>
      )}

      {/* Lista de créditos activos */}
      <Card>
        <CardContent className="p-6">
          {hasActiveCredits ? (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Créditos disponibles:
              </h3>
              <div className="space-y-3">
                {credits.map((credit) => (
                  <CreditItem
                    key={credit.id}
                    credit={credit}
                    currency={currency}
                    onManage={() => onManageCredit(credit)}
                  />
                ))}
              </div>
            </div>
          ) : (
            <EmptyState
              title="No tienes créditos activos"
              description="Los créditos se generan cuando pagas más de lo esperado en tus contribuciones"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
