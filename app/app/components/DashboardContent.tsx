'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MonthSelector } from '@/components/shared/MonthSelector';
import { AddMovementDialog } from '@/app/app/expenses/components/AddMovementDialog';
import { MovementsList } from '@/app/app/components/MovementsList';
import { formatCurrency } from '@/lib/format';
import { getMonthSummary, getMovements } from '@/app/app/expenses/actions';
import { toast } from 'sonner';

type Category = {
  id: string;
  name: string;
  icon: string | null;
  type: string;
};

type Movement = {
  id: string;
  type: 'expense' | 'income';
  amount: number;
  currency: string;
  note: string | null;
  occurred_at: string;
  created_at: string | null;
  categories: {
    id: string;
    name: string;
    icon: string | null;
  } | null;
};

interface DashboardContentProps {
  initialCategories: Category[];
  initialMovements: Movement[];
  initialSummary: {
    expenses: number;
    income: number;
    balance: number;
  };
}

export function DashboardContent({
  initialCategories,
  initialMovements,
  initialSummary,
}: DashboardContentProps) {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [summary, setSummary] = useState(initialSummary);
  const [movements, setMovements] = useState(initialMovements);
  const [isLoading, setIsLoading] = useState(false);

  const handleMonthChange = async (newDate: Date) => {
    setSelectedMonth(newDate);
    setIsLoading(true);

    try {
      const year = newDate.getFullYear();
      const month = newDate.getMonth() + 1;

      // Calcular rango de fechas del mes
      const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];

      const [summaryResult, movementsResult] = await Promise.all([
        getMonthSummary(year, month),
        getMovements({ startDate, endDate }),
      ]);

      if (summaryResult.ok) {
        setSummary(summaryResult.data || { expenses: 0, income: 0, balance: 0 });
      } else {
        toast.error('Error al cargar el resumen');
      }

      if (movementsResult.ok) {
        setMovements((movementsResult.data || []) as Movement[]);
      } else {
        toast.error('Error al cargar los movimientos');
      }
    } catch {
      toast.error('Error al cambiar de mes');
    } finally {
      setIsLoading(false);
    }
  };

  const expenseMovements = movements.filter((m) => m.type === 'expense');
  const incomeMovements = movements.filter((m) => m.type === 'income');

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Resumen de {selectedMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <MonthSelector value={selectedMonth} onChange={handleMonthChange} />
          {/* @ts-ignore - categories typing */}
          <AddMovementDialog categories={initialCategories} />
        </div>
      </div>

      {/* Resumen Financiero */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ingresos del Mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(summary?.income || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {incomeMovements.length} {incomeMovements.length === 1 ? 'ingreso' : 'ingresos'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Gastos del Mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(summary?.expenses || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {expenseMovements.length} {expenseMovements.length === 1 ? 'gasto' : 'gastos'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Balance del Mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(summary?.balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(summary?.balance || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {(summary?.balance || 0) >= 0 ? 'Superávit' : 'Déficit'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="income">Ingresos</TabsTrigger>
          <TabsTrigger value="expenses">Gastos</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Todos los Movimientos</CardTitle>
              <CardDescription>
                Historial completo de gastos e ingresos
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-muted-foreground text-center py-8">Cargando...</p>
              ) : (
                /* @ts-ignore - complex movements typing */
                <MovementsList movements={movements} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="income" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Ingresos</CardTitle>
              <CardDescription>
                Todos tus ingresos registrados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-muted-foreground text-center py-8">Cargando...</p>
              ) : (
                /* @ts-ignore - complex movements typing */
                <MovementsList movements={incomeMovements} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Gastos</CardTitle>
              <CardDescription>
                Todos tus gastos registrados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-muted-foreground text-center py-8">Cargando...</p>
              ) : (
                /* @ts-ignore - complex movements typing */
                <MovementsList movements={expenseMovements} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
