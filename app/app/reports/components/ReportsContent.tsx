'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendChart } from './TrendChart';
import { CategoryPieChart } from './CategoryPieChart';
import { ContributionsBarChart } from './ContributionsBarChart';
import { TopCategoriesTable } from './TopCategoriesTable';
import { BarChart3, PieChart, TrendingUp, Trophy } from 'lucide-react';

type TrendDataPoint = {
  month: string;
  monthLabel: string;
  expenses: number;
  income: number;
  net: number;
};

type CategoryData = {
  name: string;
  value: number;
  percentage: number;
  icon: string | null;
};

type ContributionData = {
  name: string;
  expected: number;
  paid: number;
  percentage: number;
};

type CategoryRanking = {
  name: string;
  icon: string | null;
  total: number;
  count: number;
  average: number;
};

type Props = {
  initialTrendData: TrendDataPoint[];
  initialExpenseDistribution: CategoryData[];
  initialIncomeDistribution: CategoryData[];
  initialContributions: ContributionData[];
  initialTopExpenses: CategoryRanking[];
  initialTopIncome: CategoryRanking[];
};

export function ReportsContent({
  initialTrendData,
  initialExpenseDistribution,
  initialIncomeDistribution,
  initialContributions,
  initialTopExpenses,
  initialTopIncome,
}: Props) {
  const [activeTab, setActiveTab] = useState('trend');

  return (
    <div className="space-y-6">
      {/* Tabs de navegación */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="trend" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Tendencia</span>
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-2">
            <PieChart className="h-4 w-4" />
            <span className="hidden sm:inline">Categorías</span>
          </TabsTrigger>
          <TabsTrigger value="contributions" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Contribuciones</span>
          </TabsTrigger>
          <TabsTrigger value="ranking" className="gap-2">
            <Trophy className="h-4 w-4" />
            <span className="hidden sm:inline">Ranking</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab: Tendencia Mensual */}
        <TabsContent value="trend" className="space-y-6">
          <TrendChart data={initialTrendData} />

          {/* Info card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Sobre este gráfico</p>
                  <p className="text-sm text-muted-foreground">
                    Muestra la evolución de tus gastos, ingresos y balance neto durante los últimos 12
                    meses. La línea punteada representa el balance neto (ingresos - gastos).
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Distribución por Categorías */}
        <TabsContent value="categories" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <CategoryPieChart
              data={initialExpenseDistribution}
              title="Gastos por Categoría"
              description="Distribución de gastos del mes actual"
            />
            <CategoryPieChart
              data={initialIncomeDistribution}
              title="Ingresos por Categoría"
              description="Distribución de ingresos del mes actual"
            />
          </div>

          {/* Info card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <PieChart className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Sobre estos gráficos</p>
                  <p className="text-sm text-muted-foreground">
                    Visualiza cómo se distribuyen tus gastos e ingresos entre diferentes categorías. Útil
                    para identificar en qué áreas gastas más y de dónde provienen tus ingresos.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Contribuciones */}
        <TabsContent value="contributions" className="space-y-6">
          <ContributionsBarChart data={initialContributions} />

          {/* Info card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <BarChart3 className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Sobre este gráfico</p>
                  <p className="text-sm text-muted-foreground">
                    Compara las contribuciones esperadas vs. pagadas de cada miembro del hogar para el mes
                    actual. El porcentaje indica qué proporción de la contribución esperada se ha completado.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Ranking de Categorías */}
        <TabsContent value="ranking" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <TopCategoriesTable data={initialTopExpenses} />
            <TopCategoriesTable data={initialTopIncome} />
          </div>

          {/* Info card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Trophy className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Sobre estos rankings</p>
                  <p className="text-sm text-muted-foreground">
                    Muestra las categorías más utilizadas en los últimos 6 meses, ordenadas por volumen
                    total. Incluye el número de transacciones y el promedio por transacción.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
