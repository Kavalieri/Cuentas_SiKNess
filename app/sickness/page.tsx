'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSiKness } from '@/contexts/SiKnessContext';
import {
  AlertCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  Calendar,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';

const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

export default function SiKnessDashboard() {
  const { activePeriod, balance, privacyMode } = useSiKness();

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || amount === null) return '---';
    if (privacyMode) return '***';
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const periodName = activePeriod
    ? `${MONTHS[activePeriod.month - 1]} ${activePeriod.year}`
    : 'Sin período activo';

  // Calcular diferencia entre balance final e inicial
  const balanceDifference = (balance?.closing || 0) - (balance?.opening || 0);
  const isPositive = balanceDifference >= 0;

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header con nombre del periodo */}
      <div className="flex items-center gap-2 text-muted-foreground">
        <Calendar className="h-4 w-4" />
        <span className="text-sm font-medium">Período: {periodName}</span>
      </div>
      <div>
        {/* Balance Actual - PROMINENTE */}
        <Card className="md:col-span-2 lg:col-span-2 border-2 border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wallet className="h-5 w-5 text-primary" />
              Balance Actual
            </CardTitle>
            <CardDescription>Saldo disponible en cuenta común</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-4xl font-bold tracking-tight">
                {formatCurrency(balance?.closing || 0)}
              </div>
              <div className="flex items-center gap-2 text-sm">
                {isPositive ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <span className={isPositive ? 'text-green-600' : 'text-red-600'}>
                  {isPositive ? '+' : ''}
                  {formatCurrency(balanceDifference)}
                </span>
                <span className="text-muted-foreground">desde apertura</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Balance Inicial */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ArrowUpCircle className="h-4 w-4 text-blue-500" />
              Balance Inicial
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(balance?.opening || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">Apertura del período</p>
          </CardContent>
        </Card>

        {/* Balance Final */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ArrowDownCircle className="h-4 w-4 text-purple-500" />
              Balance Final
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(balance?.closing || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">Cierre proyectado</p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {/* Ingresos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Ingresos del Período
            </CardTitle>
            <CardDescription>Total de entradas de dinero</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {formatCurrency(balance?.income || 0)}
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Aportaciones</span>
                <span className="font-medium">{formatCurrency(balance?.income || 0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Gastos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingDown className="h-5 w-5 text-red-500" />
              Gastos del Período
            </CardTitle>
            <CardDescription>Total de salidas de dinero</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {formatCurrency(balance?.expenses || 0)}
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Gastos comunes</span>
                <span className="font-medium">{formatCurrency(balance?.expenses || 0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tercera fila: Gastos directos y Contribuciones pendientes */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Gastos Directos Pendientes */}
        <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20 dark:border-orange-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wallet className="h-5 w-5 text-orange-500" />
              Gastos Directos
            </CardTitle>
            <CardDescription>Gastos pagados de bolsillo por miembros</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {formatCurrency(balance?.directExpenses || 0)}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Estos gastos se descontarán de las aportaciones individuales
            </p>
          </CardContent>
        </Card>

        {/* Contribuciones Pendientes */}
        <Card className="border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20 dark:border-yellow-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              Contribuciones Pendientes
            </CardTitle>
            <CardDescription>Aportaciones aún no realizadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              {formatCurrency(balance?.pendingContributions || 0)}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Total esperado menos lo ya aportado al fondo común
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Resumen final */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen del Período</CardTitle>
          <CardDescription>Estado financiero consolidado</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="font-medium">Balance inicial</span>
              <span className="text-lg">{formatCurrency(balance?.opening || 0)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b text-green-600">
              <span className="font-medium">+ Ingresos</span>
              <span className="text-lg">{formatCurrency(balance?.income || 0)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b text-red-600">
              <span className="font-medium">- Gastos</span>
              <span className="text-lg">{formatCurrency(balance?.expenses || 0)}</span>
            </div>
            <div className="flex justify-between items-center py-3 bg-primary/5 px-3 rounded-lg">
              <span className="font-bold text-lg">Balance actual</span>
              <span className="text-2xl font-bold">{formatCurrency(balance?.closing || 0)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
