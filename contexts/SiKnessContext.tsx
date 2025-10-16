'use client';

import { createContext, useContext, useState } from 'react';

// ============================================
// TYPES
// ============================================

export type SiKnessPhase = 1 | 2 | 3 | 'closed';
export type SiKnessPeriodStatus = 'active' | 'locked' | 'closed';

export interface HouseholdOption {
  id: string;
  name: string;
  isOwner: boolean;
  memberCount: number;
  ownerCount: number;
  createdAt: string;
  isActive: boolean;
}

export interface PeriodOption {
  id: string;
  year: number;
  month: number;
  day: number;
  phase: SiKnessPhase;
  status: SiKnessPeriodStatus;
  openingBalance: number;
  closingBalance: number;
  totalIncome: number;
  totalExpenses: number;
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

  // Balance
  balance: BalanceData | null;

  // Usuario
  user: SiKnessUser | null;

  // Privacidad
  privacyMode: boolean;

  // Acciones
  selectHousehold: (id: string) => Promise<void>;
  selectPeriod: (year: number, month: number) => Promise<void>;
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
  const [householdId, setHouseholdId] = useState<string | null>(
    initialData?.householdId ?? null
  );
  const [households, _setHouseholds] = useState<HouseholdOption[]>(
    initialData?.households ?? []
  );
  const [isOwner, setIsOwner] = useState<boolean>(initialData?.isOwner ?? false);

  // Estado del período
  const [activePeriod, setActivePeriod] = useState<PeriodOption | null>(
    initialData?.activePeriod ?? null
  );
  const [periods, _setPeriods] = useState<PeriodOption[]>(initialData?.periods ?? []);

  // Estado del balance
  const [balance, setBalance] = useState<BalanceData | null>(initialData?.balance ?? null);

  // Usuario
  const [user] = useState<SiKnessUser | null>(initialData?.user ?? null);

  // Privacidad
  const [privacyMode, setPrivacyMode] = useState<boolean>(false);

  // ============================================
  // ACCIONES
  // ============================================

  const selectHousehold = async (id: string) => {
    const selectedHousehold = households.find((h) => h.id === id);
    if (!selectedHousehold) return;

    setHouseholdId(id);
    setIsOwner(selectedHousehold.isOwner);

    // Limpiar período y balance al cambiar de hogar
    setActivePeriod(null);
    setBalance(null);

    // TODO: Aquí llamaremos a la server action para cambiar hogar activo
    console.log('[SiKnessContext] Household changed to:', id);
  };

  const selectPeriod = async (year: number, month: number) => {
    // Buscar período en la lista
    const selectedPeriod = periods.find((p) => p.year === year && p.month === month);

    if (selectedPeriod) {
      setActivePeriod(selectedPeriod);
    }

    // TODO: Aquí llamaremos a la server action para cargar datos del período
    console.log('[SiKnessContext] Period changed to:', year, month);
  };

  const togglePrivacyMode = () => {
    setPrivacyMode((prev) => !prev);
  };

  const refreshBalance = async () => {
    if (!householdId || !activePeriod) return;

    // TODO: Llamar server action para obtener balance actualizado
    console.log('[SiKnessContext] Refreshing balance...');
  };

  const refreshPeriods = async () => {
    if (!householdId) return;

    // TODO: Llamar server action para obtener períodos actualizados
    console.log('[SiKnessContext] Refreshing periods...');
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
