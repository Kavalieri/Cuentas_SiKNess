'use client';

import { useSiKness } from '@/contexts/SiKnessContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Home, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Receipt 
} from 'lucide-react';

export default function SiKnessDashboard() {
  const { householdId, activePeriod, balance, isOwner, privacyMode } = useSiKness();

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || amount === null) return '---';
    if (privacyMode) return '***';
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatPeriod = () => {
    if (!activePeriod) return 'Sin período seleccionado';
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return `${monthNames[activePeriod.month - 1]} ${activePeriod.year}`;
  };

  if (!householdId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Home className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Bienvenido a SiKNess</h2>
        <p className="text-muted-foreground mb-6">
          Selecciona un hogar para comenzar a gestionar tus finanzas compartidas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con información del período */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            {formatPeriod()} · {isOwner ? 'Owner' : 'Miembro'}
          </p>
        </div>
        {activePeriod && (
          <Button variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            Gestionar Período
          </Button>
        )}
      </div>

      {/* Cards de resumen de balance */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance Apertura</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(balance?.opening)}</div>
            <p className="text-xs text-muted-foreground">
              Al inicio del período
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(balance?.income)}
            </div>
            <p className="text-xs text-muted-foreground">
              Durante el período
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos Totales</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(balance?.expenses)}
            </div>
            <p className="text-xs text-muted-foreground">
              Durante el período
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance Cierre</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(balance?.closing)}</div>
            <p className="text-xs text-muted-foreground">
              Al final del período
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Acciones rápidas */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones Rápidas</CardTitle>
          <CardDescription>
            Gestiona tu hogar y tus finanzas compartidas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Button variant="outline" className="h-20 flex-col">
              <Users className="h-8 w-8 mb-2" />
              Gestionar Hogar
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <Calendar className="h-8 w-8 mb-2" />
              Ver Períodos
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <Receipt className="h-8 w-8 mb-2" />
              Transacciones
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Últimas transacciones (placeholder) */}
      <Card>
        <CardHeader>
          <CardTitle>Últimas Transacciones</CardTitle>
          <CardDescription>
            Actividad reciente en tu cuenta compartida
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <Receipt className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">Transacción #{i}</p>
                    <p className="text-sm text-muted-foreground">Hace {i} días</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">
                    {privacyMode ? '***' : `${50 * i} €`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {i % 2 === 0 ? 'Ingreso' : 'Gasto'}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <Button variant="outline" className="w-full mt-4">
            Ver Todas las Transacciones
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
