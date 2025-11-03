'use client';

import { useSiKness } from '@/contexts/SiKnessContext';
import { Suspense } from 'react';
import { AdvancedQueries } from './AdvancedQueries';

export default function AnalyticsPage() {
  const { householdId, periods, selectedPeriod } = useSiKness();

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">📊 Análisis Avanzado</h1>
          <p className="mt-2 text-muted-foreground">
            Consultas SQL avanzadas y exportación de datos
          </p>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]" />
              <p className="text-muted-foreground">Cargando consultas...</p>
            </div>
          </div>
        }
      >
        <AdvancedQueries
          householdId={householdId || ''}
          periods={periods}
          selectedPeriod={selectedPeriod || null}
        />
      </Suspense>
    </div>
  );
}
