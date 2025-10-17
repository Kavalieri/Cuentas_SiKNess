'use client';

import { useSiKness } from '@/contexts/SiKnessContext';
import { useEffect, useState } from 'react';

type Balance = {
  fondo_comun: number;
};

export function useBalance() {
  const { balance, refreshBalance, activePeriod } = useSiKness();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Balance | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!activePeriod) return;
      setLoading(true);
      try {
        await refreshBalance();
        // El contexto ya actualiza balance; construimos vista simple si existe
        if (!cancelled && balance) {
          setData({ fondo_comun: balance.closing });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePeriod?.id]);

  // Si hay datos previos en contexto, preferirlos
  useEffect(() => {
    if (balance) {
      setData({ fondo_comun: balance.closing });
    }
  }, [balance]);

  return { balance: data, loading };
}

export default useBalance;
