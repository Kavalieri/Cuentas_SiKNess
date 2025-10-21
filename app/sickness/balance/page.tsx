
"use client";

import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { DeleteCommonButton } from './DeleteCommonButton';
import { DeleteDirectButton } from './DeleteDirectButton';
import { EditCommonMovementButton } from './EditCommonMovementButton';
import { EditDirectExpenseButton } from './EditDirectExpenseButton';

// Eliminado ContributionsDisplay: la contribución no se muestra en balance
import { NewMovementForm } from './components';
import { BalanceFilters } from './components/BalanceFilters';

interface Transaction {
  id: string;
  type: string;
  flow_type: string;
  amount: number;
  description?: string;
  occurred_at: string;
  performed_at?: string | null;
  category_id?: string;
  profile_id?: string;
  real_payer_id?: string;
  transaction_pair_id?: string;
  paid_by?: string | null;
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
  const { activePeriod, selectedPeriod, periods, privacyMode, householdId, user, isOwner } = useSiKness();
  const [showNewMovement, setShowNewMovement] = useState(false);
  const [showPhaseAlert, setShowPhaseAlert] = useState(false);

  // Filtros unificados en un solo objeto
  const [filters, setFilters] = useState({
    member: '',
    category: '',
    type: '',
    search: ''
  });

  const [members, setMembers] = useState<Array<{ profile_id: string; email: string; role: string }>>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; icon?: string; type?: string }>>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Estados para balance global y resumen del periodo
  const [globalBalance, setGlobalBalance] = useState<GlobalBalance | null>(null);
  const [periodSummary, setPeriodSummary] = useState<PeriodSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Estados para paginación
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Determinar periodo seleccionado completo (con phase, id, etc)
  // Prioriza el periodo elegido por el usuario y, si no hay, usa el activo
  const selectedPeriodFull = useMemo(() => {
    if (!selectedPeriod) return activePeriod;
    return periods.find((p) => p.year === selectedPeriod.year && p.month === selectedPeriod.month) || activePeriod;
  }, [selectedPeriod, periods, activePeriod]);

  // Calcular paginación
  const paginatedTransactions = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    return transactions.slice(startIdx, endIdx);
  }, [transactions, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(transactions.length / itemsPerPage);

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

  // Cargar resumen del periodo (usar SIEMPRE el periodo seleccionado/activo actual)
  const loadPeriodSummary = useCallback(async () => {
    if (!householdId || !selectedPeriodFull?.id) return;

    try {
      const response = await fetch(
        `/api/sickness/balance/period-summary?householdId=${householdId}&periodId=${selectedPeriodFull.id}`
      );
      if (!response.ok) throw new Error('Error al cargar resumen del periodo');
      const data = await response.json();
      setPeriodSummary(data);
    } catch (error) {
      console.error('Error loading period summary:', error);
    }
  }, [householdId, selectedPeriodFull?.id]);

  // Cargar transacciones globales
  const loadTransactions = useCallback(async () => {
    if (!householdId) return;

    try {
      const params = new URLSearchParams({
        householdId,
        // NO limitar - traer TODAS para paginar en frontend
      });

      if (filters.type) params.append('flowType', filters.type);
      if (filters.member) params.append('memberId', filters.member);
      if (filters.category) params.append('categoryId', filters.category);
      // startDate y endDate no están en el objeto filters todavía, los podemos ignorar por ahora

      const response = await fetch(`/api/sickness/transactions/global?${params}`);
      if (!response.ok) throw new Error('Error al cargar transacciones');
      const data = await response.json();
      setTransactions(data.transactions || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  }, [householdId, filters]);

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

  // selectedPeriodFull ya definido más arriba

  // Usar solo phase del periodo seleccionado
  const rawPhase = selectedPeriodFull?.phase ? normalizePeriodPhase(selectedPeriodFull.phase) : 'preparing';
  const phase: MonthlyPeriodPhase = rawPhase === 'unknown' ? 'preparing' : rawPhase;

  // DEBUG: Ver qué fase tenemos y qué periodo está seleccionado
  useEffect(() => {
    console.log('🔍 DEBUG Balance Page:', {
      selectedPeriod,
      selectedPeriodFull,
      rawPhase,
      phase,
      canCreateMovement: phase === 'active' || phase === 'validation' || phase === 'closing'
    });
  }, [selectedPeriod, selectedPeriodFull, rawPhase, phase]);

  // Calcular diferencia de balance (para el periodo actual)
  const balanceDifference = (periodSummary?.closing_balance || 0) - (periodSummary?.opening_balance || 0);
  const isPositive = balanceDifference >= 0;
  const canCreateMovement = useMemo(
    () => phase === 'active' || phase === 'validation' || phase === 'closing',
    [phase],
  );

  // Handler para intentar crear nuevo movimiento
  const handleNewMovementClick = useCallback(() => {
    console.log('🔘 Click en Nuevo movimiento:', { selectedPeriod, selectedPeriodFull, phase, canCreateMovement });
    if (!canCreateMovement) {
      setShowPhaseAlert(true);
      return;
    }
    setShowNewMovement(true);
  }, [canCreateMovement, phase, selectedPeriod, selectedPeriodFull]);

  // Cuando cambian los filtros, resetear a página 1
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

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
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="h-6 w-6 text-primary" />
            Balance y Transacciones
          </h1>
          <p className="text-sm text-muted-foreground">Consulta el estado financiero y los movimientos del mes seleccionado.</p>
        </div>
        {canCreateMovement && (
          <button
            onClick={handleNewMovementClick}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium text-sm whitespace-nowrap"
          >
            ✚ Nuevo movimiento
          </button>
        )}
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
      <BalanceFilters
        filters={filters}
        members={members}
        categories={categories}
        onChange={(partial) => setFilters((prev) => ({ ...prev, ...partial }))}
      />

      {/* Alerta de fase bloqueada */}
      {showPhaseAlert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-lg max-w-md w-full p-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {phase === 'preparing'
                  ? 'No se pueden crear movimientos mientras el período está en configuración inicial. Espera a que se active el período.'
                  : phase === 'closed'
                  ? 'No se pueden crear movimientos en un período cerrado. Los movimientos deben registrarse en el período activo.'
                  : 'No se pueden crear movimientos en este momento.'}
              </AlertDescription>
            </Alert>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowPhaseAlert(false)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

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
        periodId={selectedPeriodFull?.id}
        onSuccess={async () => {
          await loadTransactions();
          await loadGlobalBalance();
          await loadPeriodSummary();
        }}
      />

      {/* Transacciones globales */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Últimos Movimientos
              </CardTitle>
              <CardDescription>
                Mostrando {paginatedTransactions.length} de {transactions.length} transacciones globales
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">Items por página:</label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 border rounded text-sm bg-background"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando transacciones...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron transacciones con los filtros aplicados
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {paginatedTransactions.map((tx) => (
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
                          {(() => {
                            const src = tx.performed_at || tx.occurred_at;
                            const d = new Date(src as string);
                            return (
                              <>
                                {d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                {tx.performed_at && (
                                  <span className="ml-1 text-[11px] text-muted-foreground">
                                    {d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                )}
                              </>
                            );
                          })()}
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
                      {/* Botones editar/eliminar para owner */}
                      {(isOwner || tx.profile_id === user?.id) && tx.flow_type === 'direct' && (
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
                          {/* Botón eliminar (solo owner) */}
                          {isOwner && (
                            <DeleteDirectButton
                              txId={tx.id}
                              householdId={householdId || ''}
                              onDone={async () => {
                                await loadTransactions();
                                await loadGlobalBalance();
                                await loadPeriodSummary();
                              }}
                            />
                          )}
                        </div>
                      )}

                      {(isOwner || tx.profile_id === user?.id) && tx.flow_type === 'common' && (
                        <div className="flex gap-1">
                          <EditCommonMovementButton
                            tx={tx}
                            householdId={householdId || undefined}
                            onSuccess={async () => {
                              await loadTransactions();
                              await loadGlobalBalance();
                              await loadPeriodSummary();
                            }}
                            categories={categories.map((c) => ({ id: c.id, name: c.name }))}
                            members={members.map((m) => ({ profile_id: m.profile_id, email: m.email }))}
                          />
                          {isOwner && (
                            <DeleteCommonButton
                              txId={tx.id}
                              householdId={householdId || ''}
                              onDone={async () => {
                                await loadTransactions();
                                await loadGlobalBalance();
                                await loadPeriodSummary();
                              }}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Controles de paginación */}
              <div className="mt-6 flex items-center justify-between border-t pt-4">
                <div className="text-sm text-muted-foreground">
                  Página {currentPage} de {totalPages}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent"
                  >
                    ← Anterior
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent"
                  >
                    Siguiente →
                  </button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Título duplicado eliminado */}
    </div>
  );
}
