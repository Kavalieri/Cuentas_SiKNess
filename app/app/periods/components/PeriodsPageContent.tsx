'use client';

import { useState } from 'react';
import { MonthlyPeriodCard } from '@/components/shared/MonthlyPeriodCard';
import { PendingPeriodsAlert } from '@/components/shared/PendingPeriodsAlert';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { MonthlyPeriod } from '@/lib/periods';
import { Calendar, TrendingUp, Lock } from 'lucide-react';
import Link from 'next/link';

interface PeriodsPageContentProps {
  initialPeriods: MonthlyPeriod[];
  initialPendingPeriods: MonthlyPeriod[];
}

export function PeriodsPageContent({
  initialPeriods,
  initialPendingPeriods,
}: PeriodsPageContentProps) {
  const [periods] = useState(initialPeriods);
  const [pendingPeriods] = useState(initialPendingPeriods);

  // Filtrar por estado
  const openPeriods = periods.filter((p) => p.status === 'open');
  const pendingClosePeriods = periods.filter((p) => p.status === 'pending_close');
  const closedPeriods = periods.filter((p) => p.status === 'closed');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Períodos Mensuales</h1>
          <p className="text-muted-foreground">
            Gestiona el cierre de meses y visualiza el historial contable
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/app">
            <Calendar className="mr-2 h-4 w-4" />
            Ir al Dashboard
          </Link>
        </Button>
      </div>

      {/* Alerta de períodos pendientes */}
      {pendingPeriods.length > 0 && <PendingPeriodsAlert periods={pendingPeriods} />}

      {/* Tabs por estado */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">
            Todos ({periods.length})
          </TabsTrigger>
          <TabsTrigger value="open">
            <TrendingUp className="mr-2 h-4 w-4" />
            Abiertos ({openPeriods.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pendientes ({pendingClosePeriods.length})
          </TabsTrigger>
          <TabsTrigger value="closed">
            <Lock className="mr-2 h-4 w-4" />
            Cerrados ({closedPeriods.length})
          </TabsTrigger>
        </TabsList>

        {/* Todos los períodos */}
        <TabsContent value="all" className="space-y-4">
          {periods.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No hay períodos registrados aún</p>
              <p className="text-sm">Los períodos se crean automáticamente al registrar movimientos</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {periods.map((period) => (
                <Link key={period.id} href={`/app/periods/${period.id}`}>
                  <MonthlyPeriodCard period={period} />
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Períodos abiertos */}
        <TabsContent value="open" className="space-y-4">
          {openPeriods.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <TrendingUp className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No hay períodos abiertos</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {openPeriods.map((period) => (
                <Link key={period.id} href={`/app/periods/${period.id}`}>
                  <MonthlyPeriodCard period={period} />
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Períodos pendientes de cerrar */}
        <TabsContent value="pending" className="space-y-4">
          {pendingClosePeriods.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No hay períodos pendientes de cerrar</p>
              <p className="text-sm">¡Todo está al día!</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pendingClosePeriods.map((period) => (
                <Link key={period.id} href={`/app/periods/${period.id}`}>
                  <MonthlyPeriodCard period={period} />
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Períodos cerrados */}
        <TabsContent value="closed" className="space-y-4">
          {closedPeriods.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Lock className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No hay períodos cerrados aún</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {closedPeriods.map((period) => (
                <Link key={period.id} href={`/app/periods/${period.id}`}>
                  <MonthlyPeriodCard period={period} />
                </Link>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
