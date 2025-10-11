'use client';

import { createContext, useContext } from 'react';

interface HouseholdContextValue {
  householdId: string | null;
  isOwner: boolean;
  userId: string;
  userEmail: string;
}

const HouseholdContext = createContext<HouseholdContextValue | undefined>(undefined);

export function HouseholdProvider({
  children,
  value
}: {
  children: React.ReactNode;
  value: HouseholdContextValue;
}) {
  return (
    <HouseholdContext.Provider value={value}>
      {children}
    </HouseholdContext.Provider>
  );
}

export function useHousehold() {
  const context = useContext(HouseholdContext);
  if (!context) {
    throw new Error('useHousehold must be used within HouseholdProvider');
  }
  return context;
}
