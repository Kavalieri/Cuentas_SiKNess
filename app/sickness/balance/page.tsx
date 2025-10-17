
'use client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSiKness } from '@/contexts/SiKnessContext';
import {
    AlertCircle,
    ArrowDownCircle,
    ArrowUpCircle,
    Calendar,
    Info,
    TrendingDown,
    TrendingUp,
    Wallet
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { ContributionsDisplay } from './ContributionsDisplay';

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

const RecentTransactions = dynamic(() => import('@/components/shared/RecentTransactions'), { ssr: false, loading: () => <div>Cargando transacciones…</div> });

export default function BalancePage() {
  const { activePeriod, balance, privacyMode, householdId } = useSiKness();
  const [flowType, setFlowType] = useState<'all' | 'common' | 'direct'>('all');
  const [limit, setLimit] = useState(10);
  const [members, setMembers] = useState<Array<{ profile_id: string; email: string; role: string }>>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; type: string }>>([]);
  const [memberId, setMemberId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Helper para formatear moneda con modo privacidad
  const formatCurrency = (amount: number) => {
    if (privacyMode) return '•••••';
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const phase = activePeriod?.phase || 'preparing';
  const balanceDifference = (balance?.closing || 0) - (balance?.opening || 0);
  const isPositive = balanceDifference >= 0;
  const canCreateMovement = useMemo(
    () => phase === 'active' || phase === 'validation',
    [phase],
  );

  // Cargar opciones de filtros
  useEffect(() => {
    if (!householdId) return;
    (async () => {
      try {
        const [mRes, cRes] = await Promise.all([
          fetch(`/api/sickness/household/members?householdId=${householdId}`),
          fetch(`/api/sickness/household/categories?householdId=${householdId}`),
        ]);
        if (mRes.ok) {
          const data = await mRes.json();
          setMembers(data.members || []);
        }
        if (cRes.ok) {
          const data = await cRes.json();
          setCategories(data.categories || []);
        }
      } catch (e) {
        console.error('Error cargando filtros', e);
      }
    })();
  }, [householdId]);

  if (!activePeriod) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              No hay período activo
            </CardTitle>
            <CardDescription>
              Selecciona un período en el selector de la barra superior para ver los datos.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const periodName = `${MONTHS[activePeriod.month - 1]} ${activePeriod.year}`;

  // Determinar badge y mensaje de estado
  const getStatusInfo = () => {
    switch (phase) {
      case 'preparing':
        return {
          badge: { variant: 'secondary' as const, text: 'Configuración' },
          canDo: 'Configura los ingresos y gastos directos de cada miembro',
          helpText: 'Período en fase de configuración inicial',
        };
      case 'validation':
        return {
          badge: { variant: 'default' as const, text: 'Validación' },
          canDo: 'Puedes registrar gastos directos que reducirán las contribuciones individuales',
          helpText: 'Solo owners pueden abrir tras validar las contribuciones calculadas',
        };
      case 'active':
        return {
          badge: { variant: 'default' as const, text: 'Activo', className: 'bg-green-600' },
          canDo: 'Registra todos los gastos e ingresos del mes',
          helpText: 'Período abierto para operaciones normales',
        };
      case 'closing':
        return {
          badge: { variant: 'secondary' as const, text: 'Cerrando' },
          canDo: 'Período en proceso de cierre',
          helpText: 'Owner está validando antes del cierre final',
        };
      case 'closed':
        return {
          badge: { variant: 'destructive' as const, text: 'Cerrado' },
          canDo: 'No se permiten nuevos movimientos',
          helpText: 'Período cerrado y archivado',
        };
      default:
        return {
          badge: { variant: 'outline' as const, text: 'Desconocido' },
          canDo: '',
          helpText: '',
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header mejorado con contexto del periodo */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Calendar className="h-6 w-6 text-muted-foreground" />
            <div>
              <h1 className="text-2xl font-bold">{periodName}</h1>
              <p className="text-sm text-muted-foreground">Balance y Movimientos</p>
            </div>
          </div>
          <Badge {...statusInfo.badge} className={statusInfo.badge.className}>
            {statusInfo.badge.text}
          </Badge>
        </div>

        {/* Información contextual según estado */}
        {statusInfo.canDo && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Estado del período</AlertTitle>
            <AlertDescription>
              <p className="font-medium">{statusInfo.canDo}</p>
              <p className="text-xs text-muted-foreground mt-1">{statusInfo.helpText}</p>
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Mostrar contribuciones calculadas si el período está en validación o activo */}
      {(phase === 'validation' || phase === 'active') && householdId && (
        <ContributionsDisplay householdId={householdId} privacyMode={privacyMode} />
      )}

      {/* Grid de tarjetas principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

      {/* Segunda fila: Ingresos y Gastos */}
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

      {/* Filtros de transacciones */}
      <div className="flex flex-wrap gap-4 items-center mt-6">
        <label className="flex items-center gap-2">
          <span className="text-sm">Tipo de flujo:</span>
          <select
            className="border rounded px-2 py-1 text-sm"
            value={flowType}
            onChange={e => setFlowType(e.target.value as 'all' | 'common' | 'direct')}
          >
            <option value="all">Todos</option>
            <option value="common">Común</option>
            <option value="direct">Directo</option>
          </select>
        </label>
        <label className="flex items-center gap-2">
          <span className="text-sm">Miembro:</span>
          <select
            className="border rounded px-2 py-1 text-sm"
            value={memberId}
            onChange={e => setMemberId(e.target.value)}
          >
            <option value="">Todos</option>
            {members.map((m) => (
              <option key={m.profile_id} value={m.profile_id}>
                {m.email}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          <span className="text-sm">Categoría:</span>
          <select
            className="border rounded px-2 py-1 text-sm"
            value={categoryId}
            onChange={e => setCategoryId(e.target.value)}
          >
            <option value="">Todas</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          <span className="text-sm">Desde:</span>
          <input
            type="date"
            className="border rounded px-2 py-1 text-sm"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
          />
        </label>
        <label className="flex items-center gap-2">
          <span className="text-sm">Hasta:</span>
          <input
            type="date"
            className="border rounded px-2 py-1 text-sm"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
          />
        </label>
        <label className="flex items-center gap-2">
          <span className="text-sm">Cantidad:</span>
          <input
            type="number"
            min={1}
            max={50}
            value={limit}
            onChange={e => setLimit(Number(e.target.value))}
            className="border rounded px-2 py-1 w-16 text-sm"
          />
        </label>
        <div className="ml-auto flex items-center gap-2">
          <button
            className={`px-3 py-1.5 rounded text-sm font-medium border ${canCreateMovement ? 'bg-primary text-primary-foreground hover:opacity-90' : 'bg-muted text-muted-foreground cursor-not-allowed'}`}
            disabled={!canCreateMovement}
            title={status === 'closed' ? 'No se pueden crear movimientos con el período cerrado' : 'Crear nuevo movimiento'}
            onClick={() => {
              // TODO: Navegar al formulario de nuevo movimiento cuando esté listo
              alert('Nuevo movimiento (WIP)');
            }}
          >
            Nuevo movimiento
          </button>
        </div>
      </div>

      {/* Transacciones recientes */}
      <div className="mt-4">
        {householdId && activePeriod && (
          <RecentTransactions
            householdId={householdId}
            limit={limit}
            flowType={flowType}
            year={activePeriod.year}
            month={activePeriod.month}
            memberId={memberId || undefined}
            categoryId={categoryId || undefined}
            startDate={startDate || undefined}
            endDate={endDate || undefined}
          />
        )}
      </div>
    </div>
  );
}
