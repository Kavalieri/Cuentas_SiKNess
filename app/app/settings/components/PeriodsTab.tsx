'use client';

import type { ContributionPeriod } from '@/app/app/settings/periods-actions';
import {
  getContributionPeriods,
  getOrCreateCurrentPeriod,
  isOwnerOfActiveHousehold,
} from '@/app/app/settings/periods-actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PeriodsManagement } from './PeriodsManagement';

interface PeriodsTabProps {
  userId: string;
}

export function PeriodsTab({ userId: _userId }: PeriodsTabProps) {
  const [periods, setPeriods] = useState<ContributionPeriod[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState<ContributionPeriod | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        // Verificar ownership
        const ownerCheck = await isOwnerOfActiveHousehold();
        setIsOwner(ownerCheck);

        if (!ownerCheck) {
          setLoading(false);
          return;
        }

        // Cargar períodos
        const periodsResult = await getContributionPeriods();
        if (!periodsResult.ok) {
          setError(periodsResult.message);
          setLoading(false);
          return;
        }

        setPeriods(periodsResult.data || []);

        // Obtener/crear período actual
        const currentResult = await getOrCreateCurrentPeriod();
        if (currentResult.ok) {
          setCurrentPeriod(currentResult.data || null);
        }

        setLoading(false);
      } catch {
        setError('Error al cargar los datos de períodos');
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Períodos</CardTitle>
          <CardDescription>Cargando información de períodos...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Error al cargar períodos
          </CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return <PeriodsManagement periods={periods} currentPeriod={currentPeriod} isOwner={isOwner} />;
}
