'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { CreditsHeader } from './CreditsHeader';
import { CreditsList } from './CreditsList';
import { ManageCreditDialog } from '@/app/app/contributions/components/ManageCreditDialog';
import { LoadingState } from '@/components/shared/data-display/LoadingState';
import { getActiveCredits, getCreditsSummary } from '@/lib/actions/credits';
import type { MemberCredit, CreditsSummary } from '@/lib/actions/credits';

interface CreditsContentProps {
  currentUserProfileId: string;
  isOwner: boolean;
  currency: string;
}

export function CreditsContent({
  currentUserProfileId, // eslint-disable-line @typescript-eslint/no-unused-vars
  isOwner, // eslint-disable-line @typescript-eslint/no-unused-vars
  currency,
}: CreditsContentProps) {
  const [credits, setCredits] = useState<MemberCredit[]>([]);
  const [summary, setSummary] = useState<CreditsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCredit, setSelectedCredit] = useState<MemberCredit | null>(null);
  const [showManageDialog, setShowManageDialog] = useState(false);

  const loadCredits = async () => {
    setLoading(true);

    // Cargar créditos activos
    const creditsResult = await getActiveCredits();
    if (creditsResult.ok && creditsResult.data) {
      setCredits(creditsResult.data);
    } else if (!creditsResult.ok) {
      toast.error(creditsResult.message || 'Error al cargar créditos');
    }

    // Cargar resumen
    const summaryResult = await getCreditsSummary();
    if (summaryResult.ok && summaryResult.data) {
      setSummary(summaryResult.data);
    } else if (!summaryResult.ok) {
      toast.error(summaryResult.message || 'Error al cargar resumen');
    }

    setLoading(false);
  };

  useEffect(() => {
    void loadCredits();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleManageCredit = (credit: MemberCredit) => {
    setSelectedCredit(credit);
    setShowManageDialog(true);
  };

  const handleCreditUpdated = () => {
    setShowManageDialog(false);
    setSelectedCredit(null);
    void loadCredits();
  };

  if (loading) {
    return <LoadingState message="Cargando créditos..." />;
  }

  const totalActive = summary?.active.total_amount || 0;

  return (
    <>
      <CreditsHeader totalActive={totalActive} currency={currency} />
      
      <CreditsList
        credits={credits}
        summary={summary}
        currency={currency}
        onManageCredit={handleManageCredit}
      />

      {selectedCredit && (
        <ManageCreditDialog
          credit={selectedCredit}
          open={showManageDialog}
          onOpenChange={setShowManageDialog}
          onSuccess={handleCreditUpdated}
        />
      )}
    </>
  );
}
