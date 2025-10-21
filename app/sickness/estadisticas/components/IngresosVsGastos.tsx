'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface IncomeVsExpense {
  month: string;
  income: number;
  expense: number;
}

interface IngresosVsGastosProps {
  title?: string;
  data: IncomeVsExpense[];
  isLoading?: boolean;
}

export function IngresosVsGastos({
  title = 'Ingresos vs Gastos',
  data,
  isLoading = false,
}: IngresosVsGastosProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            Cargando...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            Sin datos de ingresos/gastos
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip formatter={(value: number) => `€${value.toFixed(2)}`} />
            <Legend />
            <Bar dataKey="income" fill="#10b981" name="Ingresos" />
            <Bar dataKey="expense" fill="#ef4444" name="Gastos" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
