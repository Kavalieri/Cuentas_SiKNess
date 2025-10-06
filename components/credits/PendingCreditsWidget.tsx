'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MonthlyDecisionModal } from '@/components/credits/MonthlyDecisionModal';
import { getPendingCredits, getCurrentContribution } from '@/app/app/credits/actions';
import { formatCurrency } from '@/lib/format';
import { AlertCircle, CreditCard, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface PendingCreditsWidgetProps {
  onRefresh?: () => void;
}

export function PendingCreditsWidget({ onRefresh }: PendingCreditsWidgetProps) {
  const [credits, setCredits] = useState<
    Array<{
      id: string;
      amount: number;
      currency: string;
      source_month: number;
      source_year: number;
      status: string;
      monthly_decision: string | null;
    }>
  >([]);
  const [selectedCredit, setSelectedCredit] = useState<typeof credits[0] | null>(null);
  const [currentContribution, setCurrentContribution] = useState<{
    expected_amount: number;
    paid_amount: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCredits();
  }, []);

  const loadCredits = async () => {
    setLoading(true);
    const result = await getPendingCredits();

    if (result.ok) {
      setCredits(result.data || []);
    } else {
      toast.error('Error al cargar créditos: ' + result.message);
    }
    setLoading(false);
  };

  const handleCreditClick = async (credit: typeof credits[0]) => {
    // Cargar contribución actual
    const now = new Date();
    const contributionResult = await getCurrentContribution(
      now.getFullYear(),
      now.getMonth() + 1
    );

    if (contributionResult.ok) {
      setCurrentContribution(contributionResult.data || null);
    }

    setSelectedCredit(credit);
  };

  const handleSuccess = () => {
    loadCredits();
    onRefresh?.();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (credits.length === 0) {
    return null; // No mostrar nada si no hay créditos
  }

  return (
    <>
      <Card className="border-orange-200 dark:border-orange-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              <CardTitle className="text-base">Créditos Pendientes de Decisión</CardTitle>
            </div>
            <Badge variant="secondary">{credits.length}</Badge>
          </div>
          <CardDescription>
            Tienes créditos activos. Decide qué hacer con ellos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {credits.map((credit) => (
              <button
                key={credit.id}
                onClick={() => handleCreditClick(credit)}
                className="w-full flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-2">
                    <CreditCard className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {formatCurrency(credit.amount, credit.currency)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Del {credit.source_month}/{credit.source_year}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedCredit && (
        <MonthlyDecisionModal
          isOpen={!!selectedCredit}
          onClose={() => {
            setSelectedCredit(null);
            setCurrentContribution(null);
          }}
          credit={selectedCredit}
          currentContribution={currentContribution}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
}
