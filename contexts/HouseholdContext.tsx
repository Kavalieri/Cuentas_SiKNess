'use client';

import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import type {
  ActivePeriodState,
  BalanceData,
  HouseholdContextUser,
  HouseholdContextValue,
  HouseholdOption,
  HouseholdProviderInitialState,
  PeriodOption,
} from '@/types/household';

const createEmptyActivePeriod = (): ActivePeriodState => ({
  periodId: null,
  year: null,
  month: null,
  day: null,
  phase: null,
  status: null,
});

const HouseholdContext = createContext<HouseholdContextValue | undefined>(undefined);

export function HouseholdProvider({
  children,
  initialState,
}: {
  children: ReactNode;
  initialState: HouseholdProviderInitialState;
}) {
  // Estado básico existente
  const [householdIdState, setHouseholdIdState] = useState<string | null>(initialState.householdId);
  const [isOwnerState, setIsOwnerState] = useState<boolean>(initialState.isOwner);
  const [activePeriodState, setActivePeriodState] = useState<ActivePeriodState>(
    initialState.activePeriod ?? createEmptyActivePeriod(),
  );
  const [userState, setUserState] = useState<HouseholdContextUser>(initialState.user);

  // Nuevo estado para selectores globales
  const [householdsState, setHouseholdsState] = useState<HouseholdOption[]>(
    initialState.households ?? [],
  );
  const [periodsState, setPeriodsState] = useState<PeriodOption[]>(initialState.periods ?? []);
  const [balanceState, setBalanceState] = useState<BalanceData | null>(
    initialState.balance ?? null,
  );

  // Funciones básicas existentes
  const setHouseholdId = useCallback((next: string | null) => {
    setHouseholdIdState(next);
  }, []);

  const setIsOwner = useCallback((next: boolean) => {
    setIsOwnerState(next);
  }, []);

  const setActivePeriod = useCallback((next: ActivePeriodState | null) => {
    setActivePeriodState(next ?? createEmptyActivePeriod());
  }, []);

  const clearActivePeriod = useCallback(() => {
    setActivePeriodState(createEmptyActivePeriod());
  }, []);

  const setUser = useCallback((next: HouseholdContextUser) => {
    setUserState(next);
  }, []);

  // Nuevas funciones para gestión global
  const setHouseholds = useCallback((households: HouseholdOption[]) => {
    setHouseholdsState(households);
  }, []);

  const setPeriods = useCallback((periods: PeriodOption[]) => {
    setPeriodsState(periods);
  }, []);

  const setBalance = useCallback((balance: BalanceData | null) => {
    setBalanceState(balance);
  }, []);

  // Funciones de selección inteligente
  const selectHousehold = useCallback(
    (householdId: string) => {
      const selectedHousehold = householdsState.find((h) => h.id === householdId);
      if (selectedHousehold) {
        setHouseholdIdState(householdId);
        setIsOwnerState(selectedHousehold.isOwner);
        // Limpiar período activo al cambiar de hogar
        setActivePeriodState(createEmptyActivePeriod());
        // Aquí podríamos recargar períodos y balance para el nuevo hogar
        // Por ahora mantenemos vacío hasta que se implemente la recarga
        setPeriodsState([]);
        setBalanceState(null);
      }
    },
    [householdsState],
  );

  const selectMonth = useCallback(
    (year: number, month: number) => {
      const selectedPeriod = periodsState.find((p) => p.year === year && p.month === month);
      if (selectedPeriod) {
        setActivePeriodState({
          periodId: selectedPeriod.id,
          year: selectedPeriod.year,
          month: selectedPeriod.month,
          status: selectedPeriod.status,
          phase: null, // Se determinará según el estado del período
        });
      } else {
        // Si no existe período para ese mes, crear uno vacío
        setActivePeriodState({
          periodId: null,
          year,
          month,
          status: null,
          phase: null,
        });
      }
    },
    [periodsState],
  );

  const value = useMemo<HouseholdContextValue>(
    () => ({
      // Estado básico
      householdId: householdIdState,
      isOwner: isOwnerState,
      user: userState,
      activePeriod: activePeriodState,
      // Nuevo estado global
      households: householdsState,
      periods: periodsState,
      balance: balanceState,
      // Funciones básicas
      setHouseholdId,
      setIsOwner,
      setActivePeriod,
      clearActivePeriod,
      setUser,
      // Nuevas funciones globales
      setHouseholds,
      setPeriods,
      setBalance,
      selectHousehold,
      selectMonth,
    }),
    [
      householdIdState,
      isOwnerState,
      userState,
      activePeriodState,
      householdsState,
      periodsState,
      balanceState,
      setHouseholdId,
      setIsOwner,
      setActivePeriod,
      clearActivePeriod,
      setUser,
      setHouseholds,
      setPeriods,
      setBalance,
      selectHousehold,
      selectMonth,
    ],
  );

  return <HouseholdContext.Provider value={value}>{children}</HouseholdContext.Provider>;
}

export function useHousehold() {
  const context = useContext(HouseholdContext);
  if (!context) {
    throw new Error('useHousehold must be used within HouseholdProvider');
  }
  return context;
}

export function useActivePeriod() {
  const context = useHousehold();
  return {
    activePeriod: context.activePeriod,
    setActivePeriod: context.setActivePeriod,
    clearActivePeriod: context.clearActivePeriod,
  };
}

// Nuevos hooks para funcionalidad global
export function useGlobalSelectors() {
  const context = useHousehold();
  return {
    households: context.households,
    periods: context.periods,
    balance: context.balance,
    selectHousehold: context.selectHousehold,
    selectMonth: context.selectMonth,
    setHouseholds: context.setHouseholds,
    setPeriods: context.setPeriods,
    setBalance: context.setBalance,
  };
}
