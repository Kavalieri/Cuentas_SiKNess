
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSiKness } from '@/contexts/SiKnessContext';
import type { MonthlyPeriodPhase } from '@/lib/periods';
import { normalizePeriodPhase } from '@/lib/periods';
import {
    AlertCircle,
    ArrowDownCircle,
    ArrowUpCircle,
    TrendingDown,
    TrendingUp,
    Wallet
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
// Importar componentes de esta carpeta
import { DeleteDirectButton } from './DeleteDirectButton';
import { EditDirectExpenseButton } from './EditDirectExpenseButton';

// Eliminado ContributionsDisplay: la contribución no se muestra en balance
import { NewMovementForm } from './components';

interface Transaction {
  id: string;
  type: string;
  flow_type: string;
  amount: number;
  description?: string;
  occurred_at: string;
  category_id?: string;
  profile_id?: string;
  real_payer_id?: string;
  transaction_pair_id?: string;
  category_name?: string;
  category_icon?: string;
  profile_email?: string;
  real_payer_email?: string;
}

interface GlobalBalance {
  balance: {
    opening: number;
    closing: number;
    income: number;
    expenses: number;
    directExpenses: number;
    pendingContributions: number;
  };
}

interface PeriodSummary {
  opening_balance: number;
  closing_balance: number;
  total_income: number;
  total_expenses: number;
}

export default function BalancePage() {
  // Declarar primero los datos de contexto para que estén disponibles en todo el scope
  const { activePeriod, privacyMode, householdId, user, isOwner } = useSiKness();
  const [showNewMovement, setShowNewMovement] = useState(false);
  const [flowType, setFlowType] = useState<'all' | 'common' | 'direct'>('all');
  const [limit, setLimit] = useState(10);
  const [members, setMembers] = useState<Array<{ profile_id: string; email: string; role: string }>>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; icon?: string; type?: string }>>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [memberId, setMemberId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Estados para balance global y resumen del periodo
  const [globalBalance, setGlobalBalance] = useState<GlobalBalance | null>(null);
  const [periodSummary, setPeriodSummary] = useState<PeriodSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Cargar balance global
  const loadGlobalBalance = useCallback(async () => {
    if (!householdId) return;

    try {
      const response = await fetch(`/api/sickness/balance/global?householdId=${householdId}`);
      if (!response.ok) throw new Error('Error al cargar balance global');
      const data = await response.json();
      setGlobalBalance(data);
    } catch (error) {
      console.error('Error loading global balance:', error);
    }
  }, [householdId]);

  // Cargar resumen del periodo
  const loadPeriodSummary = useCallback(async () => {
    if (!householdId || !activePeriod?.id) return;

    try {
      const response = await fetch(
        `/api/sickness/balance/period-summary?householdId=${householdId}&periodId=${activePeriod.id}`
      );
      if (!response.ok) throw new Error('Error al cargar resumen del periodo');
      const data = await response.json();
      setPeriodSummary(data);
    } catch (error) {
      console.error('Error loading period summary:', error);
    }
  }, [householdId, activePeriod?.id]);

  // Cargar transacciones globales
  const loadTransactions = useCallback(async () => {
    if (!householdId) return;

    try {
      const params = new URLSearchParams({
        householdId,
        limit: limit.toString(),
      });

      if (flowType !== 'all') params.append('flowType', flowType);
      if (memberId) params.append('memberId', memberId);
      if (categoryId) params.append('categoryId', categoryId);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(`/api/sickness/transactions/global?${params}`);
      if (!response.ok) throw new Error('Error al cargar transacciones');
      const data = await response.json();
      setTransactions(data.transactions || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  }, [householdId, limit, flowType, memberId, categoryId, startDate, endDate]);

  // Cargar todos los datos
  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      await Promise.all([
        loadGlobalBalance(),
        loadPeriodSummary(),
        loadTransactions(),
      ]);
      setLoading(false);
    };
    loadAllData();
  }, [loadGlobalBalance, loadPeriodSummary, loadTransactions]);

  // Helper para formatear moneda con modo privacidad
  const formatCurrency = (amount: number) => {
    if (privacyMode) return '•••••';
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  // Normalizar phase desde activePeriod (puede venir como string legacy)
  const normalizedPhaseData = activePeriod?.phase
    ? normalizePeriodPhase(activePeriod.phase, activePeriod.status || null)
    : { phase: 'preparing' as MonthlyPeriodPhase, legacyStatus: 'active' };
  const phase: MonthlyPeriodPhase = normalizedPhaseData.phase === 'unknown' ? 'preparing' : normalizedPhaseData.phase;

  // Calcular diferencia de balance (para el periodo actual)
  const balanceDifference = (periodSummary?.closing_balance || 0) - (periodSummary?.opening_balance || 0);
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

  // Determinar periodo mostrado (UI): prioriza selectedPeriod; fallback a activePeriod; si no, fecha actual
  // const now = new Date();
  // const periodYear = selectedPeriod?.year ?? activePeriod?.year ?? now.getFullYear();
  // const periodMonth = selectedPeriod?.month ?? activePeriod?.month ?? now.getMonth() + 1;
  // const periodName = `${MONTHS[periodMonth - 1]} ${periodYear}`;

  // Buscar el periodo completo con id y phase para pasar al formulario (CRÍTICO BUG #2)
  // const selectedPeriodFull = useMemo(() => {
  //   if (!selectedPeriod) return activePeriod;
  //   return periods.find((p) => p.year === selectedPeriod.year && p.month === selectedPeriod.month) || activePeriod;
  // }, [selectedPeriod, periods, activePeriod]);

  // Determinar badge y mensaje de estado (ya no se usa en esta vista)
  // const statusInfo = getStatusInfo();

  return (

    <div className="container mx-auto p-4 space-y-6">
      {/* Header simplificado: solo título general */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Wallet className="h-6 w-6 text-primary" />
          Balance y Transacciones
        </h1>
        <p className="text-sm text-muted-foreground">Consulta el estado financiero y los movimientos del mes seleccionado.</p>
      </div>


      {/* Mostrar contribuciones calculadas siempre (se calculan en tiempo real) */}
    {/* Eliminado: la contribución no se muestra en balance */}

      {/* Grid de tarjetas principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
  {/* Balance actual - PROMINENTE */}
        <Card className="md:col-span-2 lg:col-span-2 border-2 border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wallet className="h-5 w-5 text-primary" />
              Balance actual
            </CardTitle>
            <CardDescription>Saldo disponible en cuenta común</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-4xl font-bold tracking-tight">
                {formatCurrency(globalBalance?.balance.closing || 0)}
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

  {/* Balance inicial */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ArrowUpCircle className="h-4 w-4 text-blue-500" />
              Balance inicial
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(periodSummary?.opening_balance || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">Apertura del período</p>
          </CardContent>
        </Card>

  {/* Balance final */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ArrowDownCircle className="h-4 w-4 text-purple-500" />
              Balance final
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(periodSummary?.closing_balance || 0)}</div>
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
              {formatCurrency(periodSummary?.total_income || 0)}
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Aportaciones</span>
                <span className="font-medium">{formatCurrency(periodSummary?.total_income || 0)}</span>
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
              {formatCurrency(periodSummary?.total_expenses || 0)}
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Gastos comunes</span>
                <span className="font-medium">{formatCurrency(periodSummary?.total_expenses || 0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tercera fila oculta temporalmente (Gastos directos y Contribuciones pendientes) */}
      {false && (
        <div className="grid gap-4 md:grid-cols-2">
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
                {formatCurrency(globalBalance?.balance.directExpenses || 0)}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Estos gastos se descontarán de las aportaciones individuales
              </p>
            </CardContent>
          </Card>

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
                {formatCurrency(globalBalance?.balance.pendingContributions || 0)}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Total esperado menos lo ya aportado al fondo común
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Resumen del período oculto temporalmente para simplificar la vista (parece redundante) */}
      {false && (
        <Card>
          <CardHeader>
            <CardTitle>Resumen del período</CardTitle>
            <CardDescription>Estado financiero consolidado</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="font-medium">Balance inicial</span>
                <span className="text-lg">{formatCurrency(periodSummary?.opening_balance || 0)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b text-green-600">
                <span className="font-medium">+ Ingresos</span>
                <span className="text-lg">{formatCurrency(periodSummary?.total_income || 0)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b text-red-600">
                <span className="font-medium">- Gastos</span>
                <span className="text-lg">{formatCurrency(periodSummary?.total_expenses || 0)}</span>
              </div>
              <div className="flex justify-between items-center py-3 bg-primary/5 px-3 rounded-lg">
                <span className="font-bold text-lg">Balance del período</span>
                <span className="text-2xl font-bold">{formatCurrency(periodSummary?.closing_balance || 0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
            title={phase === 'closed' ? 'No se pueden crear movimientos con el período cerrado' : 'Crear nuevo movimiento'}
            onClick={() => setShowNewMovement(true)}
          >
            Nuevo movimiento
          </button>
        </div>

        {/* Modal para nuevo movimiento */}
        <NewMovementForm
          open={showNewMovement}
          onClose={() => setShowNewMovement(false)}
          members={members}
          categories={categories.map((c) => ({
            id: c.id,
            name: c.name,
            icon: c.icon,
            type: c.type ?? ''
          }))}
          phase={phase}
          user={user}
          isOwner={isOwner}
          periodId={activePeriod?.id}
          onSuccess={async () => {
            await loadTransactions();
            await loadGlobalBalance();
            await loadPeriodSummary();
          }}
        />
      </div>

      {/* Transacciones globales */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Últimos Movimientos
          </CardTitle>
          <CardDescription>
            Mostrando {transactions.length} transacciones globales (sin filtro de período)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando transacciones...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron transacciones con los filtros aplicados
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{tx.description || 'Sin descripción'}</span>
                      {tx.flow_type === 'direct' && (
                        <span className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 px-2 py-0.5 rounded">
                          Directo
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                      <span>
                        {new Date(tx.occurred_at).toLocaleDateString('es-ES', {
                          day: '2-digit', month: '2-digit', year: 'numeric'
                        })}
                        {' '}
                        <span className="ml-1 text-[11px] text-muted-foreground">
                          {new Date(tx.occurred_at).toLocaleTimeString('es-ES', {
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                      </span>
                      {tx.category_name && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            {tx.category_icon && <span>{tx.category_icon}</span>}
                            {tx.category_name}
                          </span>
                        </>
                      )}
                      {tx.profile_email && (
                        <>
                          <span>•</span>
                          <span>{tx.profile_email}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0 ml-4 flex items-center gap-2">
                    <span
                      className={`text-lg font-semibold ${
                        (tx.type === 'income' || tx.type === 'income_direct') ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {(tx.type === 'income' || tx.type === 'income_direct') ? '+' : '-'}
                      {formatCurrency(tx.amount)}
                    </span>
                    {/* Botones editar/eliminar solo para owner y gastos directos */}
                    {isOwner && tx.flow_type === 'direct' && (
                      <div className="flex gap-1">
                        {/* Botón editar */}
                        <EditDirectExpenseButton
                          tx={tx}
                          householdId={householdId || undefined}
                          onSuccess={async () => {
                            await loadTransactions();
                            await loadGlobalBalance();
                            await loadPeriodSummary();
                          }}
                          categories={categories.map((c) => ({
                            id: c.id,
                            name: c.name,
                            icon: c.icon,
                            type: c.type ?? ''
                          }))}
                        />
                        {/* Botón eliminar (Server Action) */}
                        <DeleteDirectButton
                          txId={tx.id}
                          householdId={householdId || ''}
                          onDone={async () => {
                            await loadTransactions();
                            await loadGlobalBalance();
                            await loadPeriodSummary();
                          }}
                        />
                      </div>
                    )}



                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transacciones recientes */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Wallet className="h-6 w-6 text-primary" />
          Balance y Transacciones
        </h1>
      </div>
    </div>
  );
}
