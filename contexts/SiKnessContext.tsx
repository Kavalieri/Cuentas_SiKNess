'use client';

import { createContext, useContext, useEffect, useState } from 'react';

// ============================================
// TYPES
// ============================================

export type SiKnessPhase = 1 | 2 | 3 | 'closed';
export type SiKnessPeriodStatus = 'active' | 'locked' | 'closed';

export interface HouseholdOption {
  id: string;
  name: string;
  role: string;
  isOwner: boolean;
  memberCount: number;
  ownerCount: number;
}

export interface PeriodOption {
  id: string;
  year: number;
  month: number;
  status: string; // Estado general: 'open', 'pending_close', 'closed'
  phase: string; // Fase del workflow: 'preparing', 'validation', 'active', 'closing', 'closed'
  openingBalance: number;
  closingBalance: number;
  isCurrent: boolean;
}

export interface BalanceData {
  opening: number;
  closing: number;
  income: number;
  expenses: number;
  directExpenses: number;
  pendingContributions: number;
}

export interface SiKnessUser {
  id: string;
  email: string;
  displayName: string;
  isSystemAdmin: boolean;
}

export interface SiKnessContextValue {
  // Hogar
  householdId: string | null;
  households: HouseholdOption[];
  isOwner: boolean;

  // Período
  activePeriod: PeriodOption | null;
  periods: PeriodOption[];
  // Nuevo: periodo seleccionado como concepto único (año, mes)
  selectedPeriod: { year: number; month: number } | null;

  // Balance
  balance: BalanceData | null;

  // Usuario
  user: SiKnessUser | null;

  // Privacidad
  privacyMode: boolean;

  // Acciones
  selectHousehold: (id: string) => Promise<void>;
  selectPeriod: (
    year: number,
    month: number,
    onPeriodNotFound?: (year: number, month: number) => void,
  ) => Promise<void>;
  togglePrivacyMode: () => void;
  refreshBalance: () => Promise<void>;
  refreshPeriods: () => Promise<void>;
}

interface SiKnessProviderProps {
  children: React.ReactNode;
  initialData?: {
    householdId?: string;
    households?: HouseholdOption[];
    isOwner?: boolean;
    activePeriod?: PeriodOption;
    periods?: PeriodOption[];
    balance?: BalanceData;
    user?: SiKnessUser;
  };
}

// ============================================
// CONTEXT
// ============================================

const SiKnessContext = createContext<SiKnessContextValue | undefined>(undefined);

// ============================================
// PROVIDER
// ============================================

export function SiKnessProvider({ children, initialData }: SiKnessProviderProps) {
  // Estado del hogar
  const [householdId, setHouseholdId] = useState<string | null>(initialData?.householdId ?? null);
  const [households, setHouseholds] = useState<HouseholdOption[]>(initialData?.households ?? []);
  const [isOwner, setIsOwner] = useState<boolean>(initialData?.isOwner ?? false);

  // Estado del período
  const [activePeriod, setActivePeriod] = useState<PeriodOption | null>(
    initialData?.activePeriod ?? null,
  );
  const [periods, setPeriods] = useState<PeriodOption[]>(initialData?.periods ?? []);
  // Periodo seleccionado global (año/mes) — fuente de verdad de la UX
  const [selectedPeriod, setSelectedPeriod] = useState<{ year: number; month: number } | null>(
    initialData?.activePeriod ? { year: initialData.activePeriod.year, month: initialData.activePeriod.month } : null,
  );

  // Estado del balance
  const [balance, setBalance] = useState<BalanceData | null>(initialData?.balance ?? null);

  // Usuario
  const [user, setUser] = useState<SiKnessUser | null>(initialData?.user ?? null);

  // Privacidad
  const [privacyMode, setPrivacyMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('sickness-privacy-mode') === 'true';
  });

  // Loading state
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // ============================================
  // INICIALIZACIÓN
  // ============================================

  useEffect(() => {
    const initializeData = async () => {
      if (isLoading || households.length > 0) return; // Ya inicializado

      setIsLoading(true);
      try {
        const response = await fetch('/api/sickness/init');
        if (!response.ok) throw new Error('Failed to load initial data');

        const data = await response.json();

        // Nota: la redirección sin hogar activo se gestiona vía SSR en
        // app/sickness/(protected)/layout.tsx. Aquí no hacemos redirecciones
        // cliente para evitar posibles flashes o bucles.

        setUser(data.user);
        setHouseholds(data.households || []);
        setHouseholdId(data.activeHousehold?.id || null);
        setIsOwner(data.activeHousehold?.isOwner || false);
        setPeriods(data.periods || []);
        setActivePeriod(data.activePeriod || null);
        // Sincronizar selectedPeriod con localStorage por hogar
        const newHouseholdId: string | null = data.activeHousehold?.id || null;
        if (newHouseholdId) {
          const key = `csik-selected-period-${newHouseholdId}`;
          const saved = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
          const fromActive = data.activePeriod
            ? { year: data.activePeriod.year as number, month: data.activePeriod.month as number }
            : null;
          if (saved) {
            const [yStr, mStr] = saved.split('-');
            const y = Number(yStr);
            const m = Number(mStr);
            const isValid = Number.isInteger(y) && Number.isInteger(m) && y > 2000 && m >= 1 && m <= 12;
            const exists = (data.periods || []).some((p: PeriodOption) => p.year === y && p.month === m);
            if (isValid && exists) {
              setSelectedPeriod({ year: y, month: m });
              // Si difiere del periodo activo del servidor, aplicar selección
              if (!fromActive || fromActive.year !== y || fromActive.month !== m) {
                // No await para no bloquear la carga inicial
                selectPeriod(y, m);
              }
            } else {
              setSelectedPeriod(fromActive);
            }
          } else {
            setSelectedPeriod(fromActive);
          }
        } else {
          setSelectedPeriod(null);
        }
        setBalance(data.balance || null);

        console.log('[SiKnessContext] Initial data loaded successfully');
      } catch (error) {
        console.error('[SiKnessContext] Failed to load initial data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Solo al montar

  // Persistir modo privacidad en localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('sickness-privacy-mode', String(privacyMode));
  }, [privacyMode]);

  // ============================================
  // ACCIONES
  // ============================================

  const selectHousehold = async (id: string) => {
    const selectedHousehold = households.find((h) => h.id === id);
    if (!selectedHousehold) return;

    try {
      const response = await fetch('/api/sickness/household/set-active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ householdId: id }),
      });

      if (!response.ok) throw new Error('Failed to change household');

      const data = await response.json();

      setHouseholdId(id);
      setIsOwner(selectedHousehold.isOwner);
      setPeriods(data.periods || []);
      setActivePeriod(data.currentPeriod || null);

      // Establecer selectedPeriod desde localStorage si existe, si no, desde currentPeriod
      const key = `csik-selected-period-${id}`;
      const saved = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
      if (saved) {
        const [yStr, mStr] = saved.split('-');
        const y = Number(yStr);
        const m = Number(mStr);
        const isValid = Number.isInteger(y) && Number.isInteger(m) && y > 2000 && m >= 1 && m <= 12;
        const exists = (data.periods || []).some((p: PeriodOption) => p.year === y && p.month === m);
        if (isValid && exists) {
          setSelectedPeriod({ year: y, month: m });
          // Alinear periodo activo si difiere
          if (!data.currentPeriod || data.currentPeriod.year !== y || data.currentPeriod.month !== m) {
            await selectPeriod(y, m);
          }
        } else {
          setSelectedPeriod(data.currentPeriod ? { year: data.currentPeriod.year, month: data.currentPeriod.month } : null);
        }
      } else {
        setSelectedPeriod(data.currentPeriod ? { year: data.currentPeriod.year, month: data.currentPeriod.month } : null);
      }

      // Limpiar balance (se recargará al cambiar periodo)
      setBalance(null);

      console.log('[SiKnessContext] Household changed to:', id);
    } catch (error) {
      console.error('[SiKnessContext] Failed to change household:', error);
    }
  };

  const selectPeriod = async (
    year: number,
    month: number,
    onPeriodNotFound?: (year: number, month: number) => void,
  ) => {
    // Buscar período en la lista
    const selectedPeriod = periods.find((p) => p.year === year && p.month === month);

    if (!selectedPeriod) {
      console.debug('[SiKnessContext] Period not found:', year, month);
      console.debug('[SiKnessContext] onPeriodNotFound callback:', onPeriodNotFound ? 'EXISTS' : 'MISSING');

      // Limpiar estado inconsistente si el período seleccionado ya no existe
      setSelectedPeriod(null);
      setActivePeriod(null);
      setBalance(null);

      // Si hay callback, delegamos la decisión al componente
      if (onPeriodNotFound) {
        console.debug('[SiKnessContext] Calling onPeriodNotFound callback...');
        onPeriodNotFound(year, month);
        return;
      }

      // Si no hay callback, intentar seleccionar el período más reciente automáticamente
      if (periods.length > 0) {
        const latestPeriod = periods.sort((a, b) => {
          if (a.year !== b.year) return b.year - a.year;
          return b.month - a.month;
        })[0];

        if (latestPeriod) {
          console.log('[SiKnessContext] Auto-selecting latest period after failed selection:', latestPeriod.year, latestPeriod.month);
          await selectPeriod(latestPeriod.year, latestPeriod.month);
        }
      }
      return;
    }

    try {
      const response = await fetch('/api/sickness/period/set-active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodId: selectedPeriod.id }),
      });

      if (!response.ok) {
        // Si falla la API, puede ser que el período ya no exista en BD
        console.warn('[SiKnessContext] Period API failed, refreshing periods...');
        await refreshPeriods();
        throw new Error('Failed to change period');
      }

      const data = await response.json();

      setActivePeriod(data.period || selectedPeriod);
      setSelectedPeriod({ year, month });
      // Persistir selección por hogar
      if (householdId && typeof window !== 'undefined') {
        localStorage.setItem(`csik-selected-period-${householdId}`, `${year}-${month}`);
      }

      // Recargar balance del nuevo periodo
      await refreshBalance();

      console.log('[SiKnessContext] Period changed to:', year, month);
    } catch (error) {
      console.error('[SiKnessContext] Failed to change period:', error);
      // Limpiar estados inconsistentes en caso de error
      setSelectedPeriod(null);
      setActivePeriod(null);
      setBalance(null);
      throw error; // Re-lanzar para que el componente pueda manejarlo
    }
  };

  const togglePrivacyMode = () => {
    setPrivacyMode((prev) => !prev);
  };

  const refreshBalance = async () => {
    if (!householdId || !activePeriod) {
      console.warn('[SiKnessContext] Cannot refresh balance: missing household or period');
      setBalance(null); // Limpiar balance inconsistente
      return;
    }

    try {
      const response = await fetch('/api/sickness/balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          householdId,
          periodId: activePeriod.id,
        }),
      });

      if (!response.ok) {
        // Si el período no existe, limpiar estado
        if (response.status === 404) {
          console.warn('[SiKnessContext] Period not found in backend, clearing state');
          setActivePeriod(null);
          setSelectedPeriod(null);
          setBalance(null);
          // Refrescar períodos para obtener estado actualizado
          await refreshPeriods();
          return;
        }
        throw new Error('Failed to fetch balance');
      }

      const data = await response.json();
      setBalance(data.balance || null);

      console.log('[SiKnessContext] Balance refreshed successfully');
    } catch (error) {
      console.error('[SiKnessContext] Failed to refresh balance:', error);
      // No limpiar balance en errores de red, solo en errores de consistencia
    }
  };

  const refreshPeriods = async () => {
    if (!householdId) {
      console.warn('[SiKnessContext] Cannot refresh periods: missing household');
      return;
    }

    // Recargar datos completos del hogar (incluye periodos)
    try {
      const response = await fetch('/api/sickness/household/set-active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ householdId }),
      });

      if (!response.ok) throw new Error('Failed to refresh periods');

      const data = await response.json();
      setPeriods(data.periods || []);

      console.log('[SiKnessContext] Periods refreshed successfully');
    } catch (error) {
      console.error('[SiKnessContext] Failed to refresh periods:', error);
    }
  };

  // ============================================
  // CONTEXT VALUE
  // ============================================

  const value: SiKnessContextValue = {
    householdId,
    households,
    isOwner,
    activePeriod,
    periods,
    selectedPeriod,
    balance,
    user,
    privacyMode,
    selectHousehold,
    selectPeriod,
    togglePrivacyMode,
    refreshBalance,
    refreshPeriods,
  };

  return <SiKnessContext.Provider value={value}>{children}</SiKnessContext.Provider>;
}

// ============================================
// HOOK
// ============================================

export function useSiKness() {
  const context = useContext(SiKnessContext);
  if (context === undefined) {
    throw new Error('useSiKness must be used within a SiKnessProvider');
  }
  return context;
}
