export interface HouseholdContextUser {
  id: string;
  email: string;
  displayName?: string | null;
}

export interface ActivePeriodState {
  periodId: string | null;
  year: number | null;
  month: number | null;
  day?: number | null;
  phase?: string | null;
  status?: string | null;
}

export interface HouseholdOption {
  id: string;
  name: string;
  role: string;
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
  status: string;
  openingBalance: number;
  closingBalance: number;
  totalIncome: number;
  totalExpenses: number;
  createdAt: string;
  phase: string;
  isCurrentMonth: boolean;
  isPastMonth: boolean;
  isFutureMonth: boolean;
}

export interface BalanceData {
  balance: number;
  income: number;
  expenses: number;
}

export interface HouseholdContextState {
  householdId: string | null;
  isOwner: boolean;
  user: HouseholdContextUser;
  activePeriod: ActivePeriodState;
  // Nuevos campos para selectores globales
  households: HouseholdOption[];
  periods: PeriodOption[];
  balance: BalanceData | null;
}

export interface HouseholdContextValue {
  // Estado básico (legacy)
  householdId: string | null;
  isOwner: boolean;
  user: HouseholdContextUser;
  activePeriod: ActivePeriodState;

  // Estado global
  households: HouseholdOption[];
  periods: PeriodOption[];
  balance: BalanceData | null;

  // Funciones básicas (legacy)
  setHouseholdId: (householdId: string | null) => void;
  setIsOwner: (isOwner: boolean) => void;
  setActivePeriod: (period: ActivePeriodState) => void;
  clearActivePeriod: () => void;
  setUser: (user: HouseholdContextUser) => void;

  // Funciones globales
  setHouseholds: (households: HouseholdOption[]) => void;
  setPeriods: (periods: PeriodOption[]) => void;
  setBalance: (balance: BalanceData | null) => void;
  selectHousehold: (householdId: string) => void;
  selectMonth: (year: number, month: number) => void;
}

export interface HouseholdProviderInitialState {
  householdId: string | null;
  isOwner: boolean;
  user: HouseholdContextUser;
  activePeriod?: ActivePeriodState | null;
  households?: HouseholdOption[];
  periods?: PeriodOption[];
  balance?: BalanceData | null;
}
